from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import (
    auth,
    camera,
    products,
    detections,
    orders,
    settings as settings_router,
    ws,
)
from .services.data.erp import ERPClient
from .services.data.sources import ERPDataSource, SampleDataSource
from .services.data.repository import ProductRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    from .dependencies import get_db

    db = await get_db()

    erp_client = ERPClient(settings.erp_product_url, settings.erp_products_list_url)
    erp_source = ERPDataSource(erp_client)
    sample_source = SampleDataSource()

    app.state.product_repo = ProductRepository(
        db, sources=[erp_source, sample_source]
    )

    await _migrate_existing_products(db, sample_source)

    from .services.scheduler import start_scheduler

    start_scheduler()

    yield

    from .services.scheduler import shutdown_scheduler

    shutdown_scheduler()

    from .dependencies import close_db

    await close_db()


async def _migrate_existing_products(db, sample_source: SampleDataSource):
    import logging

    logger = logging.getLogger(__name__)

    old_unk = await db.products.delete_many(
        {"item_code": {"$regex": r"^UNK-\d+-\d+$"}}
    )
    if old_unk.deleted_count:
        logger.info(f"Cleaned up {old_unk.deleted_count} old-format unknown products")

    sample_products = sample_source._products
    for item_code, ext in sample_products.items():
        update_fields: dict = {
            "data_source": "sample",
            "name": ext.name,
            "description": ext.description,
        }
        if ext.running_out_condition is not None:
            update_fields["running_out_condition"] = ext.running_out_condition
        if ext.order_amount is not None:
            update_fields["order_amount"] = ext.order_amount
        await db.products.update_many(
            {"item_code": item_code},
            {"$set": update_fields},
        )

    await db.products.update_many(
        {"data_source": {"$exists": False}, "item_code": {"$not": {"$regex": "^UNK-"}}},
        {"$set": {"data_source": "manual"}},
    )
    await db.products.update_many(
        {"data_source": {"$exists": False}, "item_code": {"$regex": "^UNK-"}},
        {"$set": {"data_source": "unknown"}},
    )

    logger.info("Product migration complete")


app = FastAPI(title="StockVision API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(camera.router)
app.include_router(products.router)
app.include_router(detections.router)
app.include_router(orders.router)
app.include_router(settings_router.router)
app.include_router(ws.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/images/{path:path}")
async def serve_image(path: str):
    from fastapi.responses import FileResponse, JSONResponse
    from pathlib import Path

    storage_root = Path(settings.image_storage_path).resolve()
    full_path = (storage_root / path).resolve()

    if not str(full_path).startswith(str(storage_root)):
        return JSONResponse(status_code=403, content={"error": "Forbidden"})

    if full_path.is_file():
        return FileResponse(full_path)
    return JSONResponse(status_code=404, content={"error": "Image not found"})
