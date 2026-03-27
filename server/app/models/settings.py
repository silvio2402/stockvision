from pydantic import BaseModel


class GeminiModels(BaseModel):
    barcode_detection: str = "gemini-2.0-flash"
    product_area_detection: str = "gemini-2.5-flash"
    stock_evaluation: str = "gemini-2.5-flash"


class AppSettings(BaseModel):
    scan_interval_minutes: int = 10
    approval_required: bool = False
    order_email: str = ""

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    password_hash: str = ""

    gemini_models: GeminiModels = GeminiModels()


class AppSettingsUpdate(BaseModel):
    scan_interval_minutes: int | None = None
    approval_required: bool | None = None
    order_email: str | None = None

    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_password: str | None = None

    gemini_models: GeminiModels | None = None


class AppSettingsResponse(BaseModel):
    """Settings response — excludes sensitive fields."""

    scan_interval_minutes: int = 10
    approval_required: bool = False
    order_email: str = ""

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    # smtp_password excluded

    gemini_models: GeminiModels = GeminiModels()
