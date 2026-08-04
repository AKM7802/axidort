from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Numeric, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import ViolationCategory, ViolationSeverity

if TYPE_CHECKING:
    from app.models.inspection import InspectionEvent
    from app.models.review_queue import ReviewQueue


class Violation(UUIDPkMixin, TimestampMixin, Base):
    """LLM-classified violation extracted from an inspection_event.

    Rows with ai_confidence < 0.8 are also inserted into review_queue for
    human review, per the classifier's confidence threshold.
    """

    __tablename__ = "violations"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inspection_events.id", ondelete="CASCADE"), nullable=False
    )

    code_raw: Mapped[str | None] = mapped_column(String)
    description_raw: Mapped[str | None] = mapped_column(String)

    category: Mapped[ViolationCategory] = mapped_column(
        SQLEnum(ViolationCategory, name="violation_category"), nullable=False
    )
    species: Mapped[list[str] | None] = mapped_column(ARRAY(String))  # ['rodent','roach','fly'] when pest
    severity: Mapped[ViolationSeverity] = mapped_column(
        SQLEnum(ViolationSeverity, name="violation_severity"), nullable=False
    )
    critical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # classifier context flags (classify_v1 prompt)
    reinspection_expected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    structural_risk: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    ai_confidence: Mapped[float | None] = mapped_column(Numeric)
    classifier_version: Mapped[str] = mapped_column(String, nullable=False)

    event: Mapped["InspectionEvent"] = relationship(back_populates="violations")
    review_entries: Mapped[list["ReviewQueue"]] = relationship(
        back_populates="violation", cascade="all, delete-orphan"
    )
