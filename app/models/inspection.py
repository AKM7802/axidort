from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import ProcessingStatus

if TYPE_CHECKING:
    from app.models.geo import City
    from app.models.lead import ClientLead
    from app.models.violation import Violation


class InspectionEvent(UUIDPkMixin, TimestampMixin, Base):
    """Generalized, city-agnostic representation of one raw inspection record.

    Service 1 fetches per-city raw data through a city adapter (Chicago for
    V1), maps it into this common schema, and preserves the untouched
    payload in `raw_data` so future adapters/fields never lose information.
    """

    __tablename__ = "inspection_events"
    __table_args__ = (UniqueConstraint("source_city", "external_id", name="uq_inspection_source"),)

    # -- provenance / adapter identity --
    # source_city stays the ingestion/dedup key Service 1 already uses
    # (matches CityAdapter.city_code exactly); city_id is the relational
    # reference to the same city, resolved from source_city on insert (see
    # SqlAlchemyInspectionEventRepository.upsert) — kept alongside rather
    # than replacing it, so ingestion/dedup logic doesn't need to change.
    source_city: Mapped[str] = mapped_column(String, nullable=False, index=True)  # e.g. 'chicago'
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    external_id: Mapped[str] = mapped_column(String, nullable=False)  # source dataset's own id

    # -- generalized business/location fields --
    business_name: Mapped[str] = mapped_column(String, nullable=False)
    aka_name: Mapped[str | None] = mapped_column(String)
    license_number: Mapped[str | None] = mapped_column(String)
    facility_type: Mapped[str | None] = mapped_column(String)
    risk_level: Mapped[str | None] = mapped_column(String)

    address_line: Mapped[str | None] = mapped_column(String)
    municipality: Mapped[str | None] = mapped_column(String)
    state: Mapped[str | None] = mapped_column(String)
    postal_code: Mapped[str | None] = mapped_column(String, index=True)
    latitude: Mapped[float | None] = mapped_column(Numeric)
    longitude: Mapped[float | None] = mapped_column(Numeric)

    # -- inspection facts --
    inspection_date: Mapped[date | None] = mapped_column(Date)
    inspection_type: Mapped[str | None] = mapped_column(String)
    result: Mapped[str | None] = mapped_column(String)  # 'pass'|'fail'|'pass_with_conditions'|...

    # -- pipeline / classification state --
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        SQLEnum(ProcessingStatus, name="processing_status"),
        nullable=False,
        default=ProcessingStatus.RAW,
    )
    classifier_version: Mapped[str | None] = mapped_column(String)
    is_lead: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    # LLM-generated, client-facing description of the issue (Service 2 email
    # content) — a property of the event, generated once and cached here
    # rather than re-generated per client/per digest.
    narration: Mapped[str | None] = mapped_column(String)

    raw_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    city: Mapped["City"] = relationship(back_populates="inspection_events")
    violations: Mapped[list["Violation"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    client_leads: Mapped[list["ClientLead"]] = relationship(
        back_populates="inspection_event", cascade="all, delete-orphan"
    )
