from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=500)
    description: Optional[str] = Field(default=None, max_length=1000)
    url: Optional[str] = Field(default=None, max_length=2048)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    price: Optional[Decimal] = Field(default=None, ge=0)
    currency: str = Field(default="RUB", min_length=3, max_length=3, pattern=r'^[A-Z]{3}$')
    source_domain: Optional[str] = None
    is_group_gift: bool = False
    priority: Literal["must_have", "nice_to_have", "dream", "normal"] = "normal"

    @field_validator('url', 'image_url', mode='before')
    @classmethod
    def validate_url_scheme(cls, v):
        if v is not None and not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class ItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None, max_length=1000)
    url: Optional[str] = Field(default=None, max_length=2048)
    image_url: Optional[str] = Field(default=None, max_length=2048)
    price: Optional[Decimal] = None
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3, pattern=r'^[A-Z]{3}$')
    is_group_gift: Optional[bool] = None
    priority: Optional[Literal["must_have", "nice_to_have", "dream", "normal"]] = None

    @field_validator('url', 'image_url', mode='before')
    @classmethod
    def validate_url_scheme(cls, v):
        if v is not None and not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


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
