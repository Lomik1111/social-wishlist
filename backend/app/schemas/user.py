from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=10)


class AppleAuthRequest(BaseModel):
    identity_token: str = Field(..., min_length=10)
    full_name: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str = Field(...)


class PushTokenRequest(BaseModel):
    expo_push_token: str = Field(..., min_length=10)


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')

    model_config = ConfigDict(extra="forbid")


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(...)

    model_config = ConfigDict(extra="forbid")


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    theme: Optional[str] = None
    biometrics_enabled: Optional[bool] = None

    model_config = ConfigDict(extra="forbid")


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_premium: bool = False
    is_online: bool = False
    theme: str = "deep_amethyst"
    google_id: Optional[str] = None
    apple_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserPublicResponse(BaseModel):
    id: UUID
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_premium: bool = False
    is_online: bool = False

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(extra="forbid")
