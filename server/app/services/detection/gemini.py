from google import genai
from google.genai import types

from ...config import settings
from ...websocket import ws_manager

async def detect_barcodes(image_path: str) -> list[dict]:
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = '''Analyze this image of a warehouse shelf. Detect ALL visible barcodes in the image.

For each barcode found, return only the bounding box coordinates.
DO NOT try to decode the barcode text - I will handle that separately.

Return ONLY valid JSON in this exact format:
{
  "barcodes": [
    {
      "bounding_box": { "x": <left>, "y": <top>, "width": <w>, "height": <h> }
    }
  ]
}

If no barcodes are found, return: {"barcodes": []}'''

    await ws_manager.broadcast("scan_progress", {"step": "barcode_detection", "detail": "Detecting barcode bounding boxes with Gemini"})

    with open(image_path, "rb") as f:
        image_data = f.read()

    response = client.models.generate_content(
        model=settings.gemini_models.barcode_detection,
        contents=[prompt, types.Part.from_bytes(data=image_data, mime_type="image/jpeg")],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    import json
    result = json.loads(response.text)
    return result.get("barcodes", [])


async def detect_product_areas(image_path: str, products: list[dict]) -> dict:
    client = genai.Client(api_key=settings.gemini_api_key)

    products_desc = "\n".join([
        f'- Product: "{p["name"]}" (Item Code: {p["item_code"]})\n'
        f'  Description: {p.get("description", "N/A")}\n'
        f'  Barcode location: x={p["barcode_bbox"]["x"]}, y={p["barcode_bbox"]["y"]}, '
        f'width={p["barcode_bbox"]["width"]}, height={p["barcode_bbox"]["height"]}'
        for p in products
    ])

    prompt = f'''You are analyzing an image of a warehouse shelf. The following products have been identified at these barcode locations:

{products_desc}

For each product, identify the FULL AREA on the shelf where that product type is stored/displayed.
This area should encompass ALL units of that product visible on the shelf, not just the barcode.
If a product appears to be completely out of stock, estimate where it would be based on its barcode position and neighboring products.

Also identify any areas with products that don't match any of the listed products above. Mark these as "unknown".

Return ONLY valid JSON:
{{
  "product_areas": [
    {{
      "item_code": "string",
      "bounding_box": {{ "x": <left>, "y": <top>, "width": <w>, "height": <h> }}
    }}
  ],
  "unknown_areas": [
    {{
      "bounding_box": {{ "x": <left>, "y": <top>, "width": <w>, "height": <h> }},
      "description": "brief description of what's there"
    }}
  ]
}}'''

    await ws_manager.broadcast("scan_progress", {"step": "product_area_detection", "detail": "Detecting product areas"})

    with open(image_path, "rb") as f:
        image_data = f.read()

    response = client.models.generate_content(
        model=settings.gemini_models.product_area_detection,
        contents=[prompt, types.Part.from_bytes(data=image_data, mime_type="image/jpeg")],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    import json
    result = json.loads(response.text)
    return result


async def evaluate_stock_level(image_path: str, product: dict) -> dict:
    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = f'''You are evaluating the stock level of a product on a warehouse shelf.

Product: "{product["name"]}"
Description: {product.get("description", "N/A")}
Running out condition: "{product.get("running_out_condition", "standard visual assessment")}"

Based on the image of this product's area, determine whether the "running out" condition is met.

Analyze carefully:
- Look at the quantity of product visible
- Consider the specific condition described
- Be conservative — only mark as running out if the condition is clearly met

Return ONLY valid JSON:
{{
  "is_running_out": true/false,
  "reasoning": "Brief explanation of what you see and why you made this determination",
  "confidence": 0.0-1.0
}}'''

    with open(image_path, "rb") as f:
        image_data = f.read()

    response = client.models.generate_content(
        model=settings.gemini_models.stock_evaluation,
        contents=[prompt, types.Part.from_bytes(data=image_data, mime_type="image/jpeg")],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    import json
    result = json.loads(response.text)
    return result