import logging
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from ...models.product import ProductData, ProductUpdate
from .sources import ExternalProductData, ProductDataSource

logger = logging.getLogger(__name__)


class ProductRepository:
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        sources: list[ProductDataSource] | None = None,
    ):
        self.db = db
        self.sources: list[ProductDataSource] = sources or []

    async def get_product(self, item_code: str) -> ProductData | None:
        doc = await self.db.products.find_one({"item_code": item_code})
        if doc:
            return ProductData(**doc)
        return None

    async def get_product_by_barcode(self, barcode_value: str) -> ProductData | None:
        doc = await self.db.products.find_one({"barcode_value": barcode_value})
        if doc:
            return ProductData(**doc)
        return None

    async def get_all_products(self) -> list[ProductData]:
        cursor = self.db.products.find()
        return [ProductData(**doc) async for doc in cursor]

    async def resolve_product(self, identifier: str) -> ProductData | None:
        """Check MongoDB, then external sources. Auto-creates on first external match."""
        existing = await self.get_product(identifier)
        if existing:
            return existing

        existing = await self.get_product_by_barcode(identifier)
        if existing:
            return existing

        for source in self.sources:
            ext = await source.get_product(identifier)
            if not ext:
                ext = await source.search_by_barcode(identifier)
            if ext:
                return await self._create_from_external(ext, source.source_name)

        return None

    async def refresh_product(self, item_code: str) -> ProductData | None:
        """Fetch latest from sources and update if found, otherwise return existing."""
        existing = await self.get_product(item_code)
        
        for source in self.sources:
            ext = await source.get_product(item_code)
            if not ext:
                ext = await source.search_by_barcode(item_code)
            
            if ext:
                if not existing:
                    return await self._create_from_external(ext, source.source_name)
                
                existing.name = ext.name
                existing.description = ext.description or existing.description
                existing.main_supplier = ext.main_supplier or existing.main_supplier
                existing.running_out_condition = ext.running_out_condition or existing.running_out_condition
                existing.order_amount = ext.order_amount or existing.order_amount
                existing.updated_at = datetime.utcnow()
                await self.upsert_product(existing)
                return existing
        
        return existing

    async def _create_from_external(
        self, ext: ExternalProductData, source_name: str
    ) -> ProductData:
        is_configured = (
            ext.running_out_condition is not None and ext.order_amount is not None
        )
        product = ProductData(
            item_code=ext.item_code,
            name=ext.name,
            barcode_value=ext.barcode_value,
            main_supplier=ext.main_supplier,
            description=ext.description,
            running_out_condition=ext.running_out_condition,
            order_amount=ext.order_amount,
            data_source=source_name,
            current_status="not_detected" if is_configured else "unconfigured",
            needs_review=not is_configured,
        )
        await self.upsert_product(product)
        logger.info(f"Auto-created product {ext.item_code} from {source_name}")
        return product

    async def update_product(
        self, item_code: str, data: ProductUpdate
    ) -> ProductData | None:
        update_dict = data.model_dump(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()

        result = await self.db.products.update_one(
            {"item_code": item_code},
            {"$set": update_dict},
        )
        if result.matched_count == 0:
            return None
        return await self.get_product(item_code)

    async def upsert_product(self, product: ProductData) -> None:
        await self.db.products.update_one(
            {"item_code": product.item_code},
            {"$set": product.model_dump()},
            upsert=True,
        )

    async def delete_product(self, item_code: str) -> bool:
        result = await self.db.products.delete_one({"item_code": item_code})
        return result.deleted_count > 0

    async def delete_products(self, item_codes: list[str]) -> int:
        if not item_codes:
            return 0
        result = await self.db.products.delete_many(
            {"item_code": {"$in": item_codes}}
        )
        return result.deleted_count
