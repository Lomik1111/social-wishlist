from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.wishlist import Wishlist
from app.models.reservation import Reservation
from app.schemas.reservation import ReservationCreate, ReservationResponse, ReservationDeleteRequest
from app.dependencies import get_optional_user
from app.services.websocket_manager import ws_manager

router = APIRouter()


@router.post("/items/{item_id}/reserve", response_model=ReservationResponse, status_code=201)
async def reserve_item(
    item_id: UUID,
    data: ReservationCreate,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Item).where(Item.id == item_id, Item.is_deleted == False))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Check ownership
    wl_result = await db.execute(select(Wishlist).where(Wishlist.id == item.wishlist_id))
    wishlist = wl_result.scalar_one()
    if user and wishlist.user_id == user.id:
        raise HTTPException(status_code=403, detail="Cannot reserve your own item")

    if not user and not data.guest_name:
        raise HTTPException(status_code=400, detail="Guest name required")

    # Check if already reserved (non-group)
    if not item.is_group_gift:
        existing = await db.execute(
            select(Reservation).where(Reservation.item_id == item_id, Reservation.is_full_reservation == True)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Item already reserved")

    reservation = Reservation(
        item_id=item_id,
        user_id=user.id if user else None,
        guest_name=data.guest_name if not user else None,
        guest_identifier=data.guest_identifier if not user else None,
        is_full_reservation=not item.is_group_gift,
    )
    db.add(reservation)
    await db.flush()

    await ws_manager.broadcast(str(item.wishlist_id), {
        "type": "item_reserved",
        "item_id": str(item_id),
        "is_fully_reserved": reservation.is_full_reservation,
    })

    return ReservationResponse.model_validate(reservation)


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
        raise HTTPException(status_code=404, detail="Reservation not found")

    # Check ownership
    if user and reservation.user_id == user.id:
        pass
    elif data and data.guest_identifier and reservation.guest_identifier == data.guest_identifier:
        pass
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    item_result = await db.execute(select(Item).where(Item.id == reservation.item_id))
    item = item_result.scalar_one()
    wishlist_id = str(item.wishlist_id)

    await db.delete(reservation)
    await db.flush()

    await ws_manager.broadcast(wishlist_id, {
        "type": "item_unreserved",
        "item_id": str(item.id),
    })

    return {"message": "Reservation cancelled"}
