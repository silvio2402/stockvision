from io import BytesIO

from PIL import Image, ImageFilter
from pyzbar import pyzbar

from ...models.product import BoundingBox

GEMINI_COORD_SPACE = 1000

DECODE_PADDING_STEPS = [0, 40, 80, 120]


def _scale_bbox(bbox: BoundingBox, image_size: tuple[int, int]) -> tuple[int, int, int, int]:
    """Scale bbox from 1000x1000 to image pixel coordinates.
    Returns (xmin, ymin, xmax, ymax) for PIL crop."""
    img_w, img_h = image_size
    scale_x = img_w / GEMINI_COORD_SPACE
    scale_y = img_h / GEMINI_COORD_SPACE
    x1 = int(bbox.xmin * scale_x)
    y1 = int(bbox.ymin * scale_y)
    x2 = int(bbox.xmax * scale_x)
    y2 = int(bbox.ymax * scale_y)
    return x1, y1, x2, y2


def decode_barcode(bbox: BoundingBox, image: Image.Image) -> str | None:
    img_w, img_h = image.size
    scale_x = img_w / GEMINI_COORD_SPACE
    scale_y = img_h / GEMINI_COORD_SPACE

    for pad in DECODE_PADDING_STEPS:
        x1 = max(0, int((bbox.xmin - pad) * scale_x))
        y1 = max(0, int((bbox.ymin - pad) * scale_y))
        x2 = min(img_w, int((bbox.xmax + pad) * scale_x))
        y2 = min(img_h, int((bbox.ymax + pad) * scale_y))

        crop = image.crop((x1, y1, x2, y2))
        grayscale = crop.convert("L")

        codes = pyzbar.decode(grayscale)
        if codes:
            return codes[0].data.decode("utf-8")

        blurred = grayscale.filter(ImageFilter.SMOOTH_MORE)
        codes = pyzbar.decode(blurred)
        if codes:
            return codes[0].data.decode("utf-8")

    return None


def crop_bbox(image: Image.Image, bbox: BoundingBox) -> bytes:
    x1, y1, x2, y2 = _scale_bbox(bbox, image.size)
    crop = image.crop((x1, y1, x2, y2))

    bio = BytesIO()
    crop.save(bio, format="JPEG")
    return bio.getvalue()


def get_image_dimensions(image_path: str) -> tuple[int, int]:
    img = Image.open(image_path)
    return img.size
