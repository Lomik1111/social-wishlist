import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Reservation(Base):
    __tablename__ = "reservations"
    __table_args__ = (
        Index("idx_unique_full_reservation", "item_id", unique=True, postgresql_where="is_full_reservation = TRUE"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    guest_name: Mapped[str | None] = mapped_column(String(255))
    guest_identifier: Mapped[str | None] = mapped_column(String(255), index=True)
    is_full_reservation: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    item = relationship("Item", back_populates="reservations")
    user = relationship("User", back_populates="reservations")
