from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import ClientRole, ClientStatus

if TYPE_CHECKING:
    from app.models.category_subscription import CategorySubscription
    from app.models.lead import ClientLead
    from app.models.notification import EmailDigest
    from app.models.password_reset import PasswordResetToken
    from app.models.territory import Territory


class Client(UUIDPkMixin, TimestampMixin, Base):
    """A registered organization that is also the login/user account itself
    (signin and the client dashboard both operate on this one record) —
    there is no separate multi-user-per-client table.
    """

    __tablename__ = "clients"

    # -- auth (signin) --
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # -- registration form / business details --
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    contact_name: Mapped[str] = mapped_column(String, nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String)

    business_address: Mapped[str | None] = mapped_column(String)
    business_city: Mapped[str | None] = mapped_column(String)
    business_state: Mapped[str | None] = mapped_column(String)
    business_zip: Mapped[str | None] = mapped_column(String)
    industry: Mapped[str | None] = mapped_column(String)

    status: Mapped[ClientStatus] = mapped_column(
        SQLEnum(ClientStatus, name="client_status"),
        nullable=False,
        default=ClientStatus.UNPAID,
    )

    # No admin API/UI reads this anymore (removed for attack-surface
    # reasons) — kept only as a data marker. Not settable via signup or the
    # client-facing update endpoints.
    role: Mapped[ClientRole] = mapped_column(
        SQLEnum(ClientRole, name="client_role"),
        nullable=False,
        default=ClientRole.CLIENT,
    )

    # Not settable via any endpoint in this branch (was admin-only): if
    # true, a matching restaurant in this client's territory routes ONLY to
    # this client.
    is_exclusive: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    territories: Mapped[list["Territory"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    category_subscriptions: Mapped[list["CategorySubscription"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    leads: Mapped[list["ClientLead"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    email_digests: Mapped[list["EmailDigest"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
