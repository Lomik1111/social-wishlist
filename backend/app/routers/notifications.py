from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import NotificationResponse
from app.dependencies import get_current_user

router = APIRouter()

TYPE_FILTERS = {
    "gifts": ["item_reserved", "item_added", "contribution_added"],
    "friends": ["friend_request", "friend_accepted"],
    "likes": ["item_liked"],
}


@router.get("")
async def get_notifications(
    type: str = Query("all"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification).where(Notification.recipient_id == user.id)

    if type != "all" and type in TYPE_FILTERS:
        query = query.where(Notification.type.in_(TYPE_FILTERS[type]))

    query = query.order_by(Notification.created_at.desc()).limit(100)
    result = await db.execute(query)
    notifications = result.scalars().all()

    # Fetch sender info
    sender_ids = [n.sender_id for n in notifications if n.sender_id]
    senders = {}
    if sender_ids:
        from app.models.user import User as UserModel
        sender_result = await db.execute(select(UserModel).where(UserModel.id.in_(sender_ids)))
        senders = {u.id: u for u in sender_result.scalars().all()}

    return [
        NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            body=n.body,
            data=n.data or {},
            is_read=n.is_read,
            sender_name=senders[n.sender_id].full_name if n.sender_id in senders else None,
            sender_username=senders[n.sender_id].username if n.sender_id in senders else None,
            sender_avatar=senders[n.sender_id].avatar_url if n.sender_id in senders else None,
            created_at=n.created_at,
        )
        for n in notifications
    ]


@router.post("/read-all")
async def mark_all_read(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification)
        .where(Notification.recipient_id == user.id, Notification.is_read == False)
        .values(is_read=True)
    )
    return {"message": "Все отмечены как прочитанные"}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.recipient_id == user.id)
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Уведомление не найдено")
    await db.delete(notification)
    return {"message": "Уведомление удалено"}
