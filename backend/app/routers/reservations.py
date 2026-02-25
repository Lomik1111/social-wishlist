from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, update, case
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.wishlist import Wishlist
from app.models.reservation import Reservation
from app.schemas.reservation import (
    ReservationCreate, ReservationResponse, ReservationDeleteRequest,
    PurchasedUpdate, ThanksCreate,
)
from app.dependencies import get_current_user, get_optional_user
from app.services.websocket_manager import ws_manager

router = APIRouter()


@router.get("/reservations/mine")
async def get_my_reservations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Reservation)
        .where(Reservation.reserver_id == user.id)
        .options(selectinload(Reservation.item).selectinload(Item.wishlist).selectinload(Wishlist.user))
        .order_by(Reservation.created_at.desc())
    )
    reservations = result.scalars().all()
    return [
        ReservationResponse(
            id=r.id,
            item_id=r.item_id,
            reserver_id=r.reserver_id,
            guest_name=r.guest_name,
            is_anonymous=r.is_anonymous,
            is_purchased=r.is_purchased,
            purchased_at=r.purchased_at,
            thanks_sent=r.thanks_sent,
            thanks_reaction=r.thanks_reaction,
            thanks_message=r.thanks_message,
            created_at=r.created_at,
            item_name=r.item.name if r.item else None,
            item_image_url=r.item.image_url if r.item else None,
            item_price=float(r.item.price) if r.item and r.item.price else None,
            wishlist_title=r.item.wishlist.title if r.item and r.item.wishlist else None,
            owner_name=r.item.wishlist.user.full_name if r.item and r.item.wishlist and r.item.wishlist.user else None,
            owner_avatar=r.item.wishlist.user.avatar_url if r.item and r.item.wishlist and r.item.wishlist.user else None,
        )
        for r in reservations
    ]


@router.post("/items/{item_id}/reserve", response_model=ReservationResponse, status_code=201)
async def reserve_item(
    item_id: UUID,
    data: ReservationCreate,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Item).where(Item.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Подарок не найден")

    wl_result = await db.execute(select(Wishlist).where(Wishlist.id == item.wishlist_id))
    wishlist = wl_result.scalar_one()

    if not wishlist.is_active:
        raise HTTPException(status_code=400, detail="Вишлист неактивен")
    if user and wishlist.owner_id == user.id:
        raise HTTPException(status_code=403, detail="Нельзя забронировать свой подарок")
    if not user and not data.guest_name:
        raise HTTPException(status_code=400, detail="Укажите имя гостя")

    if not item.is_group_gift:
        existing = await db.execute(
            select(Reservation).where(Reservation.item_id == item_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Подарок уже забронирован")

    reservation = Reservation(
        item_id=item_id,
        reserver_id=user.id if user else None,
        guest_name=data.guest_name if not user else None,
        guest_identifier=data.guest_identifier if not user else None,
        is_anonymous=data.is_anonymous,
    )
    db.add(reservation)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Конфликт бронирования")

    # Update counter atomically
    await db.execute(
        update(Wishlist).where(Wishlist.id == item.wishlist_id)
        .values(reserved_count=Wishlist.reserved_count + 1)
    )

    await ws_manager.broadcast(str(item.wishlist_id), {
        "type": "item_reserved",
        "item_id": str(item_id),
    })

    return ReservationResponse.model_validate(reservation)


@router.patch("/reservations/{reservation_id}/purchased")
async def mark_purchased(
    reservation_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id, Reservation.reserver_id == user.id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    reservation.is_purchased = True
    reservation.purchased_at = datetime.now(timezone.utc)
    await db.flush()
    return {"message": "Отмечено как купленное"}


@router.post("/reservations/{reservation_id}/thanks")
async def send_thanks(
    reservation_id: UUID,
    data: ThanksCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
        .options(selectinload(Reservation.item))
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    # Only wishlist owner can send thanks
    item = reservation.item
    wl_result = await db.execute(select(Wishlist).where(Wishlist.id == item.wishlist_id))
    wishlist = wl_result.scalar_one()
    if wishlist.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Только владелец вишлиста может отправить благодарность")

    reservation.thanks_sent = True
    reservation.thanks_reaction = data.reaction
    reservation.thanks_message = data.message
    await db.flush()
    return {"message": "Благодарность отправлена"}


@router.delete("/reservations/{reservation_id}")
async def unreserve_item(
    reservation_id: UUID,
    data: ReservationDeleteRequest | None = None,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")

    if not (
        (user and reservation.reserver_id == user.id) or
        (data and data.guest_identifier and reservation.guest_identifier == data.guest_identifier)
    ):
        raise HTTPException(status_code=403, detail="Нет прав")

    item_result = await db.execute(select(Item).where(Item.id == reservation.item_id))
    item = item_result.scalar_one()

    await db.delete(reservation)
    await db.flush()

    # Decrement counter atomically
    await db.execute(
        update(Wishlist).where(Wishlist.id == item.wishlist_id)
        .values(reserved_count=case(
            (Wishlist.reserved_count > 0, Wishlist.reserved_count - 1),
            else_=0
        ))
    )

    await ws_manager.broadcast(str(item.wishlist_id), {
        "type": "item_unreserved",
        "item_id": str(item.id),
    })

    return {"message": "Бронирование отменено"}
