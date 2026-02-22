from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ContributionCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    message: Optional[str] = Field(None, max_length=500)
    guest_name: Optional[str] = None
    guest_identifier: Optional[str] = None


class ContributionResponse(BaseModel):
    id: UUID
    item_id: UUID
    contributor_id: Optional[UUID]
    guest_name: Optional[str]
    amount: Decimal
    message: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContributionDeleteRequest(BaseModel):
    guest_identifier: Optional[str] = None
