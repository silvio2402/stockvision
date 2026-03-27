from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class ProductData(BaseModel):
    """Full product data merged from ERP + MongoDB."""

    item_code: str
    name: str = ""
    description: str | None = None
    barcode_value: str = ""

    # User-configured
    running_out_condition: str | None = None
    order_amount: int | None = None

    # Detection state
    current_status: Literal[
        "in_stock", "running_out", "unknown", "not_detected"
    ] = "not_detected"
    last_detected_at: datetime | None = None
    last_bounding_box: BoundingBox | None = None
    last_ai_reasoning: str | None = None

    # Review
    needs_review: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProductUpdate(BaseModel):
    """Fields that can be updated by the user."""

    running_out_condition: str | None = None
    order_amount: int | None = None
    name: str | None = None
    description: str | None = None
    needs_review: bool | None = None


class ProductStatusUpdate(BaseModel):
    """Fields updated by the detection pipeline."""

    current_status: Literal["in_stock", "running_out", "unknown", "not_detected"]
    last_detected_at: datetime | None = None
    last_bounding_box: BoundingBox | None = None
    last_ai_reasoning: str | None = None
