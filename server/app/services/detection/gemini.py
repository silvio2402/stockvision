from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from ...config import settings
from ...models.product import BoundingBox
from ...websocket import ws_manager


class BarcodeItem(BaseModel):
    bounding_box: BoundingBox


class BarcodeDetectionResponse(BaseModel):
    barcodes: list[BarcodeItem]


class ProductArea(BaseModel):
    item_code: str
    bounding_box: BoundingBox


class UnknownArea(BaseModel):
    bounding_box: BoundingBox
    description: str


class ProductAreasResponse(BaseModel):
    product_areas: list[ProductArea]
    unknown_areas: list[UnknownArea]


class StockEvaluationResponse(BaseModel):
    is_running_out: bool
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)


class MatchedProduct(BaseModel):
    item_code: str
    name: str
    description: str | None
    barcode_bbox: BoundingBox


async def detect_barcodes(image_data: bytes) -> list[BarcodeItem]:
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = '''Analyze this image of a warehouse shelf. Detect ALL visible barcodes in the image.

For each barcode found, return only the bounding box coordinates using the 1000x1000 coordinate system where 0,0 is top-left.
DO NOT try to decode the barcode text - that will be handled separately.'''

    await ws_manager.broadcast("scan_progress", {
        "step": "barcode_detection",
        "detail": "Detecting barcode bounding boxes with Gemini",
    })

    response = client.models.generate_content(
        model=settings.gemini_models.barcode_detection,
        contents=[prompt, types.Part.from_bytes(data=image_data, mime_type="image/jpeg")],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BarcodeDetectionResponse,
        ),
    )

    return response.parsed.barcodes


async def detect_product_areas(
    image_data: bytes,
    products: list[MatchedProduct],
) -> ProductAreasResponse:
    client = genai.Client(api_key=settings.gemini_api_key)

    products_desc = "\n".join([
        f'- Product: "{p.name}" (Item Code: {p.item_code})\n'
        f'  Description: {p.description or "N/A"}\n'
        f'  Barcode location: ymin={p.barcode_bbox.ymin}, xmin={p.barcode_bbox.xmin}, '
        f'ymax={p.barcode_bbox.ymax}, xmax={p.barcode_bbox.xmax}'
        for p in products
    ])

    prompt = f'''You are analyzing an image of a warehouse shelf. The following products have been identified at these barcode locations:

{products_desc}

For each product, identify the FULL AREA on the shelf where that product type is stored/displayed using the 1000x1000 coordinate system where 0,0 is top-left.
This area should encompass ALL units of that product visible on the shelf, not just the barcode.
If a product appears to be completely out of stock, estimate where it would be based on its barcode position and neighboring products.

Also identify any areas with products that don't match any of the listed products above. Mark these as "unknown" and provide a brief description.'''

    await ws_manager.broadcast("scan_progress", {
        "step": "product_area_detection",
        "detail": "Detecting product areas",
    })

    response = client.models.generate_content(
        model=settings.gemini_models.product_area_detection,
        contents=[prompt, types.Part.from_bytes(data=image_data, mime_type="image/jpeg")],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ProductAreasResponse,
        ),
    )

    return response.parsed


async def evaluate_stock_level(
    image_data: bytes,
    name: str,
    description: str | None,
    running_out_condition: str,
) -> StockEvaluationResponse:
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = f'''You are evaluating the stock level of a product on a warehouse shelf.

Product: "{name}"
Description: {description or "N/A"}
Running out condition: "{running_out_condition}"

Based on the image of this product's area, determine whether the "running out" condition is met.

Analyze carefully:
- Look at the quantity of product visible
- Consider the specific condition described
- Be conservative - only mark as running out if the condition is clearly met
- Provide a confidence score between 0.0 and 1.0'''

    response = client.models.generate_content(
        model=settings.gemini_models.stock_evaluation,
        contents=[prompt, types.Part.from_bytes(data=image_data, mime_type="image/jpeg")],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StockEvaluationResponse,
        ),
    )

    return response.parsed
