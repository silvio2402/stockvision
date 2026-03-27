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
    settings,
    ws,
)
from .services.data.erp import ERPClient
from .services.data.composite import CompositeProductRepository, MongoDBRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    erp_client = None
    mongo_repo = None
    app.state.erp_client = erp_client
    app.state.product_repo = None
    
    from .dependencies import get_db
    db = await get_db()
    
    erp_client = ERPClient(settings.erp_product_url, settings.erp_products_list_url)
    mongo_repo = MongoDBRepository(db)
    composite_repo = CompositeProductRepository(mongo_repo, erp_client)
    
    app.state.erp_client = erp_client
    app.state.product_repo = composite_repo
    
    from .services.scheduler import start_scheduler
    start_scheduler()
    
    yield
    
    from .services.scheduler import shutdown_scheduler
    shutdown_scheduler()
    
    from .dependencies import close_db
    await close_db()


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
app.include_router(settings.router)
app.include_router(ws.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/images/{path:path}")
async def serve_image(path: str):
    from fastapi.responses import FileResponse
    from pathlib import Path
    
    full_path = Path(settings.image_storage_path) / path
    if full_path.is_file():
        return FileResponse(full_path)
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=404, content={"error": "Image not found"})


async def get_product_repository(db):
    if hasattr(app.state, "product_repo") and app.state.product_repo:
        return app.state.product_repo
    
    erp_client = ERPClient(settings.erp_product_url, settings.erp_products_list_url)
    mongo_repo = MongoDBRepository(db)
    composite_repo = CompositeProductRepository(mongo_repo, erp_client)
    app.state.product_repo = composite_repo
    return composite_repo