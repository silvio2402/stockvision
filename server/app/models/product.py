from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, computed_field, model_validator, AliasChoices


class BoundingBox(BaseModel):
    """Bounding box coordinates in Gemini format: [ymin, xmin, ymax, xmax]
    Coordinates are normalized to 0-1000 coordinate system.
    Supports both internal format and x, y, width, height format from Gemini.
    """

    ymin: float = Field(validation_alias=AliasChoices("ymin", "y"))
    xmin: float = Field(validation_alias=AliasChoices("xmin", "x"))
    ymax: float = Field(validation_alias=AliasChoices("ymax"))
    xmax: float = Field(validation_alias=AliasChoices("xmax"))

    @model_validator(mode="before")
    @classmethod
    def handle_xywh(cls, data):
        if isinstance(data, dict):
            # Gemini 2.0+ sometimes returns x, y, width, height
            if "width" in data and "height" in data:
                if "ymax" not in data and "y" in data:
                    data["ymax"] = data["y"] + data["height"]
                if "xmax" not in data and "x" in data:
                    data["xmax"] = data["x"] + data["width"]

            if "ymin" not in data and "y" in data:
                data["ymin"] = data["y"]
            if "xmin" not in data and "x" in data:
                data["xmin"] = data["x"]
        return data


ProductStatus = Literal[
    "in_stock", "running_out", "unconfigured", "unknown", "not_detected"
]
DataSource = Literal["erp", "sample", "manual", "unknown"]


class ProductData(BaseModel):
    """Product data stored in MongoDB."""

    item_code: str
    name: str = ""
    description: str | None = None
    barcode_value: str | None = None

    # Source tracking
    data_source: DataSource | None = None
    main_supplier: str | None = None
    generated_name: str | None = None

    # User-configured
    running_out_condition: str | None = None
    order_amount: int | None = None

    # Detection state
    current_status: ProductStatus = "not_detected"
    last_detected_at: datetime | None = None
    last_bounding_box: BoundingBox | None = None
    last_ai_reasoning: str | None = None

    # Review
    needs_review: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @computed_field
    @property
    def is_configured(self) -> bool:
        return (
            self.running_out_condition is not None and self.order_amount is not None
        )


class ProductUpdate(BaseModel):
    """Fields that can be updated by the user."""

    running_out_condition: str | None = None
    order_amount: int | None = None
    name: str | None = None
    description: str | None = None
    needs_review: bool | None = None


class ProductStatusUpdate(BaseModel):
    """Fields updated by the detection pipeline."""

    current_status: ProductStatus
    last_detected_at: datetime | None = None
    last_bounding_box: BoundingBox | None = None
    last_ai_reasoning: str | None = None
