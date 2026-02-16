from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func
from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.wishlist import Wishlist
from app.models.contribution import Contribution
from app.schemas.contribution import ContributionCreate, ContributionResponse, ContributionDeleteRequest
from app.dependencies import get_optional_user
from app.services.websocket_manager import ws_manager

router = APIRouter()


@router.post("/items/{item_id}/contribute", response_model=ContributionResponse, status_code=201)
async def contribute(
    item_id: UUID,
    data: ContributionCreate,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Item).where(Item.id == item_id, Item.is_deleted == False))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if not item.is_group_gift:
        raise HTTPException(status_code=400, detail="Item is not a group gift")

    wl_result = await db.execute(select(Wishlist).where(Wishlist.id == item.wishlist_id))
    wishlist = wl_result.scalar_one()

    if not wishlist.is_active:
        raise HTTPException(status_code=400, detail="Wishlist is not active")

    if user and wishlist.user_id == user.id:
        raise HTTPException(status_code=403, detail="Cannot contribute to your own item")

    if not user and not data.guest_name:
        raise HTTPException(status_code=400, detail="Guest name required")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    # Cap contribution to remaining amount if item has a price
    if item.price and item.price > 0:
        existing_total_result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(Contribution.amount), 0))
            .where(Contribution.item_id == item_id)
        )
        existing_total = existing_total_result.scalar_one()
        remaining = item.price - existing_total
        if remaining <= 0:
            raise HTTPException(status_code=400, detail="Item is already fully funded")
        if data.amount > remaining:
            data.amount = remaining

    contribution = Contribution(
        item_id=item_id,
        user_id=user.id if user else None,
        guest_name=data.guest_name if not user else None,
        guest_identifier=data.guest_identifier if not user else None,
        amount=data.amount,
        message=data.message,
    )
    db.add(contribution)
    await db.flush()

    # Get updated totals
    totals = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Contribution.amount), 0), sa_func.count(Contribution.id))
        .where(Contribution.item_id == item_id)
    )
    row = totals.one()
    new_total = float(row[0])
    count = row[1]
    progress = (new_total / float(item.price) * 100) if item.price and item.price > 0 else 0.0

    await ws_manager.broadcast(str(item.wishlist_id), {
        "type": "contribution_added",
        "item_id": str(item_id),
        "new_total": new_total,
        "progress_percentage": min(progress, 100.0),
        "contribution_count": count,
    })

    return ContributionResponse.model_validate(contribution)


@router.delete("/contributions/{contribution_id}")
async def remove_contribution(
    contribution_id: UUID,
    data: ContributionDeleteRequest | None = None,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Contribution).where(Contribution.id == contribution_id))
    contribution = result.scalar_one_or_none()
    if not contribution:
        raise HTTPException(status_code=404, detail="Contribution not found")

    if user and contribution.user_id == user.id:
        pass
    elif data and data.guest_identifier and contribution.guest_identifier == data.guest_identifier:
        pass
    else:
        raise HTTPException(status_code=403, detail="Not authorized")

    item_result = await db.execute(select(Item).where(Item.id == contribution.item_id))
    item = item_result.scalar_one()

    await db.delete(contribution)
    await db.flush()

    totals = await db.execute(
        select(sa_func.coalesce(sa_func.sum(Contribution.amount), 0), sa_func.count(Contribution.id))
        .where(Contribution.item_id == item.id)
    )
    row = totals.one()
    new_total = float(row[0])
    count = row[1]
    progress = (new_total / float(item.price) * 100) if item.price and item.price > 0 else 0.0

    await ws_manager.broadcast(str(item.wishlist_id), {
        "type": "contribution_removed",
        "item_id": str(item.id),
        "new_total": new_total,
        "progress_percentage": min(progress, 100.0),
        "contribution_count": count,
    })

    return {"message": "Contribution removed"}
