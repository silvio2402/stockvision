from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFilter
from pyzbar import pyzbar

GEMINI_COORD_SPACE = 1000


def _scale_bbox(bbox: dict, image_size: tuple[int, int]) -> tuple[int, int, int, int]:
    img_w, img_h = image_size
    scale_x = img_w / GEMINI_COORD_SPACE
    scale_y = img_h / GEMINI_COORD_SPACE
    x = int(bbox["x"] * scale_x)
    y = int(bbox["y"] * scale_y)
    w = int(bbox["width"] * scale_x)
    h = int(bbox["height"] * scale_y)
    return x, y, w, h


DECODE_PADDING_STEPS = [0, 40, 80, 120]


def decode_barcode(image_path: str, bbox: dict, original_image: Image.Image) -> str | None:
    img_w, img_h = original_image.size
    scale_x = img_w / GEMINI_COORD_SPACE
    scale_y = img_h / GEMINI_COORD_SPACE

    for pad in DECODE_PADDING_STEPS:
        x1 = max(0, int((bbox["x"] - pad) * scale_x))
        y1 = max(0, int((bbox["y"] - pad) * scale_y))
        x2 = min(img_w, int((bbox["x"] + bbox["width"] + pad) * scale_x))
        y2 = min(img_h, int((bbox["y"] + bbox["height"] + pad) * scale_y))

        crop = original_image.crop((x1, y1, x2, y2))
        grayscale = crop.convert("L")

        codes = pyzbar.decode(grayscale)
        if codes:
            return codes[0].data.decode("utf-8")

        blurred = grayscale.filter(ImageFilter.SMOOTH_MORE)
        codes = pyzbar.decode(blurred)
        if codes:
            return codes[0].data.decode("utf-8")

    return None


def crop_bbox(image_path: str, bbox: dict) -> BytesIO:
    img = Image.open(image_path)
    x, y, w, h = _scale_bbox(bbox, img.size)

    crop = img.crop((x, y, x + w, y + h))

    bio = BytesIO()
    crop.save(bio, format="JPEG")
    bio.seek(0)
    return bio


def get_image_dimensions(image_path: str) -> tuple[int, int]:
    img = Image.open(image_path)
    return img.size