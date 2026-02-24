from typing import Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=10)


class AppleAuthRequest(BaseModel):
    identity_token: str = Field(..., min_length=10)
    full_name: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str = Field(...)


class PushTokenRequest(BaseModel):
    expo_push_token: str = Field(..., min_length=10, max_length=200, pattern=r'^ExponentPushToken\[.+\]$')


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')

    model_config = ConfigDict(extra="forbid")


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)

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
    has_google: bool = False
    has_apple: bool = False
    biometrics_enabled: bool = False
    created_at: datetime

    @model_validator(mode='before')
    @classmethod
    def compute_has_providers(cls, data):
        if isinstance(data, dict):
            data['has_google'] = bool(data.get('google_id'))
            data['has_apple'] = bool(data.get('apple_id'))
        else:
            # ORM object
            data_dict = {}
            for field in ['id', 'email', 'full_name', 'username', 'avatar_url',
                          'bio', 'is_premium', 'is_online', 'theme',
                          'biometrics_enabled', 'created_at']:
                data_dict[field] = getattr(data, field, None)
            data_dict['has_google'] = bool(getattr(data, 'google_id', None))
            data_dict['has_apple'] = bool(getattr(data, 'apple_id', None))
            return data_dict
        return data

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


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    model_config = ConfigDict(extra="forbid")


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)

    model_config = ConfigDict(extra="forbid")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

    model_config = ConfigDict(extra="forbid")
