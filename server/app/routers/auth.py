from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..dependencies import (
    get_db,
    hash_password,
    verify_password,
)
from ..models.settings import AppSettings
from ..websocket import ws_manager

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


@router.post("/login")
async def login(request: LoginRequest, db = Depends(get_db)):
    password = request.password
    settings_doc = await db.settings.find_one({"_id": "app_settings"})
    
    if settings_doc is None:
        hashed = hash_password("stockvision")
        await db.settings.insert_one({
            "_id": "app_settings",
            "password_hash": hashed,
            "scan_interval_minutes": 10,
            "approval_required": False,
            "gemini_models": {
                "barcode_detection": "gemini-2.0-flash",
                "product_area_detection": "gemini-2.5-flash",
                "stock_evaluation": "gemini-2.5-flash"
            }
        })
        stored_hash = hashed
    else:
        stored_hash = settings_doc.get("password_hash", hash_password("stockvision"))

    if not verify_password(password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    from ..dependencies import create_token
    token = create_token()
    
    return {"token": token}