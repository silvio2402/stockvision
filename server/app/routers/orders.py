from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from ..dependencies import get_current_user, get_db
from ..models.order import Order, OrderInDB

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=list[OrderInDB])
async def list_orders(
    status: str | None = None,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    query = {}
    if status:
        query["status"] = status

    cursor = db.orders.find(query).sort("created_at", -1)
    orders = []
    async for doc in cursor:
        doc["id"] = str(doc.get("_id", ""))
        orders.append(OrderInDB(**doc))
    return orders


@router.get("/{order_id}", response_model=OrderInDB)
async def get_order(
    order_id: str,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    from bson import ObjectId
    try:
        object_id = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    doc = await db.orders.find_one({"_id": object_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Order not found")
    doc["id"] = str(doc.get("_id", ""))
    return OrderInDB(**doc)


@router.post("/{order_id}/approve")
async def approve_order(
    order_id: str,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    from bson import ObjectId
    try:
        object_id = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    order_doc = await db.orders.find_one({"_id": object_id})
    if order_doc is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order_doc.get("status") != "pending_approval":
        raise HTTPException(status_code=400, detail="Order is not pending approval")

    from ..services.ordering.service import send_order_email
    sent = await send_order_email(order_doc, db)

    await db.orders.update_one(
        {"_id": object_id},
        {"$set": {
            "status": "approved",
            "status_updated_at": datetime.utcnow(),
            "email_sent_at": datetime.utcnow() if sent else None
        }}
    )

    doc = await db.orders.find_one({"_id": object_id})
    doc["id"] = str(doc.get("_id", ""))
    return OrderInDB(**doc)


@router.post("/{order_id}/decline")
async def decline_order(
    order_id: str,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    from bson import ObjectId
    try:
        object_id = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    order_doc = await db.orders.find_one({"_id": object_id})
    if order_doc is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order_doc.get("status") != "pending_approval":
        raise HTTPException(status_code=400, detail="Order is not pending approval")

    await db.orders.update_one(
        {"_id": object_id},
        {"$set": {
            "status": "declined",
            "status_updated_at": datetime.utcnow()
        }}
    )

    doc = await db.orders.find_one({"_id": object_id})
    doc["id"] = str(doc.get("_id", ""))
    return OrderInDB(**doc)