import asyncio
import time
from datetime import datetime

from PIL import Image

from ...websocket import ws_manager
from ...dependencies import get_db
from ...models.detection import DetectionResult, DetectionProduct, UnknownItem
from ...models.product import ProductData, ProductStatusUpdate
from .gemini import detect_barcodes, detect_product_areas, evaluate_stock_level
from .image import decode_barcode, crop_bbox


async def run_detection_pipeline(image_path: str, camera_id: str = "camera-1") -> str:
    start_time = time.time()

    await ws_manager.broadcast("scan_started", {"camera_id": camera_id})

    db = await get_db()

    from ...main import app
    if not hasattr(app.state, "product_repo") or not app.state.product_repo:
        raise RuntimeError("Product repository not initialized. Please check server startup.")

    repo = app.state.product_repo
    
    img = Image.open(image_path)
    original_image = img
    
    settings_doc = await db.settings.find_one({"_id": "app_settings"})
    gemini_config = settings_doc.get("gemini_models", {}) if settings_doc else {}
    
    barcodes = await detect_barcodes(image_path)
    
    products_list = []
    unknown_count = 0
    
    for bbox in barcodes:
        bb = bbox["bounding_box"]
        item_code = decode_barcode(image_path, bb, original_image)
        
        if item_code:
            product = await repo.get_product(item_code)
            if product:
                products_list.append({
                    "item_code": item_code,
                    "name": product.name,
                    "description": product.description,
                    "barcode_bbox": bb
                })
            else:
                new_product = ProductData(
                    item_code=item_code,
                    barcode_value=item_code,
                    name=f"Product {item_code}",
                    needs_review=True
                )
                await db.products.insert_one(new_product.model_dump())
                products_list.append({
                    "item_code": item_code,
                    "name": new_product.name,
                    "description": None,
                    "barcode_bbox": bb
                })
        else:
            unknown_count += 1
    
    if products_list:
        areas = await detect_product_areas(image_path, products_list)
    else:
        areas = {"product_areas": [], "unknown_areas": []}
    
    product_area_map = {p["item_code"]: p for p in areas["product_areas"]}
    
    detection_products = []
    unknown_items = []
    
    for prod in products_list:
        item_code = prod["item_code"]
        product = await repo.get_product(item_code) or ProductData(
            item_code=item_code,
            barcode_value=item_code,
            name=prod["name"],
            description=prod["description"]
        )
        
        area_bbox = product_area_map.get(item_code, {}).get("bounding_box", prod["barcode_bbox"])
        
        if product.running_out_condition and area_bbox:
            crop_bio = crop_bbox(image_path, area_bbox)
            
            temp_path = f"/tmp/temp_{item_code}.jpg"
            Image.open(crop_bio).save(temp_path)
            
            evaluation = await evaluate_stock_level(temp_path, {
                "name": product.name,
                "description": product.description,
                "running_out_condition": product.running_out_condition
            })
            
            status = "running_out" if evaluation.get("is_running_out") else "in_stock"
            reasoning = evaluation.get("reasoning", "")
            
            import os
            os.remove(temp_path)
        else:
            status = "in_stock"
            reasoning = "Visual check indicates adequate stock"
        
        detection_products.append(DetectionProduct(
            item_code=item_code,
            barcode_bounding_box=prod["barcode_bbox"],
            product_area_bounding_box=area_bbox,
            status=status,
            ai_reasoning=reasoning,
            running_out_condition=product.running_out_condition or ""
        ))
        
        await db.products.update_one(
            {"item_code": item_code},
            {"$set": {
                "current_status": status,
                "last_detected_at": datetime.utcnow(),
                "last_bounding_box": area_bbox,
                "last_ai_reasoning": reasoning,
                "updated_at": datetime.utcnow()
            }},
            upsert=True
        )
    
    for unknown in areas["unknown_areas"]:
        unknown_items.append(UnknownItem(
            bounding_box=unknown["bounding_box"],
            description=unknown["description"]
        ))
        
        await db.products.insert_one({
            "item_code": f"UNK-{int(time.time())}-{len(unknown_items)}",
            "barcode_value": "",
            "name": f"Unknown Product: {unknown['description']}",
            "description": unknown["description"],
            "current_status": "unknown",
            "needs_review": True,
            "last_bounding_box": unknown["bounding_box"],
            "last_detected_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
    
    processing_time = (time.time() - start_time) * 1000
    
    result = DetectionResult(
        camera_id=camera_id,
        image_path=image_path.split("/")[-1],
        products=detection_products,
        unknown_items=unknown_items,
        processing_time_ms=processing_time
    )
    
    result_doc = result.model_dump()
    insert_result = await db.detections.insert_one(result_doc)
    detection_id = str(insert_result.inserted_id)
    
    await ws_manager.broadcast("scan_completed", {
        "detection_id": detection_id,
        "summary": {"total": len(products_list), "running_out": sum(1 for p in detection_products if p.status == "running_out")}
    })
    
    from ..ordering.service import check_and_create_orders
    await check_and_create_orders(db)
    
    return detection_id


async def run_scan(camera_id: str = "camera-1"):
    await ws_manager.broadcast("scan_started", {"camera_id": camera_id})
    return {"message": "Scan triggered", "camera_id": camera_id}