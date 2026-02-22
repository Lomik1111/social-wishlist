from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from app.database import get_db
from app.models.user import User
from app.models.friendship import Friendship
from app.models.notification import Notification
from app.schemas.friendship import FriendshipResponse, FriendRequestResponse
from app.dependencies import get_current_user
from app.services.push import send_push_to_user

router = APIRouter()


@router.get("")
async def get_friends(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == user.id, Friendship.status == "accepted"),
                and_(Friendship.addressee_id == user.id, Friendship.status == "accepted"),
            )
        )
    )
    friendships = result.scalars().all()

    friend_ids = []
    for f in friendships:
        friend_ids.append(f.addressee_id if f.requester_id == user.id else f.requester_id)

    if not friend_ids:
        return []

    users_result = await db.execute(select(User).where(User.id.in_(friend_ids)))
    friends = users_result.scalars().all()

    return [
        FriendshipResponse(
            id=f.id,
            user_id=u.id,
            full_name=u.full_name,
            username=u.username,
            avatar_url=u.avatar_url,
            is_online=u.is_online,
            status="accepted",
        )
        for u in friends
        for f in friendships
        if (f.requester_id == u.id or f.addressee_id == u.id) and u.id != user.id
    ]


@router.get("/requests")
async def get_friend_requests(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Friendship)
        .where(Friendship.addressee_id == user.id, Friendship.status == "pending")
        .order_by(Friendship.created_at.desc())
    )
    friendships = result.scalars().all()

    if not friendships:
        return []

    requester_ids = [f.requester_id for f in friendships]
    users_result = await db.execute(select(User).where(User.id.in_(requester_ids)))
    users_map = {u.id: u for u in users_result.scalars().all()}

    return [
        FriendRequestResponse(
            id=f.id,
            requester_id=f.requester_id,
            requester_name=users_map[f.requester_id].full_name if f.requester_id in users_map else None,
            requester_username=users_map[f.requester_id].username if f.requester_id in users_map else None,
            requester_avatar=users_map[f.requester_id].avatar_url if f.requester_id in users_map else None,
            created_at=f.created_at,
        )
        for f in friendships
    ]


@router.post("/request/{target_user_id}", status_code=201)
async def send_friend_request(target_user_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if target_user_id == user.id:
        raise HTTPException(status_code=400, detail="Нельзя добавить себя в друзья")

    target = await db.execute(select(User).where(User.id == target_user_id))
    if not target.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    existing = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == user.id, Friendship.addressee_id == target_user_id),
                and_(Friendship.requester_id == target_user_id, Friendship.addressee_id == user.id),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Запрос уже существует")

    friendship = Friendship(requester_id=user.id, addressee_id=target_user_id)
    db.add(friendship)

    notification = Notification(
        recipient_id=target_user_id,
        sender_id=user.id,
        type="friend_request",
        title="Запрос в друзья",
        body=f"{user.full_name or user.username or 'Кто-то'} хочет добавить вас в друзья",
        data={"friendship_id": str(friendship.id)},
    )
    db.add(notification)
    await db.flush()

    await send_push_to_user(db, target_user_id, "Запрос в друзья",
        f"{user.full_name or user.username or 'Кто-то'} хочет добавить вас в друзья")

    return {"message": "Запрос отправлен"}


@router.post("/accept/{target_user_id}")
async def accept_friend_request(target_user_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Friendship).where(
            Friendship.requester_id == target_user_id,
            Friendship.addressee_id == user.id,
            Friendship.status == "pending",
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Запрос не найден")

    friendship.status = "accepted"

    notification = Notification(
        recipient_id=target_user_id,
        sender_id=user.id,
        type="friend_accepted",
        title="Запрос принят",
        body=f"{user.full_name or user.username or 'Кто-то'} принял ваш запрос в друзья",
    )
    db.add(notification)
    await db.flush()

    await send_push_to_user(db, target_user_id, "Запрос принят",
        f"{user.full_name or user.username or 'Кто-то'} принял ваш запрос в друзья")

    return {"message": "Запрос принят"}


@router.delete("/{target_user_id}")
async def remove_friend(target_user_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.requester_id == user.id, Friendship.addressee_id == target_user_id),
                and_(Friendship.requester_id == target_user_id, Friendship.addressee_id == user.id),
            )
        )
    )
    friendship = result.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Дружба не найдена")

    await db.delete(friendship)
    return {"message": "Удалено из друзей"}
