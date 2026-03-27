from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from ..dependencies import get_current_user, get_db
from ..models.detection import DetectionResultInDB

router = APIRouter(prefix="/api/detections", tags=["detections"])


@router.get("", response_model=list[DetectionResultInDB])
async def list_detections(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    cursor = db.detections.find().sort("created_at", -1).skip(offset).limit(limit)
    detections = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        detections.append(DetectionResultInDB(**doc))
    return detections


@router.get("/latest", response_model=DetectionResultInDB)
async def get_latest_detection(
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    doc = await db.detections.find_one(sort=[("created_at", -1)])
    if doc is None:
        raise HTTPException(status_code=404, detail="No detections found")
    doc["id"] = str(doc["_id"])
    return DetectionResultInDB(**doc)


@router.get("/{detection_id}", response_model=DetectionResultInDB)
async def get_detection(
    detection_id: str,
    user: str = Depends(get_current_user),
    db = Depends(get_db),
):
    from bson import ObjectId
    try:
        object_id = ObjectId(detection_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid detection ID")

    doc = await db.detections.find_one({"_id": object_id})
    if doc is None:
        raise HTTPException(status_code=404, detail="Detection not found")
    doc["id"] = str(doc["_id"])
    return DetectionResultInDB(**doc)