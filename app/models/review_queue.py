from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import ReviewStatus

if TYPE_CHECKING:
    from app.models.admin import AdminUser
    from app.models.violation import Violation


class ReviewQueue(UUIDPkMixin, TimestampMixin, Base):
    """Holds low-confidence (ai_confidence < 0.8) classifications for a human
    to confirm or correct before a violation is trusted as a lead signal.
    """

    __tablename__ = "review_queue"

    violation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("violations.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[ReviewStatus] = mapped_column(
        SQLEnum(ReviewStatus, name="review_status"), nullable=False, default=ReviewStatus.PENDING
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolution_notes: Mapped[str | None] = mapped_column(String)

    violation: Mapped["Violation"] = relationship(back_populates="review_entries")
    reviewed_by_user: Mapped["AdminUser | None"] = relationship(back_populates="reviewed_items")
