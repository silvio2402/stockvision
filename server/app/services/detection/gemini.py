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
    matched_previous_id: str | None
    generated_name: str | None


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


class PreviousProduct(BaseModel):
    item_code: str
    name: str
    bounding_box: BoundingBox


class PreviousUnknown(BaseModel):
    assigned_id: str
    generated_name: str
    bounding_box: BoundingBox


async def detect_barcodes(image_data: bytes) -> list[BarcodeItem]:
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = (
        "Analyze this image of a warehouse shelf. "
        "Detect ALL visible barcodes in the image.\n\n"
        "For each barcode found, return only the bounding box coordinates "
        "using the 1000x1000 coordinate system where 0,0 is top-left.\n"
        "DO NOT try to decode the barcode text - that will be handled separately."
    )

    await ws_manager.broadcast(
        "scan_progress",
        {"step": "barcode_detection", "detail": "Detecting barcode bounding boxes with Gemini"},
    )

    response = client.models.generate_content(
        model=settings.gemini_models.barcode_detection,
        contents=[
            prompt,
            types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BarcodeDetectionResponse,
        ),
    )

    if response.parsed is None:
        return []
    return response.parsed.barcodes


async def detect_product_areas(
    image_data: bytes,
    products: list[MatchedProduct],
    previous_products: list[PreviousProduct] | None = None,
    previous_unknowns: list[PreviousUnknown] | None = None,
) -> ProductAreasResponse:
    client = genai.Client(api_key=settings.gemini_api_key)

    products_desc = "\n".join(
        [
            f'- Product: "{p.name}" (Item Code: {p.item_code})\n'
            f"  Description: {p.description or 'N/A'}\n"
            f"  Barcode location: ymin={p.barcode_bbox.ymin}, xmin={p.barcode_bbox.xmin}, "
            f"ymax={p.barcode_bbox.ymax}, xmax={p.barcode_bbox.xmax}"
            for p in products
        ]
    )

    prompt = (
        "You are analyzing an image of a warehouse shelf. "
        "The following products have been identified at these barcode locations:\n\n"
        f"{products_desc}\n\n"
        "For each product, identify the FULL AREA on the shelf where that product type "
        "is stored/displayed using the 1000x1000 coordinate system where 0,0 is top-left.\n"
        "This area should encompass ALL units of that product visible on the shelf, not just the barcode.\n"
        "If a product appears to be completely out of stock, estimate where it would be "
        "based on its barcode position and neighboring products.\n\n"
        "Also identify any areas with products that don't match any of the listed products above. "
        "Mark these as unknown areas."
    )

    if previous_unknowns:
        prev_desc = "\n".join(
            [
                f'- ID: "{u.assigned_id}", Name: "{u.generated_name}", '
                f"Location: ymin={u.bounding_box.ymin}, xmin={u.bounding_box.xmin}, "
                f"ymax={u.bounding_box.ymax}, xmax={u.bounding_box.xmax}"
                for u in previous_unknowns
            ]
        )
        prompt += (
            "\n\nIMPORTANT - Previous scan detected these unknown products:\n"
            f"{prev_desc}\n\n"
            "For each unknown area you find in the current image:\n"
            '- If it matches a previous unknown (similar location/appearance), set matched_previous_id to that ID\n'
            "- If it's a new unknown, leave matched_previous_id empty\n"
            "- Generate a short, descriptive name for each unknown product (e.g. 'Red coffee mug', 'Small cardboard box')\n"
            "  and put it in generated_name\n"
            "- Provide a brief description of the product appearance"
        )
    else:
        prompt += (
            "\n\nFor each unknown area:\n"
            "- Provide a brief description of the product appearance\n"
            "- Generate a short, descriptive name (e.g. 'Red coffee mug', 'Small cardboard box') "
            "and put it in generated_name"
        )

    if previous_products:
        prev_prod_desc = "\n".join(
            [
                f'- "{p.name}" (Item Code: {p.item_code}), '
                f"Last location: ymin={p.bounding_box.ymin}, xmin={p.bounding_box.xmin}, "
                f"ymax={p.bounding_box.ymax}, xmax={p.bounding_box.xmax}"
                for p in previous_products
            ]
        )
        prompt += (
            "\n\nFor reference, the previous scan also detected these known products:\n"
            f"{prev_prod_desc}"
        )

    await ws_manager.broadcast(
        "scan_progress",
        {"step": "product_area_detection", "detail": "Detecting product areas"},
    )

    response = client.models.generate_content(
        model=settings.gemini_models.product_area_detection,
        contents=[
            prompt,
            types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ProductAreasResponse,
        ),
    )

    if response.parsed is None:
        return ProductAreasResponse(product_areas=[], unknown_areas=[])
    return response.parsed


async def evaluate_stock_level(
    image_data: bytes,
    name: str,
    description: str | None,
    running_out_condition: str,
) -> StockEvaluationResponse:
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = (
        f'You are evaluating the stock level of a product on a warehouse shelf.\n\n'
        f'Product: "{name}"\n'
        f"Description: {description or 'N/A'}\n"
        f'Running out condition: "{running_out_condition}"\n\n'
        "Based on the image of this product's area, determine whether the "
        '"running out" condition is met.\n\n'
        "Analyze carefully:\n"
        "- Look at the quantity of product visible\n"
        "- Consider the specific condition described\n"
        "- Be conservative - only mark as running out if the condition is clearly met\n"
        "- Provide a confidence score between 0.0 and 1.0"
    )

    response = client.models.generate_content(
        model=settings.gemini_models.stock_evaluation,
        contents=[
            prompt,
            types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StockEvaluationResponse,
        ),
    )

    if response.parsed is None:
        return StockEvaluationResponse(
            is_running_out=False,
            reasoning="Failed to parse Gemini response",
            confidence=0.0,
        )
    return response.parsed
