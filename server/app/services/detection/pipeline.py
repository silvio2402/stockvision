import logging
import time
import uuid
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from PIL import Image

from ...models.detection import DetectionProduct, DetectionResult, UnknownItem
from ...models.product import ProductData
from ...websocket import ws_manager
from ..data.repository import ProductRepository
from .gemini import (
    MatchedProduct,
    PreviousProduct,
    PreviousUnknown,
    ProductAreasResponse,
    detect_barcodes,
    detect_product_areas,
    evaluate_stock_level,
)
from .image import crop_bbox, decode_barcode

logger = logging.getLogger(__name__)


def _generate_unknown_id() -> str:
    return f"UNK-{uuid.uuid4().hex[:8]}"


async def _load_previous_detection(
    db: AsyncIOMotorDatabase,
) -> tuple[list[PreviousProduct], list[PreviousUnknown]]:
    doc = await db.detections.find_one(sort=[("created_at", -1)])
    if not doc:
        return [], []

    previous_products = []
    for p in doc.get("products", []):
        try:
            previous_products.append(
                PreviousProduct(
                    item_code=p["item_code"],
                    name=p.get("name", ""),
                    bounding_box=p["product_area_bounding_box"],
                )
            )
        except (KeyError, ValueError):
            continue

    previous_unknowns = []
    for u in doc.get("unknown_items", []):
        assigned_id = u.get("assigned_id", "")
        if not assigned_id:
            continue
        try:
            previous_unknowns.append(
                PreviousUnknown(
                    assigned_id=assigned_id,
                    generated_name=u.get("generated_name", ""),
                    bounding_box=u["bounding_box"],
                )
            )
        except (KeyError, ValueError):
            continue

    return previous_products, previous_unknowns


