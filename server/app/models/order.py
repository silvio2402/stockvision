from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class OrderItem(BaseModel):
    item_code: str
    name: str
    order_amount: int


class Order(BaseModel):
    created_at: datetime = Field(default_factory=datetime.utcnow)

    items: list[OrderItem] = []

    status: Literal[
        "pending_approval", "approved", "declined", "ordered"
    ] = "pending_approval"
    status_updated_at: datetime | None = None

    email_sent_to: str | None = None
    email_sent_at: datetime | None = None

    notes: str | None = None


class OrderInDB(Order):
    id: str = ""
