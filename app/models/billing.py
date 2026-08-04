from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import BillingInterval, PaymentStatus, SubscriptionStatus

if TYPE_CHECKING:
    from app.models.client import Client


class Subscription(UUIDPkMixin, TimestampMixin, Base):
    """Backs the payment endpoints; one active plan per client."""

    __tablename__ = "subscriptions"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    provider: Mapped[str] = mapped_column(String, nullable=False, default="dodo")
    provider_customer_id: Mapped[str | None] = mapped_column(String)
    provider_subscription_id: Mapped[str | None] = mapped_column(String, unique=True)

    plan_name: Mapped[str] = mapped_column(String, nullable=False)
    plan_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    billing_interval: Mapped[BillingInterval] = mapped_column(
        SQLEnum(BillingInterval, name="billing_interval"), nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus, name="subscription_status"),
        nullable=False,
        default=SubscriptionStatus.TRIALING,
    )

    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    client: Mapped["Client"] = relationship(back_populates="subscription")
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="subscription", cascade="all, delete-orphan"
    )


class Payment(UUIDPkMixin, TimestampMixin, Base):
    """Individual transaction log entry for a client's billing history."""

    __tablename__ = "payments"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True
    )

    provider_payment_id: Mapped[str | None] = mapped_column(String, unique=True)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String, nullable=False, default="usd")
    status: Mapped[PaymentStatus] = mapped_column(
        SQLEnum(PaymentStatus, name="payment_status"), nullable=False, default=PaymentStatus.PENDING
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    subscription: Mapped["Subscription | None"] = relationship(back_populates="payments")
