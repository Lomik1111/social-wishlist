from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class ItemCreate(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    url: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    price: Decimal | None = None
    is_group_gift: bool = False
    priority: str = "nice_to_have"


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    url: str | None = Field(default=None, max_length=500)
    image_url: str | None = Field(default=None, max_length=500)
    price: Decimal | None = None
    is_group_gift: bool | None = None
    priority: str | None = None


class ItemResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    url: str | None
    image_url: str | None
    price: Decimal | None
    is_group_gift: bool
    priority: str
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
    priority: str = "nice_to_have"
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
    priority: str = "nice_to_have"
    sort_order: int
    is_reserved: bool = False
    reservation_count: int = 0
    contribution_total: Decimal = Decimal("0")
    contribution_count: int = 0
    progress_percentage: float = 0.0
    created_at: datetime

    model_config = {"from_attributes": True}
