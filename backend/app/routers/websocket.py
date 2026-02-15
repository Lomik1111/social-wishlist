from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import ws_manager

router = APIRouter()


@router.websocket("/ws/{wishlist_id}")
async def websocket_endpoint(websocket: WebSocket, wishlist_id: str):
    await ws_manager.connect(websocket, wishlist_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == '{"type":"ping"}':
                await ws_manager.send_personal(websocket, {"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, wishlist_id)
