from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.review_queue import ReviewQueue


class AdminUser(UUIDPkMixin, TimestampMixin, Base):
    """Internal staff login for the admin dashboard — unrelated to any
    client; used e.g. to resolve items in review_queue.
    """

    __tablename__ = "admin_users"

    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    reviewed_items: Mapped[list["ReviewQueue"]] = relationship(back_populates="reviewed_by_user")
