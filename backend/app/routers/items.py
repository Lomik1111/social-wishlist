from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.wishlist import Wishlist
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate, ItemResponse
from app.dependencies import get_current_user
from app.services.websocket_manager import ws_manager

router = APIRouter()


@router.post("/wishlists/{wishlist_id}/items", response_model=ItemResponse, status_code=201)
async def create_item(
    wishlist_id: UUID,
    data: ItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.user_id == user.id))
    wishlist = result.scalar_one_or_none()
    if not wishlist:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    max_order = await db.execute(
        select(Item.sort_order).where(Item.wishlist_id == wishlist_id).order_by(Item.sort_order.desc()).limit(1)
    )
    max_val = max_order.scalar_one_or_none() or 0

    item = Item(wishlist_id=wishlist_id, sort_order=max_val + 1, **data.model_dump())
    db.add(item)
    await db.flush()

    await ws_manager.broadcast(str(wishlist_id), {
        "type": "item_added",
        "item": {
            "id": str(item.id),
            "name": item.name,
            "description": item.description,
            "url": item.url,
            "image_url": item.image_url,
            "price": str(item.price) if item.price else None,
            "is_group_gift": item.is_group_gift,
            "sort_order": item.sort_order,
        },
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
        select(Item).join(Wishlist).where(Item.id == item_id, Wishlist.user_id == user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    await db.flush()

    await ws_manager.broadcast(str(item.wishlist_id), {
        "type": "item_updated",
        "item": {
            "id": str(item.id),
            "name": item.name,
            "description": item.description,
            "url": item.url,
            "image_url": item.image_url,
            "price": str(item.price) if item.price else None,
            "is_group_gift": item.is_group_gift,
            "sort_order": item.sort_order,
        },
    })

    return ItemResponse.model_validate(item)


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Item).join(Wishlist).where(Item.id == item_id, Wishlist.user_id == user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.is_deleted = True
    await db.flush()

    await ws_manager.broadcast(str(item.wishlist_id), {
        "type": "item_deleted",
        "item_id": str(item.id),
    })

    return {"message": "Item deleted"}
