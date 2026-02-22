from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class FriendshipResponse(BaseModel):
    id: UUID
    user_id: UUID
    full_name: Optional[str]
    username: Optional[str]
    avatar_url: Optional[str]
    is_online: bool = False
    status: str  # pending | accepted

    model_config = ConfigDict(from_attributes=True)


class FriendRequestResponse(BaseModel):
    id: UUID
    requester_id: UUID
    requester_name: Optional[str]
    requester_username: Optional[str]
    requester_avatar: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
