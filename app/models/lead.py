from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.inspection import InspectionEvent
    from app.models.notification import EmailDigestLead
    from app.models.territory import Territory


class ClientLead(UUIDPkMixin, TimestampMixin, Base):
    """Many-to-many join between clients and inspection_events: one lead
    event can match multiple clients' territories, and Service 2 reads this
    table (last 7 days) to build each client's email digest.
    """

    __tablename__ = "client_leads"
    __table_args__ = (UniqueConstraint("client_id", "inspection_event_id", name="uq_client_lead"),)

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    inspection_event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("inspection_events.id", ondelete="CASCADE"), nullable=False
    )
    territory_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("territories.id", ondelete="SET NULL"), nullable=True
    )

    matched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    included_in_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # rank_score v1 (deterministic): a property of the underlying event's
    # violations, computed once per event and copied onto every client_lead
    # created for it — lets a client's digest be ordered without rejoining
    # violations at send time. Superseded by a learned model at M5.
    rank_score: Mapped[float | None] = mapped_column(Numeric)

    client: Mapped["Client"] = relationship(back_populates="leads")
    inspection_event: Mapped["InspectionEvent"] = relationship(back_populates="client_leads")
    territory: Mapped["Territory | None"] = relationship()
    email_digest_links: Mapped[list["EmailDigestLead"]] = relationship(
        back_populates="client_lead", cascade="all, delete-orphan"
    )
