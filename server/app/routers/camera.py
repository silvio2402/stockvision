import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..config import settings
from ..dependencies import get_current_user
from ..services.detection.pipeline import run_detection_pipeline

router = APIRouter(prefix="/api/camera", tags=["camera"])


@router.post("/capture")
async def capture_image(
    image: Annotated[UploadFile, File()],
    camera_id: Annotated[str, Form()] = "camera-1",
    user: str = Depends(get_current_user),
):
    storage_path = Path(settings.image_storage_path)
    storage_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{camera_id}_{timestamp}.jpg"
    file_path = storage_path / filename

    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(image.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {e}")

    detection_id = await run_detection_pipeline(str(file_path), camera_id)

    return {"detection_id": detection_id, "image_path": filename}


@router.post("/scan")
async def trigger_scan(
    camera_id: str = "camera-1",
    user: str = Depends(get_current_user),
):
    from ..services.detection.pipeline import run_scan
    
    return await run_scan(camera_id)