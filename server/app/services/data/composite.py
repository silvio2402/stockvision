from datetime import datetime
from typing import Annotated

from motor.motor_asyncio import AsyncIOMotorDatabase

from ...config import settings
from ...models.product import ProductData, ProductUpdate


class MongoDBRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_product(self, item_code: str) -> ProductData | None:
        doc = await self.db.products.find_one({"item_code": item_code})
        if doc:
            return ProductData(**doc)
        return None
    
    async def get_all_products(self) -> list[ProductData]:
        cursor = self.db.products.find()
        products = []
        async for doc in cursor:
            products.append(ProductData(**doc))
        return products
    
    async def update_product(self, item_code: str, data: ProductUpdate) -> None:
        update_dict = data.model_dump(exclude_unset=True, exclude_none=True)
        update_dict["updated_at"] = datetime.utcnow()
        
        await self.db.products.update_one(
            {"item_code": item_code},
            {"$set": update_dict},
            upsert=True
        )
    
    async def upsert_product(self, product: ProductData) -> None:
        await self.db.products.update_one(
            {"item_code": product.item_code},
            {"$set": product.model_dump()},
            upsert=True
        )


class CompositeProductRepository:
    def __init__(self, mongodb_repo: MongoDBRepository, erp_client):
        self.mongodb = mongodb_repo
        self.erp = erp_client
    
    async def get_product(self, item_code: str) -> ProductData | None:
        mongo_product = await self.mongodb.get_product(item_code)
        
        erp_product = await self.erp.get_product(item_code)
        
        if mongo_product and erp_product:
            merged = mongo_product.model_dump()
            merged.update({
                "name": erp_product.get("ItemName", mongo_product.name),
                "description": erp_product.get("Description"),
            })
            return ProductData(**merged)
        
        if mongo_product:
            return mongo_product
        
        if erp_product:
            return ProductData(
                item_code=item_code,
                name=erp_product.get("ItemName", f"Product {item_code}"),
                description=erp_product.get("Description"),
                barcode_value=item_code,
                current_status="not_detected"
            )
        
        return None
    
    async def get_all_products(self) -> list[ProductData]:
        erp_products = await self.erp.get_all_products()
        
        erp_map = {p.get("ItemCode"): p for p in erp_products}
        
        mongo_products = await self.mongodb.get_all_products()
        
        result = []
        
        known_codes = set(p.item_code for p in mongo_products)
        
        for item_code, erpData in erp_map.items():
            if item_code not in known_codes:
                result.append(ProductData(
                    item_code=item_code,
                    name=erpData.get("ItemName", f"Product {item_code}"),
                    description=erpData.get("Description"),
                    barcode_value=item_code,
                    current_status="not_detected"
                ))
        
        result.extend(mongo_products)
        return result
    
    async def update_product(self, item_code: str, data: ProductUpdate) -> None:
        await self.mongodb.update_product(item_code, data)