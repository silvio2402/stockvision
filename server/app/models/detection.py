from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .product import BoundingBox


class DetectionProduct(BaseModel):
    item_code: str
    name: str = ""
    barcode_bounding_box: BoundingBox
    product_area_bounding_box: BoundingBox
    status: Literal["in_stock", "running_out", "unconfigured"]
    ai_reasoning: str
    running_out_condition: str


class UnknownItem(BaseModel):
    bounding_box: BoundingBox
    description: str
    assigned_id: str = ""
    generated_name: str = ""


class DetectionResult(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    camera_id: str = "camera-1"
    image_path: str = ""

    products: list[DetectionProduct] = []
    unknown_items: list[UnknownItem] = []

    processing_time_ms: float = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DetectionResultInDB(DetectionResult):
    id: str = ""

class ScanJob(BaseModel):
    camera_id: str = "camera-1"
    status: Literal["running", "completed", "failed"]
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
    error_message: str | None = None
    detection_id: str | None = None

class ScanJobInDB(ScanJob):
    id: str = ""
