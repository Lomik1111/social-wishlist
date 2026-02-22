from uuid import UUID
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class WishlistCreate(BaseModel):
    title: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    occasion: Optional[str] = None
    event_date: Optional[date] = None
    theme: str = "deep_amethyst"
    cover_image_url: Optional[str] = None
    privacy: str = "friends"


class WishlistUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    occasion: Optional[str] = None
    event_date: Optional[date] = None
    is_active: Optional[bool] = None
    theme: Optional[str] = None
    cover_image_url: Optional[str] = None


class WishlistPrivacyUpdate(BaseModel):
    privacy: str = Field(..., pattern=r'^(public|friends|selected|private)$')
    show_prices: Optional[bool] = None
    anonymous_reservations: Optional[bool] = None
    notifications_enabled: Optional[bool] = None


class WishlistAccessGrant(BaseModel):
    user_id: UUID


class WishlistResponse(BaseModel):
    id: UUID
    owner_id: UUID
    title: str
    description: Optional[str]
    occasion: Optional[str]
    event_date: Optional[date]
    share_token: str
    is_active: bool
    theme: str
    cover_image_url: Optional[str]
    privacy: str
    show_prices: bool
    anonymous_reservations: bool
    notifications_enabled: bool
    item_count: int = 0
    reserved_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WishlistPublicResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    occasion: Optional[str]
    event_date: Optional[date]
    owner_name: Optional[str] = None
    owner_username: Optional[str] = None
    owner_avatar: Optional[str] = None
    is_active: bool
    theme: str
    cover_image_url: Optional[str]
    show_prices: bool
    item_count: int = 0
    reserved_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
