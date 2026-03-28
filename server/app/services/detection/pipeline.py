import logging
import time
from datetime import datetime

from PIL import Image

from ...dependencies import get_db
from ...models.detection import DetectionProduct, DetectionResult, UnknownItem, ScanJob
from ...models.product import ProductData
from ...websocket import ws_manager
from .gemini import (
    MatchedProduct,
    ProductAreasResponse,
    detect_barcodes,
    detect_product_areas,
    evaluate_stock_level,
)
from .image import crop_bbox, decode_barcode

logger = logging.getLogger(__name__)


async def _fail_job(db, job_id, error_message: str):
    await db.pipeline_jobs.update_one(
        {"_id": job_id},
        {"$set": {
            "status": "failed",
            "completed_at": datetime.utcnow(),
            "error_message": error_message
        }}
    )
    await ws_manager.broadcast("job_status_update", {"job_id": str(job_id), "status": "failed", "error": error_message})


async def run_detection_pipeline(image_path: str, camera_id: str = "camera-1") -> str:
    start_time = time.time()

    await ws_manager.broadcast("scan_started", {"camera_id": camera_id})

    db = await get_db()
    
    # Initialize a ScanJob to track pipeline state
    job = ScanJob(
        camera_id=camera_id,
        status="running",
        started_at=datetime.utcnow()
    )
    job_result = await db.pipeline_jobs.insert_one(job.model_dump())
    job_id = job_result.inserted_id

    from ...main import app
    if not hasattr(app.state, "product_repo") or not app.state.product_repo:
        error_msg = "Product repository not initialized. Please check server startup."
        await _fail_job(db, job_id, error_msg)
        raise RuntimeError(error_msg)
    repo = app.state.product_repo

    try:
        try:
            with open(image_path, "rb") as f:
                image_data = f.read()
            image = Image.open(image_path)
        except (FileNotFoundError, OSError) as e:
            logger.error(f"Failed to read image {image_path}: {e}")
            await ws_manager.broadcast("scan_error", {"camera_id": camera_id, "error": f"Image read failed: {e}"})
            raise

        try:
            barcodes = await detect_barcodes(image_data)
            if not barcodes:
                logger.info("No barcodes detected or Gemini API limit reached.")
                # We don't raise here, we just proceed with an empty list
                # The result will be saved with 0 detected products
        except Exception as e:
            logger.error(f"Barcode detection failed: {e}")
            await ws_manager.broadcast("scan_error", {"camera_id": camera_id, "error": "Barcode detection failed"})
            raise

        matched_products: list[MatchedProduct] = []
        for barcode in barcodes:
            item_code = decode_barcode(barcode.bounding_box, image)
            if not item_code:
                continue

            product = await repo.get_product(item_code)
            if not product:
                product = ProductData(
                    item_code=item_code,
                    barcode_value=item_code,
                    name=f"Product {item_code}",
                    needs_review=True,
                )
                await db.products.insert_one(product.model_dump())

            matched_products.append(MatchedProduct(
                item_code=item_code,
                name=product.name,
                description=product.description,
                barcode_bbox=barcode.bounding_box,
            ))

        if matched_products:
            try:
                areas = await detect_product_areas(image_data, matched_products)
            except Exception as e:
                logger.error(f"Product area detection failed: {e}")
                areas = ProductAreasResponse(product_areas=[], unknown_areas=[])
        else:
            areas = ProductAreasResponse(product_areas=[], unknown_areas=[])

        product_area_map = {pa.item_code: pa.bounding_box for pa in areas.product_areas}

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

            if product.running_out_condition:
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
                    logger.error(f"Stock evaluation failed for {matched.item_code}: {e}")
                    status = "in_stock"
                    reasoning = f"Stock evaluation failed: {e}"
            else:
                status = "in_stock"
                reasoning = "Visual check indicates adequate stock"

            detection_products.append(DetectionProduct(
                item_code=matched.item_code,
                barcode_bounding_box=matched.barcode_bbox,
                product_area_bounding_box=area_bbox,
                status=status,
                ai_reasoning=reasoning,
                running_out_condition=product.running_out_condition or "",
            ))

            await db.products.update_one(
                {"item_code": matched.item_code},
                {"$set": {
                    "current_status": status,
                    "last_detected_at": datetime.utcnow(),
                    "last_bounding_box": area_bbox.model_dump(),
                    "last_ai_reasoning": reasoning,
                    "updated_at": datetime.utcnow(),
                }},
                upsert=True,
            )

        for unknown in areas.unknown_areas:
            unknown_items.append(UnknownItem(
                bounding_box=unknown.bounding_box,
                description=unknown.description,
            ))

            await db.products.insert_one({
                "item_code": f"UNK-{int(time.time())}-{len(unknown_items)}",
                "barcode_value": "",
                "name": f"Unknown Product: {unknown.description}",
                "description": unknown.description,
                "current_status": "unknown",
                "needs_review": True,
                "last_bounding_box": unknown.bounding_box.model_dump(),
                "last_detected_at": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            })

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

        await ws_manager.broadcast("scan_completed", {
            "detection_id": detection_id,
            "summary": {
                "total": len(matched_products),
                "running_out": sum(1 for p in detection_products if p.status == "running_out"),
            },
        })

        try:
            from ..ordering.service import check_and_create_orders
            await check_and_create_orders(db)
        except Exception as e:
            logger.error(f"Post-scan order check failed: {e}")

        # Mark job as completed
        await db.pipeline_jobs.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "detection_id": detection_id
            }}
        )
        await ws_manager.broadcast("job_status_update", {"job_id": str(job_id), "status": "completed"})

        return detection_id

    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        await _fail_job(db, job_id, str(e))
        raise

async def run_scan(camera_id: str = "camera-1"):
    await ws_manager.broadcast("scan_started", {"camera_id": camera_id})
    return {"message": "Scan triggered", "camera_id": camera_id}
