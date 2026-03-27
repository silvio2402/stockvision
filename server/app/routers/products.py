from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from ..dependencies import get_current_user, get_db
from ..models.product import ProductData, ProductStatusUpdate, ProductUpdate

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductData])
async def list_products(
    status: str | None = None,
    needs_review: bool | None = None,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    query = {}
    if status:
        query["current_status"] = status
    if needs_review is not None:
        query["needs_review"] = needs_review

    cursor = db.products.find(query)
    products = []
    async for doc in cursor:
        products.append(ProductData(**doc))
    return products


@router.get("/{item_code}", response_model=ProductData)
async def get_product(
    item_code: str,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    doc = await db.products.find_one({"item_code": item_code})
    if doc is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductData(**doc)


@router.put("/{item_code}")
async def update_product(
    item_code: str,
    update: ProductUpdate,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    update_dict = update.model_dump(exclude_unset=True)
    update_dict["updated_at"] = datetime.utcnow()

    result = await db.products.update_one(
        {"item_code": item_code},
        {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    doc = await db.products.find_one({"item_code": item_code})
    return ProductData(**doc)


@router.delete("/{item_code}")
async def delete_product(
    item_code: str,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    result = await db.products.delete_one({"item_code": item_code})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": item_code}