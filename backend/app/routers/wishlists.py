from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import selectinload, joinedload
from app.database import get_db
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.item import Item
from app.models.reservation import Reservation
from app.models.contribution import Contribution
from app.models.friendship import Friendship
from app.models.wishlist_access import WishlistAccess
from app.schemas.wishlist import (
    WishlistCreate, WishlistUpdate, WishlistResponse, WishlistPublicResponse,
    WishlistPrivacyUpdate, WishlistAccessGrant,
)
from app.schemas.item import ItemResponse, ItemPublicResponse
from app.dependencies import get_current_user, get_optional_user
from app.services.websocket_manager import ws_manager

router = APIRouter()


def _build_wishlist_response(wishlist: Wishlist) -> WishlistResponse:
    return WishlistResponse.model_validate(wishlist)


async def _batch_contribution_stats(
    db: AsyncSession, item_ids: list[UUID]
) -> dict[UUID, tuple[Decimal, int]]:
    if not item_ids:
        return {}
    result = await db.execute(
        select(
            Contribution.item_id,
            sa_func.coalesce(sa_func.sum(Contribution.amount), 0),
            sa_func.count(Contribution.id),
        )
        .where(Contribution.item_id.in_(item_ids))
        .group_by(Contribution.item_id)
    )
    return {row[0]: (row[1], row[2]) for row in result.all()}


@router.get("", response_model=list[WishlistResponse])
async def get_my_wishlists(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.owner_id == user.id)
        .order_by(Wishlist.created_at.desc())
    )
    return [_build_wishlist_response(w) for w in result.scalars().all()]


