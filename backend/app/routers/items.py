from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.dependencies import get_current_user
from app.services.websocket_manager import ws_manager


class ReorderRequest(BaseModel):
    item_ids: list[UUID]

router = APIRouter()


@router.post("/wishlists/{wishlist_id}/items", response_model=ItemResponse, status_code=201)
async def create_item(
    wishlist_id: UUID,
    data: ItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Вишлист не найден")

    max_order = await db.execute(
        select(Item.sort_order).where(Item.wishlist_id == wishlist_id).order_by(Item.sort_order.desc()).limit(1)
    )
    max_val = max_order.scalar_one_or_none() or 0

    item = Item(wishlist_id=wishlist_id, sort_order=max_val + 1, **data.model_dump())
    db.add(item)
    await db.flush()

    # Update counter
    wishlist.item_count = wishlist.item_count + 1

    await ws_manager.broadcast(str(wishlist_id), {
        "type": "item_added",
        "item": {"id": str(item.id), "name": item.name},
    })

    return ItemResponse.model_validate(item)


@router.put("/items/{item_id}", response_model=ItemResponse)
async def update_item(
    item_id: UUID,
    data: ItemUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Item).join(Wishlist).where(Item.id == item_id, Wishlist.owner_id == user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Подарок не найден")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await db.flush()

    await ws_manager.broadcast(str(item.wishlist_id), {
        "type": "item_updated",
        "item": {"id": str(item.id), "name": item.name},
    })

    return ItemResponse.model_validate(item)


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Item).join(Wishlist).where(Item.id == item_id, Wishlist.owner_id == user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Подарок не найден")

    wishlist_id = item.wishlist_id
    await db.delete(item)
    await db.flush()

    # Update counter
    wl = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id))
    wishlist = wl.scalar_one_or_none()
    if wishlist:
        wishlist.item_count = max(0, wishlist.item_count - 1)

    await ws_manager.broadcast(str(wishlist_id), {
        "type": "item_deleted",
        "item_id": str(item_id),
    })

    return {"message": "Подарок удалён"}


@router.put("/wishlists/{wishlist_id}/items/reorder")
async def reorder_items(
    wishlist_id: UUID,
    data: ReorderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_id == user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Вишлист не найден")

    items_result = await db.execute(
        select(Item).where(Item.wishlist_id == wishlist_id)
    )
    items_map = {item.id: item for item in items_result.scalars().all()}

    for idx, item_id in enumerate(data.item_ids):
        item = items_map.get(item_id)
        if not item:
            raise HTTPException(status_code=400, detail=f"Подарок {item_id} не найден в этом вишлисте")
        item.sort_order = idx

    await db.flush()
    await ws_manager.broadcast(str(wishlist_id), {
        "type": "items_reordered",
        "item_ids": [str(i) for i in data.item_ids],
    })
    return {"message": "Порядок обновлён"}
