from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.client import Client


class DoNotContact(UUIDPkMixin, TimestampMixin, Base):
    """A restaurant a specific client should never be matched to.

    Restaurants aren't normalized into their own table (Chicago's
    license_number is the stable per-establishment id across repeat
    inspections), so the identity here is (source_city, license_number) —
    matching how the lead-matching pass and 90-day dedup key restaurants.
    No API manages this yet (admin/dashboard scope); it exists so the
    matching query can already exclude rows once something populates it.
    """

    __tablename__ = "do_not_contact"
    __table_args__ = (
        UniqueConstraint("client_id", "source_city", "license_number", name="uq_do_not_contact"),
    )

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    source_city: Mapped[str] = mapped_column(String, nullable=False)
    license_number: Mapped[str] = mapped_column(String, nullable=False)

    client: Mapped["Client"] = relationship(back_populates="do_not_contact_entries")
