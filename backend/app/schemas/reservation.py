from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class ReservationCreate(BaseModel):
    guest_name: str | None = None
    guest_identifier: str | None = None


class ReservationResponse(BaseModel):
    id: UUID
    item_id: UUID
    guest_name: str | None
    is_full_reservation: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ReservationDeleteRequest(BaseModel):
    guest_identifier: str | None = None
