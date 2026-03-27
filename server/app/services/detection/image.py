from io import BytesIO
from pathlib import Path

from PIL import Image
from pyzbar import pyzbar


def decode_barcode(image_path: str, bbox: dict, original_image: Image.Image) -> str | None:
    x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
    
    crop = original_image.crop((x, y, x + w, y + h))
    
    codes = pyzbar.decode(crop)
    if codes:
        return codes[0].data.decode("utf-8")
    return None


def crop_bbox(image_path: str, bbox: dict) -> BytesIO:
    img = Image.open(image_path)
    x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
    
    crop = img.crop((x, y, x + w, y + h))
    
    bio = BytesIO()
    crop.save(bio, format="JPEG")
    bio.seek(0)
    return bio


def get_image_dimensions(image_path: str) -> tuple[int, int]:
    img = Image.open(image_path)
    return img.size