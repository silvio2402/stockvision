from datetime import datetime
from typing import Annotated

from bson import ObjectId

from ...dependencies import get_db
from ...models.order import Order, OrderItem
from ...websocket import ws_manager
from .email import send_order_email


async def create_order(items: list[dict], db) -> str:
    order = Order(
        items=[OrderItem(**item) for item in items],
        status="pending_approval"
    )
    
    doc = order.model_dump()
    result = await db.orders.insert_one(doc)
    order_id = str(result.inserted_id)
    
    await ws_manager.broadcast("order_created", {
        "order_id": order_id,
        "item_count": len(items),
        "needs_approval": True
    })
    
    return order_id


async def approve_order(order_id: str, db) -> bool:
    object_id = ObjectId(order_id)
    order_doc = await db.orders.find_one({"_id": object_id})
    
    if not order_doc:
        return False
    
    sent = await send_order_email(order_doc, db)
    
    await db.orders.update_one(
        {"_id": object_id},
        {"$set": {
            "status": "approved",
            "status_updated_at": datetime.utcnow(),
            "email_sent_at": datetime.utcnow() if sent else None
        }}
    )
    
    return sent


async def decline_order(order_id: str, db) -> bool:
    object_id = ObjectId(order_id)
    result = await db.orders.update_one(
        {"_id": object_id},
        {"$set": {
            "status": "declined",
            "status_updated_at": datetime.utcnow()
        }}
    )
    
    return result.modified_count > 0


async def check_and_create_orders(db):
    settings_doc = await db.settings.find_one({"_id": "app_settings"})
    
    if not settings_doc:
        return
    
    approval_required = settings_doc.get("approval_required", True)
    
    running_out_products = []
    cursor = db.products.find({
        "current_status": "running_out",
        "order_amount": {"$ne": None, "$gt": 0},
        "running_out_condition": {"$ne": None, "$ne": ""}
    })
    
    known_product_codes = {}
    async for doc in cursor:
        known_product_codes[doc["item_code"]] = doc
    
    pending_order_items = []
    cursor = db.orders.find({
        "status": {"$in": ["pending_approval", "approved", "ordered"]}
    })
    
    async for doc in cursor:
        for item in doc.get("items", []):
            pending_order_items.append(item["item_code"])
    
    items_to_order = []
    for item_code, product in known_product_codes.items():
        if item_code not in pending_order_items:
            items_to_order.append({
                "item_code": item_code,
                "name": product.get("name", f"Product {item_code}"),
                "order_amount": product.get("order_amount", 1)
            })
    
    if items_to_order:
        if approval_required:
            await create_order(items_to_order, db)
        else:
            order_doc = Order(items=[OrderItem(**item) for item in items_to_order], status="ordered")
            result = await db.orders.insert_one(order_doc.model_dump())
            order_id = str(result.inserted_id)
            
            order_data = order_doc.model_dump()
            order_data["_id"] = result.inserted_id
            
            await send_order_email(order_data, db)
            
            await db.orders.update_one(
                {"_id": result.inserted_id},
                {"$set": {"email_sent_at": datetime.utcnow()}}
            )