from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class ItemCreate(BaseModel):
    name: str
    description: str | None = None
    url: str | None = None
    image_url: str | None = None
    price: Decimal | None = None
    is_group_gift: bool = False


class ItemUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    url: str | None = None
    image_url: str | None = None
    price: Decimal | None = None
    is_group_gift: bool | None = None


class ItemResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    url: str | None
    image_url: str | None
    price: Decimal | None
    is_group_gift: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ItemPublicResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    url: str | None
    image_url: str | None
    price: Decimal | None
    is_group_gift: bool
    is_reserved: bool = False
    contribution_total: Decimal = Decimal("0")
    contribution_count: int = 0
    progress_percentage: float = 0.0

    model_config = {"from_attributes": True}


class ItemOwnerResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    url: str | None
    image_url: str | None
    price: Decimal | None
    is_group_gift: bool
    sort_order: int
    is_reserved: bool = False
    reservation_count: int = 0
    contribution_total: Decimal = Decimal("0")
    contribution_count: int = 0
    progress_percentage: float = 0.0
    created_at: datetime

    model_config = {"from_attributes": True}
