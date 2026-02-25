import logging
from uuid import UUID
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.wishlist import Wishlist
from app.models.wishlist_access import WishlistAccess
from app.models.friendship import Friendship
from app.services.websocket_manager import ws_manager
from app.utils.security import decode_token

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/{wishlist_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    wishlist_id: UUID,
    token: str | None = Query(default=None),
    share_token: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    # 1. Fetch wishlist and check existence
    result = await db.execute(
        select(Wishlist).where(Wishlist.id == wishlist_id)
    )
    wishlist = result.scalar_one_or_none()

    if not wishlist:
        await websocket.close(code=4004, reason="Wishlist not found")
        return

    # 2. Check authorization
    is_authorized = False

    # A. Public wishlist
    if wishlist.privacy == "public":
        is_authorized = True

    # B. Share token access
    elif share_token and wishlist.share_token == share_token:
        is_authorized = True

    # C. Authenticated user access
    elif token:
        payload = decode_token(token)
        if payload and payload.get("type") == "access":
            user_id_str = payload.get("sub")
            if user_id_str:
                user_id = UUID(user_id_str)

                # Owner
                if wishlist.owner_id == user_id:
                    is_authorized = True
                else:
                    # Explicit access
                    access_result = await db.execute(
                        select(WishlistAccess).where(
                            WishlistAccess.wishlist_id == wishlist_id,
                            WishlistAccess.user_id == user_id
                        )
                    )
                    if access_result.scalar_one_or_none():
                        is_authorized = True

                    # Friends access
                    elif wishlist.privacy == "friends":
                        friend_result = await db.execute(
                            select(Friendship).where(
                                (Friendship.status == "accepted") & (
                                    ((Friendship.requester_id == wishlist.owner_id) & (Friendship.addressee_id == user_id)) |
                                    ((Friendship.requester_id == user_id) & (Friendship.addressee_id == wishlist.owner_id))
                                )
                            )
                        )
                        if friend_result.scalar_one_or_none():
                            is_authorized = True

    if not is_authorized:
        await websocket.close(code=4003, reason="Access denied")
        return

    await ws_manager.connect(websocket, str(wishlist_id))
    try:
        while True:
            data = await websocket.receive_text()
            if data == '{"type":"ping"}':
                await ws_manager.send_personal(websocket, {"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, str(wishlist_id))
