from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.inspection import InspectionEvent


class State(UUIDPkMixin, TimestampMixin, Base):
    """A US state we operate in. Only Illinois exists today (we're
    Chicago-only for V1) — this table exists so "which state, then which
    city" is a real relational choice at signup, not a hardcoded single
    option, once more cities/states are added later.
    """

    __tablename__ = "states"

    name: Mapped[str] = mapped_column(String, nullable=False, unique=True)  # "Illinois"
    code: Mapped[str] = mapped_column(String, nullable=False, unique=True)  # "IL"

    cities: Mapped[list["City"]] = relationship(back_populates="state")


class City(UUIDPkMixin, TimestampMixin, Base):
    """A market we ingest inspection data for and let clients target.

    `code` is the same stable identifier already used everywhere else in
    the codebase as a plain string (InspectionEvent.source_city,
    TerritoryOption.source_city, CityAdapter.city_code, e.g. "chicago") —
    kept as-is here rather than renamed, since Service 1's ingestion/dedup
    logic already depends on that exact string. This table adds a real,
    relational `id` that leads and territory options can reference, which
    is what was missing before.
    """

    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("state_id", "name", name="uq_city_state_name"),)

    state_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("states.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)  # "Chicago"
    code: Mapped[str] = mapped_column(String, nullable=False, unique=True)  # "chicago"

    state: Mapped["State"] = relationship(back_populates="cities")
    inspection_events: Mapped[list["InspectionEvent"]] = relationship(back_populates="city")
