from pydantic import BaseModel
from pydantic_settings import BaseSettings


class GeminiModels(BaseModel):
    barcode_detection: str = "gemini-3-flash-preview"
    product_area_detection: str = "gemini-3-flash-preview"
    stock_evaluation: str = "gemini-3-flash-preview"


class Settings(BaseSettings):
    # Gemini
    gemini_api_key: str = ""
    gemini_models: GeminiModels = GeminiModels()

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "stockvision"

    # ERP (Make.com webhooks)
    erp_product_url: str = ""
    erp_products_list_url: str = ""

    # SMTP defaults (overridden by DB settings)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    order_email: str = ""

    # Auth
    app_password: str = "stockvision"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    # Storage
    image_storage_path: str = "./data/images"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()