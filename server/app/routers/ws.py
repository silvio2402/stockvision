from typing import Annotated

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketException, status

from ..dependencies import get_current_user, verify_token
from ..websocket import ws_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    try:
        verify_token(token)
    except Exception:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION)

    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        ws_manager.disconnect(websocket)