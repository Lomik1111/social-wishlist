import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Text, Boolean, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Item(Base):
    __tablename__ = "items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    wishlist_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("wishlists.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    source_domain: Mapped[str | None] = mapped_column(String(255))
    is_group_gift: Mapped[bool] = mapped_column(Boolean, default=False)
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # must_have | nice_to_have | dream | normal
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_liked_by_owner: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    wishlist = relationship("Wishlist", back_populates="items")
    reservations = relationship("Reservation", back_populates="item", cascade="all, delete-orphan")
    contributions = relationship("Contribution", back_populates="item", cascade="all, delete-orphan")
    likes = relationship("ItemLike", back_populates="item", cascade="all, delete-orphan")
    categories = relationship("ItemCategory", back_populates="item", cascade="all, delete-orphan")
