from pydantic import BaseModel
from uuid import UUID
from datetime import datetime, date


class WishlistCreate(BaseModel):
    title: str
    description: str | None = None
    occasion: str | None = None
    event_date: date | None = None


class WishlistUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    occasion: str | None = None
    event_date: date | None = None
    is_active: bool | None = None


class WishlistResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    occasion: str | None
    event_date: date | None
    share_token: str
    is_active: bool
    item_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class WishlistPublicResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    occasion: str | None
    event_date: date | None
    owner_name: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
