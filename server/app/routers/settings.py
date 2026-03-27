from typing import Annotated

from fastapi import APIRouter, Depends

from ..dependencies import get_current_user, get_db, hash_password
from ..models.settings import AppSettingsResponse, AppSettingsUpdate, GeminiModels

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=AppSettingsResponse)
async def get_settings(
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    doc = await db.settings.find_one({"_id": "app_settings"})
    if doc is None:
        doc = {
            "_id": "app_settings",
            "scan_interval_minutes": 10,
            "approval_required": False,
            "order_email": "",
            "smtp_host": "",
            "smtp_port": 587,
            "smtp_user": "",
            "gemini_models": {
                "barcode_detection": "gemini-3-flash-preview",
                "product_area_detection": "gemini-3-flash-preview",
                "stock_evaluation": "gemini-3-flash-preview"
            }
        }
        await db.settings.insert_one(doc)

    return AppSettingsResponse(
        scan_interval_minutes=doc.get("scan_interval_minutes", 10),
        approval_required=doc.get("approval_required", False),
        order_email=doc.get("order_email", ""),
        smtp_host=doc.get("smtp_host", ""),
        smtp_port=doc.get("smtp_port", 587),
        smtp_user=doc.get("smtp_user", ""),
        gemini_models=GeminiModels(**doc.get("gemini_models", {}))
    )


@router.put("")
async def update_settings(
    update: AppSettingsUpdate,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    doc = await db.settings.find_one({"_id": "app_settings"})
    if doc is None:
        doc = {"_id": "app_settings"}

    update_dict = update.model_dump(exclude_unset=True, exclude_none=True)

    if "password_hash" in update_dict:
        del update_dict["password_hash"]

    if update_dict.get("gemini_models") is None:
        del update_dict["gemini_models"]

    if update_dict:
        await db.settings.update_one(
            {"_id": "app_settings"},
            {"$set": update_dict},
            upsert=True
        )

    return await get_settings(user, db)