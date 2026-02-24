from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: Optional[str]
    body: Optional[str]
    data: dict = {}
    is_read: bool
    sender_name: Optional[str] = None
    sender_username: Optional[str] = None
    sender_avatar: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
