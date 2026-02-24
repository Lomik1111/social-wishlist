import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_manager import ws_manager
from app.utils.security import decode_token

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/{wishlist_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    wishlist_id: str,
    token: str | None = Query(default=None),
):
    # Validate token if provided
    _user_id: str | None = None  # Reserved for future per-user WS features
    if token:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token")
            return
        _user_id = payload.get("sub")

    await ws_manager.connect(websocket, wishlist_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == '{"type":"ping"}':
                await ws_manager.send_personal(websocket, {"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, wishlist_id)
