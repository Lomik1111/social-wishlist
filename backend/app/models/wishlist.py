import uuid
import secrets
from datetime import datetime, date
from sqlalchemy import String, Text, Integer, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Wishlist(Base):
    __tablename__ = "wishlists"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    occasion: Mapped[str | None] = mapped_column(String(50))
    event_date: Mapped[date | None] = mapped_column(Date)
    share_token: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True, default=lambda: secrets.token_urlsafe(32))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    theme: Mapped[str] = mapped_column(String(50), default="deep_amethyst")
    cover_image_url: Mapped[str | None] = mapped_column(Text)
    # Privacy settings
    privacy: Mapped[str] = mapped_column(String(20), default="friends")  # public | friends | selected | private
    show_prices: Mapped[bool] = mapped_column(Boolean, default=True)
    anonymous_reservations: Mapped[bool] = mapped_column(Boolean, default=False)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    # Denormalized counters
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    reserved_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="wishlists")
    items = relationship("Item", back_populates="wishlist", cascade="all, delete-orphan")
    access_list = relationship("WishlistAccess", back_populates="wishlist", cascade="all, delete-orphan")
