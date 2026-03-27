from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "stockvision"

    # Gemini
    gemini_api_key: str = ""

    # ERP (Make.com webhooks)
    erp_product_url: str = "https://hook.eu1.make.celonis.com/79j69cp1aesv98zwozwgpduz86hk71rr"
    erp_products_list_url: str = "https://hook.eu1.make.celonis.com/2dkavnxbe1o4rns7k75r1ej9yqflfa7x"

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
