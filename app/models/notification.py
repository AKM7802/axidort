from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import DigestStatus

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.lead import ClientLead


class NotificationPreference(UUIDPkMixin, TimestampMixin, Base):
    """Drives 'get the users who need email today'.

    Cadence is a single global knob (settings.lead_lookback_days, e.g. 7),
    not a per-client choice: whichever digest mode is active
    (settings.digest_send_mode — 'instant' sends to every active client on
    every run; 'scheduled' only sends to clients whose next_run_at has
    arrived), a successful send always pushes next_run_at forward by that
    same number of days.
    """

    __tablename__ = "notification_preferences"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_run_at: Mapped[date | None] = mapped_column(Date, index=True)

    client: Mapped["Client"] = relationship(back_populates="notification_preference")


class EmailDigest(UUIDPkMixin, TimestampMixin, Base):
    """One outbound email covering a client's last-7-days lead window."""

    __tablename__ = "email_digests"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )

    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    lead_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    status: Mapped[DigestStatus] = mapped_column(
        SQLEnum(DigestStatus, name="digest_status"), nullable=False, default=DigestStatus.PENDING
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    provider_message_id: Mapped[str | None] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(String)

    client: Mapped["Client"] = relationship(back_populates="email_digests")
    lead_links: Mapped[list["EmailDigestLead"]] = relationship(
        back_populates="email_digest", cascade="all, delete-orphan"
    )


class EmailDigestLead(UUIDPkMixin, TimestampMixin, Base):
    """Join row recording exactly which client_leads were sent in a given digest."""

    __tablename__ = "email_digest_leads"
    __table_args__ = (
        UniqueConstraint("email_digest_id", "client_lead_id", name="uq_digest_lead"),
    )

    email_digest_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("email_digests.id", ondelete="CASCADE"), nullable=False
    )
    client_lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("client_leads.id", ondelete="CASCADE"), nullable=False
    )

    email_digest: Mapped["EmailDigest"] = relationship(back_populates="lead_links")
    client_lead: Mapped["ClientLead"] = relationship(back_populates="email_digest_links")
