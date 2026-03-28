import json
import logging
from pathlib import Path
from typing import Protocol, runtime_checkable

from pydantic import BaseModel

from .erp import ERPClient

logger = logging.getLogger(__name__)


class ExternalProductData(BaseModel):
    item_code: str
    name: str
    barcode_value: str | None = None
    main_supplier: str | None = None
    description: str | None = None
    running_out_condition: str | None = None
    order_amount: int | None = None


@runtime_checkable
class ProductDataSource(Protocol):
    @property
    def source_name(self) -> str: ...

    async def get_product(self, item_code: str) -> ExternalProductData | None: ...

    async def search_by_barcode(
        self, barcode_value: str
    ) -> ExternalProductData | None: ...


class ERPDataSource:
    def __init__(self, erp_client: ERPClient):
        self._erp = erp_client

    @property
    def source_name(self) -> str:
        return "erp"

    async def get_product(self, item_code: str) -> ExternalProductData | None:
        data = await self._erp.get_product(item_code)
        if not data:
            return None
        return ExternalProductData(
            item_code=data.get("ItemCode", item_code),
            name=data.get("ItemName", f"Product {item_code}"),
            main_supplier=data.get("Mainsupplier"),
            barcode_value=item_code,
        )

    async def search_by_barcode(
        self, barcode_value: str
    ) -> ExternalProductData | None:
        return await self.get_product(barcode_value)


class SampleDataSource:
    def __init__(self, data_path: Path | None = None):
        if data_path is None:
            data_path = Path(__file__).parent.parent.parent / "data" / "sample_products.json"

        self._products: dict[str, ExternalProductData] = {}
        self._barcode_index: dict[str, str] = {}

        if data_path.exists():
            with open(data_path) as f:
                raw = json.load(f)
            for item in raw:
                ext = ExternalProductData(**item)
                self._products[ext.item_code] = ext
                if ext.barcode_value:
                    self._barcode_index[ext.barcode_value] = ext.item_code
            logger.info(f"Loaded {len(self._products)} sample products from {data_path}")
        else:
            logger.warning(f"Sample products file not found: {data_path}")

    @property
    def source_name(self) -> str:
        return "sample"

    async def get_product(self, item_code: str) -> ExternalProductData | None:
        return self._products.get(item_code)

    async def search_by_barcode(
        self, barcode_value: str
    ) -> ExternalProductData | None:
        item_code = self._barcode_index.get(barcode_value)
        if item_code:
            return self._products.get(item_code)
        return None
