from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.geo import City
    from app.models.inspection import InspectionEvent


class ZipMappingFlag(UUIDPkMixin, TimestampMixin, Base):
    """Raised by Service 1 ingestion when an inspection_event's zip code
    can't be mapped: either missing from the source data entirely, or
    present but not a real, seeded zip for that city (see
    TerritoryOptionRepository.exists — the same picklist clients pick
    territories from). Kept as its own table (not a column/status on
    InspectionEvent) so a single event could theoretically be flagged for
    more than one reason over time without losing history.
    """

    __tablename__ = "zip_mapping_flags"

    inspection_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inspection_events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id", ondelete="CASCADE"), nullable=False
    )
    # The raw value from the source data, if any — null when the field was
    # missing entirely (as opposed to present but unrecognized).
    postal_code: Mapped[str | None] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, nullable=False)

    inspection_event: Mapped["InspectionEvent"] = relationship()
    city: Mapped["City"] = relationship()
