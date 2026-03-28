from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from ..dependencies import get_current_user, get_db
from ..models.product import ProductData, ProductUpdate
from ..services.data.repository import ProductRepository

router = APIRouter(prefix="/api/products", tags=["products"])


def _get_repo(request: Request) -> ProductRepository:
    return request.app.state.product_repo


@router.get("", response_model=list[ProductData])
async def list_products(
    request: Request,
    status: str | None = None,
    needs_review: bool | None = None,
    user: str = Depends(get_current_user),
):
    repo = _get_repo(request)
    products = await repo.get_all_products()

    if status:
        products = [p for p in products if p.current_status == status]
    if needs_review is not None:
        products = [p for p in products if p.needs_review == needs_review]

    return products


@router.get("/{item_code}", response_model=ProductData)
async def get_product(
    request: Request,
    item_code: str,
    user: str = Depends(get_current_user),
):
    repo = _get_repo(request)
    product = await repo.get_product(item_code)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{item_code}")
async def update_product(
    request: Request,
    item_code: str,
    update: ProductUpdate,
    user: str = Depends(get_current_user),
):
    repo = _get_repo(request)
    product = await repo.update_product(item_code, update)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.is_configured and product.current_status == "unconfigured":
        await repo.db.products.update_one(
            {"item_code": item_code},
            {
                "$set": {
                    "current_status": "not_detected",
                    "needs_review": False,
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        product = await repo.get_product(item_code)

    return product


@router.delete("/{item_code}")
async def delete_product(
    request: Request,
    item_code: str,
    user: str = Depends(get_current_user),
):
    repo = _get_repo(request)
    deleted = await repo.delete_product(item_code)
    if not deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": item_code}
