from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.client import Client


class PasswordResetToken(UUIDPkMixin, TimestampMixin, Base):
    """A one-time-use, time-limited token emailed to a client who requested
    a password reset. Only the SHA-256 hash of the token is stored — same
    reasoning as password hashing: a leaked DB row shouldn't hand out a
    usable reset link. The raw token exists only in the email itself and
    briefly in memory on the request that issues or consumes it.
    """

    __tablename__ = "password_reset_tokens"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    client: Mapped["Client"] = relationship(back_populates="password_reset_tokens")
