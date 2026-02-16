from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.item import Item
from app.models.reservation import Reservation
from app.models.contribution import Contribution
from app.schemas.wishlist import WishlistCreate, WishlistUpdate, WishlistResponse, WishlistPublicResponse
from app.schemas.item import ItemOwnerResponse, ItemPublicResponse
from app.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=list[WishlistResponse])
async def get_my_wishlists(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.user_id == user.id)
        .options(selectinload(Wishlist.items))
        .order_by(Wishlist.created_at.desc())
    )
    wishlists = result.scalars().all()
    return [
        WishlistResponse(
            id=w.id,
            title=w.title,
            description=w.description,
            occasion=w.occasion,
            event_date=w.event_date,
            share_token=w.share_token,
            is_active=w.is_active,
            item_count=len([i for i in w.items if not i.is_deleted]),
            created_at=w.created_at,
        )
        for w in wishlists
    ]


@router.post("", response_model=WishlistResponse, status_code=201)
async def create_wishlist(data: WishlistCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    wishlist = Wishlist(user_id=user.id, **data.model_dump())
    db.add(wishlist)
    await db.flush()
    return WishlistResponse(
        id=wishlist.id,
        title=wishlist.title,
        description=wishlist.description,
        occasion=wishlist.occasion,
        event_date=wishlist.event_date,
        share_token=wishlist.share_token,
        is_active=wishlist.is_active,
        item_count=0,
        created_at=wishlist.created_at,
    )


@router.get("/{wishlist_id}")
async def get_wishlist(wishlist_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.id == wishlist_id, Wishlist.user_id == user.id)
        .options(selectinload(Wishlist.items).selectinload(Item.reservations))
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    items_response = []
    for item in sorted(wishlist.items, key=lambda i: i.sort_order):
        if item.is_deleted:
            continue

        contrib_result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(Contribution.amount), 0), sa_func.count(Contribution.id))
            .where(Contribution.item_id == item.id)
        )
        contrib_row = contrib_result.one()
        total = contrib_row[0]
        count = contrib_row[1]
        progress = float(total / item.price * 100) if item.price and item.price > 0 else 0.0

        items_response.append(ItemOwnerResponse(
            id=item.id,
            name=item.name,
            description=item.description,
            url=item.url,
            image_url=item.image_url,
            price=item.price,
            is_group_gift=item.is_group_gift,
            sort_order=item.sort_order,
            is_reserved=len(item.reservations) > 0,
            reservation_count=len(item.reservations),
            contribution_total=total,
            contribution_count=count,
            progress_percentage=min(progress, 100.0),
            created_at=item.created_at,
        ))

    return {
        "wishlist": WishlistResponse(
            id=wishlist.id,
            title=wishlist.title,
            description=wishlist.description,
            occasion=wishlist.occasion,
            event_date=wishlist.event_date,
            share_token=wishlist.share_token,
            is_active=wishlist.is_active,
            item_count=len(items_response),
            created_at=wishlist.created_at,
        ),
        "items": items_response,
    }


@router.put("/{wishlist_id}", response_model=WishlistResponse)
async def update_wishlist(wishlist_id: UUID, data: WishlistUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.user_id == user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(wishlist, key, value)

    await db.flush()

    items_result = await db.execute(select(Item).where(Item.wishlist_id == wishlist.id, Item.is_deleted == False))
    item_count = len(items_result.scalars().all())

    return WishlistResponse(
        id=wishlist.id,
        title=wishlist.title,
        description=wishlist.description,
        occasion=wishlist.occasion,
        event_date=wishlist.event_date,
        share_token=wishlist.share_token,
        is_active=wishlist.is_active,
        item_count=item_count,
        created_at=wishlist.created_at,
    )


@router.delete("/{wishlist_id}")
async def delete_wishlist(wishlist_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.user_id == user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    await db.delete(wishlist)
    return {"message": "Wishlist deleted"}


@router.get("/public/{share_token}")
async def get_public_wishlist(share_token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.share_token == share_token)
        .options(selectinload(Wishlist.user))
        .options(selectinload(Wishlist.items).selectinload(Item.reservations))
    )
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    items_response = []
    for item in sorted(wishlist.items, key=lambda i: i.sort_order):
        if item.is_deleted:
            continue

        contrib_result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(Contribution.amount), 0), sa_func.count(Contribution.id))
            .where(Contribution.item_id == item.id)
        )
        contrib_row = contrib_result.one()
        total = contrib_row[0]
        count = contrib_row[1]
        progress = float(total / item.price * 100) if item.price and item.price > 0 else 0.0

        items_response.append(ItemPublicResponse(
            id=item.id,
            name=item.name,
            description=item.description,
            url=item.url,
            image_url=item.image_url,
            price=item.price,
            is_group_gift=item.is_group_gift,
            is_reserved=any(r.is_full_reservation for r in item.reservations),
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
            is_active=wishlist.is_active,
            created_at=wishlist.created_at,
        ),
        "items": items_response,
    }
