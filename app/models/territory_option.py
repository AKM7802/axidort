from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import TerritoryKind

if TYPE_CHECKING:
    from app.models.geo import City


class TerritoryOption(UUIDPkMixin, TimestampMixin, Base):
    """The 'available list' a client picks territory_values from at signup.

    Seeded per city/kind (e.g. every Chicago zip code for kind='zip') so
    clients can only subscribe to real, known values — never free text.
    """

    __tablename__ = "territory_options"
    __table_args__ = (UniqueConstraint("source_city", "kind", "value", name="uq_territory_option"),)

    # source_city stays the lookup key list_options/exists/bulk_upsert
    # already use; city_id is the relational reference to the same city,
    # set alongside it (see SqlAlchemyTerritoryOptionRepository.bulk_upsert).
    source_city: Mapped[str] = mapped_column(String, nullable=False, index=True)
    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cities.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # create_type=False: this enum type already exists (created for
    # territories.kind); this column just reuses it.
    kind: Mapped[TerritoryKind] = mapped_column(
        SQLEnum(TerritoryKind, name="territory_kind", create_type=False), nullable=False
    )
    value: Mapped[str] = mapped_column(String, nullable=False)
    label: Mapped[str | None] = mapped_column(String)

    city: Mapped["City"] = relationship(back_populates="territory_options")
