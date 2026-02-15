from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal


class ContributionCreate(BaseModel):
    amount: Decimal
    message: str | None = None
    guest_name: str | None = None
    guest_identifier: str | None = None


class ContributionResponse(BaseModel):
    id: UUID
    item_id: UUID
    amount: Decimal
    message: str | None
    guest_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContributionDeleteRequest(BaseModel):
    guest_identifier: str | None = None
