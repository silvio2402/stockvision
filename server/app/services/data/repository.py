from datetime import datetime
from typing import Protocol

from ...models.product import ProductData, ProductUpdate


class ProductRepository(Protocol):
    async def get_product(self, item_code: str) -> ProductData | None: ...
    async def get_all_products(self) -> list[ProductData]: ...
    async def update_product(self, item_code: str, data: ProductUpdate) -> None: ...