@router.post("", response_model=WishlistResponse, status_code=201)
async def create_wishlist(data: WishlistCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    wishlist = Wishlist(owner_id=user.id, **data.model_dump())
    db.add(wishlist)
    await db.flush()
    return _build_wishlist_response(wishlist)


@router.get("/friends")
async def get_friends_wishlists(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get wishlists from friends (feed)."""
    friend_ids_q = select(Friendship.addressee_id).where(
        Friendship.requester_id == user.id, Friendship.status == "accepted"
    ).union(
        select(Friendship.requester_id).where(
            Friendship.addressee_id == user.id, Friendship.status == "accepted"
        )
    )
    result = await db.execute(
        select(Wishlist)
        .where(
            Wishlist.owner_id.in_(friend_ids_q),
            Wishlist.is_active == True,
            Wishlist.privacy.in_(["public", "friends"]),
        )
        .options(joinedload(Wishlist.user))
        .order_by(Wishlist.updated_at.desc())
        .limit(50)
    )
    wishlists = result.scalars().all()
    return [
        {
            **_build_wishlist_response(w).model_dump(),
            "owner_name": w.user.full_name if w.user else None,
            "owner_username": w.user.username if w.user else None,
            "owner_avatar": w.user.avatar_url if w.user else None,
        }
        for w in wishlists
    ]


@router.get("/{wishlist_id}")
async def get_wishlist(wishlist_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id)
        .options(selectinload(Wishlist.items).selectinload(Item.reservations))
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Вишлист не найден")

    active_items = sorted(wishlist.items, key=lambda i: i.sort_order)
    active_item_ids = [i.id for i in active_items]
    contrib_stats = await _batch_contribution_stats(db, active_item_ids)

    items_response = []
    for item in active_items:
        total, count = contrib_stats.get(item.id, (Decimal(0), 0))
        progress = float(total / item.price * 100) if item.price and item.price > 0 else 0.0
        items_response.append(ItemResponse(
            id=item.id,
            wishlist_id=item.wishlist_id,
            name=item.name,
            description=item.description,
            url=item.url,
            image_url=item.image_url,
            price=item.price,
            currency=item.currency,
            source_domain=item.source_domain,
            is_group_gift=item.is_group_gift,
            priority=item.priority,
            sort_order=item.sort_order,
            is_liked_by_owner=item.is_liked_by_owner,
            is_reserved=len(item.reservations) > 0,
            reservation_count=len(item.reservations),
            contribution_total=total,
            contribution_count=count,
            progress_percentage=min(progress, 100.0),
            created_at=item.created_at,
        ))

    # Update denormalized counters
    wishlist.item_count = len(active_items)
    wishlist.reserved_count = sum(1 for i in active_items if len(i.reservations) > 0)

    return {
        "wishlist": _build_wishlist_response(wishlist),
        "items": items_response,
    }


@router.put("/{wishlist_id}", response_model=WishlistResponse)
async def update_wishlist(wishlist_id: UUID, data: WishlistUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Вишлист не найден")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(wishlist, key, value)
    await db.flush()
    return _build_wishlist_response(wishlist)


@router.patch("/{wishlist_id}/privacy", response_model=WishlistResponse)
async def update_privacy(wishlist_id: UUID, data: WishlistPrivacyUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Вишлист не найден")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(wishlist, key, value)
    await db.flush()
    return _build_wishlist_response(wishlist)


@router.post("/{wishlist_id}/access")
async def grant_access(wishlist_id: UUID, data: WishlistAccessGrant, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Вишлист не найден")

    access = WishlistAccess(wishlist_id=wishlist_id, user_id=data.user_id)
    db.add(access)
    await db.flush()
    return {"message": "Доступ предоставлен"}


@router.delete("/{wishlist_id}/access/{target_user_id}")
async def revoke_access(wishlist_id: UUID, target_user_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Вишлист не найден")

    result = await db.execute(
        select(WishlistAccess).where(WishlistAccess.wishlist_id == wishlist_id, WishlistAccess.user_id == target_user_id)
    )
    access = result.scalar_one_or_none()
    if access:
        await db.delete(access)
    return {"message": "Доступ отозван"}


@router.delete("/{wishlist_id}")
async def delete_wishlist(wishlist_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Вишлист не найден")
    await db.delete(wishlist)
    await ws_manager.broadcast(str(wishlist_id), {"type": "wishlist_deleted", "wishlist_id": str(wishlist_id)})
    return {"message": "Вишлист удалён"}


@router.get("/public/{share_token}")
async def get_public_wishlist(share_token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.share_token == share_token)
        .options(joinedload(Wishlist.user))
        .options(selectinload(Wishlist.items).selectinload(Item.reservations))
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Вишлист не найден")

    active_items = sorted(wishlist.items, key=lambda i: i.sort_order)
    active_item_ids = [i.id for i in active_items]
    contrib_stats = await _batch_contribution_stats(db, active_item_ids)

    items_response = []
    for item in active_items:
        total, count = contrib_stats.get(item.id, (Decimal(0), 0))
        progress = float(total / item.price * 100) if item.price and item.price > 0 else 0.0
        reserver_name = None
        if item.reservations and not wishlist.anonymous_reservations:
            r = item.reservations[0]
            reserver_name = r.guest_name
        items_response.append(ItemPublicResponse(
            id=item.id,
            name=item.name,
            description=item.description,
            url=item.url,
            image_url=item.image_url,
            price=item.price if wishlist.show_prices else None,
            currency=item.currency,
            source_domain=item.source_domain,
            is_group_gift=item.is_group_gift,
            priority=item.priority,
            is_reserved=len(item.reservations) > 0,
            reserver_name=reserver_name,
            contribution_total=total,
            contribution_count=count,
            progress_percentage=min(progress, 100.0),
        ))

    return {
        "wishlist": WishlistPublicResponse(
            id=wishlist.id,
            title=wishlist.title,
            description=wishlist.description,
            occasion=wishlist.occasion,
            event_date=wishlist.event_date,
            owner_name=wishlist.user.full_name if wishlist.user else None,
            owner_username=wishlist.user.username if wishlist.user else None,
            owner_avatar=wishlist.user.avatar_url if wishlist.user else None,
            is_active=wishlist.is_active,
            theme=wishlist.theme,
            cover_image_url=wishlist.cover_image_url,
            show_prices=wishlist.show_prices,
            item_count=len(active_items),
            reserved_count=sum(1 for i in active_items if len(i.reservations) > 0),
            created_at=wishlist.created_at,
        ),
        "items": items_response,
    }
