from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ReservationCreate(BaseModel):
    guest_name: Optional[str] = None
    guest_identifier: Optional[str] = None
    is_anonymous: bool = False


class ReservationResponse(BaseModel):
    id: UUID
    item_id: UUID
    reserver_id: Optional[UUID]
    guest_name: Optional[str]
    is_anonymous: bool
    is_purchased: bool
    purchased_at: Optional[datetime]
    thanks_sent: bool
    thanks_reaction: Optional[str]
    thanks_message: Optional[str]
    created_at: datetime
    # Enriched fields
    item_name: Optional[str] = None
    item_image_url: Optional[str] = None
    item_price: Optional[float] = None
    wishlist_title: Optional[str] = None
    owner_name: Optional[str] = None
    owner_avatar: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReservationDeleteRequest(BaseModel):
    guest_identifier: Optional[str] = None


class PurchasedUpdate(BaseModel):
    is_purchased: bool = True


class ThanksCreate(BaseModel):
    reaction: str = Field(..., pattern=r'^(love|gift|fire|sparkle)$')
    message: Optional[str] = Field(None, max_length=500)
