import os
os.environ["TESTING"] = "true"

from unittest.mock import AsyncMock
import pytest
import json
from server.app.services.detection.pipeline import run_detection_pipeline
from server.app.models.product import ProductData
from server.app.services.data.repository import ProductRepository

# Mock product repository
class MockProductRepository:
    def __init__(self, products):
        self.products = products

    async def get_product(self, item_code):
        return self.products.get(item_code)

    async def resolve_product(self, item_code):
        return await self.get_product(item_code)

    async def refresh_product(self, item_code):
        return await self.get_product(item_code)

    async def upsert_product(self, product):
        self.products[product.item_code] = product

    async def delete_products(self, item_codes):
        for code in item_codes:
            if code in self.products:
                del self.products[code]
        return len(item_codes)

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.detections = AsyncMock()
    db.products = AsyncMock()
    db.pipeline_jobs = AsyncMock()
    
    db._detections = {}
    
    async def find_one(filter=None, sort=None):
        if filter is None:
            filter = {}
        id_val = filter.get("_id")
        return db._detections.get(id_val)
        
    db.detections.find_one = find_one


    
    async def insert_one(doc):
        from bson import ObjectId
        id = doc.get("_id")
        if not id:
            id = str(ObjectId())
            doc["_id"] = id
        
        print(f"DEBUG: Inserting doc: {doc.keys()}, ID: {id}")
        db._detections[id] = doc
        print(f"DEBUG: Collection now has keys: {list(db._detections.keys())}")
        return AsyncMock(inserted_id=id)
        
    db.detections.insert_one = insert_one
    
    async def update_one(filter, update, upsert=False):
        print(f"DEBUG: Update one called on {filter}")
        return AsyncMock()

    db.products.update_one = update_one
    db.pipeline_jobs.update_one = update_one
    
    return db



@pytest.fixture
def mock_repo():
    with open("server/app/data/sample_products.json", "r") as f:
        products_list = json.load(f)
        products = {p["item_code"]: ProductData(**p) for p in products_list}
    return MockProductRepository(products)

@pytest.mark.asyncio
async def test_full_pipeline(mock_db, mock_repo):
    with open("tests/data/test_cases.json", "r") as f:
        test_cases = json.load(f)

    for case in test_cases:
        image_path = f"tests/data/images/{case['image_file']}"
        
        detection_id = await run_detection_pipeline(
            image_path=image_path,
            repo=mock_repo,
            db=mock_db
        )

        # Retrieve from mock
        result = await mock_db.detections.find_one({"_id": detection_id})
        assert result is not None

        actual_products = {p["item_code"]: p["status"] for p in result["products"]}
        
        for expected in case["products"]:
            assert expected["item_code"] in actual_products, f"Product {expected['item_code']} not detected in {case['test_name']}"
            assert actual_products[expected["item_code"]] == expected["status"], \
                f"Status mismatch for {expected['item_code']} in {case['test_name']}: expected {expected['status']}, got {actual_products[expected['item_code']]}"
