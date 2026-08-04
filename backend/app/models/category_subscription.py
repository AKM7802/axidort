from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import ViolationCategory

if TYPE_CHECKING:
    from app.models.client import Client


class CategorySubscription(UUIDPkMixin, TimestampMixin, Base):
    """A violation category a client wants leads for — joined against an
    event's violations when matching candidate leads.
    """

    __tablename__ = "category_subscriptions"
    __table_args__ = (UniqueConstraint("client_id", "category", name="uq_client_category"),)

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    # create_type=False: this enum type already exists (created for
    # violations.category); this column just reuses it.
    category: Mapped[ViolationCategory] = mapped_column(
        SQLEnum(ViolationCategory, name="violation_category", create_type=False), nullable=False
    )

    client: Mapped["Client"] = relationship(back_populates="category_subscriptions")
