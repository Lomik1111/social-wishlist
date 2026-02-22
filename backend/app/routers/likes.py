from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.item_like import ItemLike
from app.models.wishlist import Wishlist
from app.models.notification import Notification
from app.schemas.item import ItemResponse
from app.dependencies import get_current_user
from app.services.push import send_push_to_user

router = APIRouter()


@router.post("/items/{item_id}/like", status_code=201)
async def like_item(item_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Подарок не найден")

    existing = await db.execute(
        select(ItemLike).where(ItemLike.item_id == item_id, ItemLike.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Уже лайкнуто")

    like = ItemLike(item_id=item_id, user_id=user.id)
    db.add(like)

    # Notify wishlist owner
    wl_result = await db.execute(select(Wishlist).where(Wishlist.id == item.wishlist_id))
    wishlist = wl_result.scalar_one()
    if wishlist.owner_id != user.id:
        notification = Notification(
            recipient_id=wishlist.owner_id,
            sender_id=user.id,
            type="item_liked",
            title="Лайк",
            body=f"{user.full_name or user.username or 'Кто-то'} лайкнул «{item.name}»",
            data={"item_id": str(item_id), "wishlist_id": str(wishlist.id)},
        )
        db.add(notification)
        await send_push_to_user(db, wishlist.owner_id, "Лайк",
            f"{user.full_name or user.username or 'Кто-то'} лайкнул «{item.name}»")

    await db.flush()
    return {"message": "Лайк добавлен"}


@router.delete("/items/{item_id}/like")
async def unlike_item(item_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ItemLike).where(ItemLike.item_id == item_id, ItemLike.user_id == user.id)
    )
    like = result.scalar_one_or_none()
    if not like:
        raise HTTPException(status_code=404, detail="Лайк не найден")

    await db.delete(like)
    return {"message": "Лайк убран"}


@router.get("/items/liked")
async def get_liked_items(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Item)
        .join(ItemLike, ItemLike.item_id == Item.id)
        .where(ItemLike.user_id == user.id)
        .options(selectinload(Item.wishlist))
        .order_by(ItemLike.created_at.desc())
    )
    items = result.scalars().all()
    return [
        {
            "id": str(item.id),
            "name": item.name,
            "description": item.description,
            "image_url": item.image_url,
            "price": float(item.price) if item.price else None,
            "currency": item.currency,
            "source_domain": item.source_domain,
            "wishlist_title": item.wishlist.title if item.wishlist else None,
            "wishlist_id": str(item.wishlist_id),
        }
        for item in items
    ]
