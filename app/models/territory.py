from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import TerritoryKind

if TYPE_CHECKING:
    from app.models.client import Client


class Territory(UUIDPkMixin, TimestampMixin, Base):
    """A client-defined area of interest, e.g. zip '11385', borough 'Queens',
    local_authority 'Ealing', or a radius '43.65,-79.38,15km'.
    """

    __tablename__ = "territories"

    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[TerritoryKind] = mapped_column(
        SQLEnum(TerritoryKind, name="territory_kind"), nullable=False
    )
    value: Mapped[str] = mapped_column(String, nullable=False)

    client: Mapped["Client"] = relationship(back_populates="territories")