async def run_detection_pipeline(
    image_path: str,
    camera_id: str = "camera-1",
    *,
    repo: ProductRepository,
    db: AsyncIOMotorDatabase,
) -> str:
    start_time = time.time()

    await ws_manager.broadcast("scan_started", {"camera_id": camera_id})

    try:
        with open(image_path, "rb") as f:
            image_data = f.read()
        image = Image.open(image_path)
    except (FileNotFoundError, OSError) as e:
        logger.error(f"Failed to read image {image_path}: {e}")
        await ws_manager.broadcast(
            "scan_error",
            {"camera_id": camera_id, "error": f"Image read failed: {e}"},
        )
        raise

    # Step 0: Load previous detection for correlation
    prev_products, prev_unknowns = await _load_previous_detection(db)

    # Step 1: Detect barcode bounding boxes
    try:
        barcodes = await detect_barcodes(image_data)
    except Exception as e:
        logger.error(f"Barcode detection failed: {e}")
        await ws_manager.broadcast(
            "scan_error",
            {"camera_id": camera_id, "error": "Barcode detection failed"},
        )
        raise

    # Step 2: Decode barcodes and resolve products from sources
    matched_products: list[MatchedProduct] = []
    for barcode in barcodes:
        item_code = decode_barcode(barcode.bounding_box, image)
        if not item_code:
            continue

        product = await repo.resolve_product(item_code)
        if not product:
            product = ProductData(
                item_code=item_code,
                barcode_value=item_code,
                name=f"Product {item_code}",
                data_source="manual",
                needs_review=True,
                current_status="unconfigured",
            )
            await repo.upsert_product(product)

        matched_products.append(
            MatchedProduct(
                item_code=item_code,
                name=product.name,
                description=product.description,
                barcode_bbox=barcode.bounding_box,
            )
        )

    # Step 3: Detect product areas with previous detection context
    if matched_products:
        try:
            areas = await detect_product_areas(
                image_data,
                matched_products,
                previous_products=prev_products,
                previous_unknowns=prev_unknowns,
            )
        except Exception as e:
            logger.error(f"Product area detection failed: {e}")
            areas = ProductAreasResponse(product_areas=[], unknown_areas=[])
    else:
        areas = ProductAreasResponse(product_areas=[], unknown_areas=[])

    product_area_map = {
        pa.item_code: pa.bounding_box for pa in areas.product_areas
    }

    # Step 4: Evaluate stock levels for configured products
    detection_products: list[DetectionProduct] = []
    unknown_items: list[UnknownItem] = []

    for matched in matched_products:
        product = await repo.get_product(matched.item_code) or ProductData(
            item_code=matched.item_code,
            barcode_value=matched.item_code,
            name=matched.name,
            description=matched.description,
        )

        area_bbox = product_area_map.get(matched.item_code, matched.barcode_bbox)

        if product.is_configured:
            try:
                crop_data = crop_bbox(image, area_bbox)
                evaluation = await evaluate_stock_level(
                    image_data=crop_data,
                    name=product.name,
                    description=product.description,
                    running_out_condition=product.running_out_condition,
                )
                status = "running_out" if evaluation.is_running_out else "in_stock"
                reasoning = evaluation.reasoning
            except Exception as e:
                logger.error(
                    f"Stock evaluation failed for {matched.item_code}: {e}"
                )
                status = "in_stock"
                reasoning = f"Stock evaluation failed: {e}"
        else:
            status = "unconfigured"
            reasoning = "Product not yet configured for stock monitoring"

        detection_products.append(
            DetectionProduct(
                item_code=matched.item_code,
                name=product.name,
                barcode_bounding_box=matched.barcode_bbox,
                product_area_bounding_box=area_bbox,
                status=status,
                ai_reasoning=reasoning,
                running_out_condition=product.running_out_condition or "",
            )
        )

        await db.products.update_one(
            {"item_code": matched.item_code},
            {
                "$set": {
                    "current_status": status,
                    "last_detected_at": datetime.utcnow(),
                    "last_bounding_box": area_bbox.model_dump(),
                    "last_ai_reasoning": reasoning,
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

    # Step 5: Process unknown areas with stable IDs and correlation
    prev_unknown_map = {u.assigned_id: u for u in prev_unknowns}
    current_unknown_ids: set[str] = set()

    for unknown in areas.unknown_areas:
        matched_id = unknown.matched_previous_id
        if matched_id and matched_id in prev_unknown_map:
            assigned_id = matched_id
        else:
            assigned_id = _generate_unknown_id()

        current_unknown_ids.add(assigned_id)
        name = unknown.generated_name or f"Unknown: {unknown.description[:40]}"

        unknown_items.append(
            UnknownItem(
                bounding_box=unknown.bounding_box,
                description=unknown.description,
                assigned_id=assigned_id,
                generated_name=name,
            )
        )

        await db.products.update_one(
            {"item_code": assigned_id},
            {
                "$set": {
                    "name": name,
                    "generated_name": name,
                    "description": unknown.description,
                    "barcode_value": None,
                    "data_source": "unknown",
                    "current_status": "unknown",
                    "needs_review": True,
                    "last_bounding_box": unknown.bounding_box.model_dump(),
                    "last_detected_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                },
                "$setOnInsert": {
                    "item_code": assigned_id,
                    "created_at": datetime.utcnow(),
                },
            },
            upsert=True,
        )

    # Step 6: Remove disappeared unknowns
    previous_unknown_ids = {u.assigned_id for u in prev_unknowns}
    disappeared_ids = previous_unknown_ids - current_unknown_ids
    if disappeared_ids:
        removed = await repo.delete_products(list(disappeared_ids))
        if removed:
            logger.info(
                f"Removed {removed} disappeared unknown product(s): {disappeared_ids}"
            )

    # Step 7: Save detection result
    processing_time = (time.time() - start_time) * 1000

    result = DetectionResult(
        camera_id=camera_id,
        image_path=image_path.split("/")[-1],
        products=detection_products,
        unknown_items=unknown_items,
        processing_time_ms=processing_time,
    )

    result_doc = result.model_dump()
    insert_result = await db.detections.insert_one(result_doc)
    detection_id = str(insert_result.inserted_id)

    await ws_manager.broadcast(
        "scan_completed",
        {
            "detection_id": detection_id,
            "summary": {
                "total": len(matched_products),
                "running_out": sum(
                    1 for p in detection_products if p.status == "running_out"
                ),
                "unknown": len(unknown_items),
            },
        },
    )

    try:
        from ..ordering.service import check_and_create_orders

        await check_and_create_orders(db)
    except Exception as e:
        logger.error(f"Post-scan order check failed: {e}")

    return detection_id


async def run_scan(camera_id: str = "camera-1"):
    await ws_manager.broadcast("scan_started", {"camera_id": camera_id})
    return {"message": "Scan triggered", "camera_id": camera_id}
