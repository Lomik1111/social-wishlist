from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ItemCreate(BaseModel):
    name: str = Field(max_length=500)
    description: Optional[str] = Field(default=None, max_length=1000)
    url: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[Decimal] = None
    currency: str = "RUB"
    source_domain: Optional[str] = None
    is_group_gift: bool = False
    priority: str = "normal"


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None, max_length=1000)
    url: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[Decimal] = None
    currency: Optional[str] = None
    is_group_gift: Optional[bool] = None
    priority: Optional[str] = None


class ItemResponse(BaseModel):
    id: UUID
    wishlist_id: UUID
    name: str
    description: Optional[str]
    url: Optional[str]
    image_url: Optional[str]
    price: Optional[Decimal]
    currency: str
    source_domain: Optional[str]
    is_group_gift: bool
    priority: str
    sort_order: int
    is_liked_by_owner: bool = False
    like_count: int = 0
    is_reserved: bool = False
    reservation_count: int = 0
    contribution_total: Decimal = Decimal("0")
    contribution_count: int = 0
    progress_percentage: float = 0.0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ItemPublicResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    url: Optional[str]
    image_url: Optional[str]
    price: Optional[Decimal]
    currency: str
    source_domain: Optional[str]
    is_group_gift: bool
    priority: str
    is_reserved: bool = False
    reserver_name: Optional[str] = None
    contribution_total: Decimal = Decimal("0")
    contribution_count: int = 0
    progress_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)
