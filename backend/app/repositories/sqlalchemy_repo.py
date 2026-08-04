from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.client import Client
from app.models.enums import ViolationCategory
from app.models.geo import State
from app.models.inspection import InspectionEvent
from app.models.lead import ClientLead
from app.models.notification import EmailDigest, EmailDigestLead
from app.models.password_reset import PasswordResetToken
from app.models.violation import Violation
from app.repositories.interfaces import (
    ClientLeadRepository,
    ClientRepository,
    EmailDigestRepository,
    GeoRepository,
    PasswordResetTokenRepository,
)


class SqlAlchemyGeoRepository(GeoRepository):
    def __init__(self, session: Session):
        self._session = session

    def list_states_with_cities(self) -> list[State]:
        stmt = select(State).options(selectinload(State.cities)).order_by(State.name)
        return list(self._session.scalars(stmt))


class SqlAlchemyClientRepository(ClientRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_by_email(self, email: str) -> Client | None:
        return self._session.scalar(select(Client).where(Client.email == email))

    def get_by_id(self, client_id: UUID) -> Client | None:
        return self._session.get(Client, client_id)

    def update_last_login(self, client_id: UUID, *, now: datetime) -> None:
        client = self._session.get(Client, client_id)
        if client is None:
            return
        client.last_login_at = now
        self._session.flush()

    def update_password(self, client_id: UUID, *, hashed_password: str) -> None:
        client = self._session.get(Client, client_id)
        if client is None:
            return
        client.hashed_password = hashed_password
        self._session.flush()


class SqlAlchemyClientLeadRepository(ClientLeadRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_paginated_for_client(
        self, client_id: UUID, *, limit: int, offset: int, category: ViolationCategory | None = None
    ) -> list[ClientLead]:
        stmt = (
            select(ClientLead)
            .where(ClientLead.client_id == client_id)
            .options(selectinload(ClientLead.inspection_event).selectinload(InspectionEvent.violations))
        )
        if category is not None:
            stmt = (
                stmt.join(InspectionEvent, InspectionEvent.id == ClientLead.inspection_event_id)
                .join(Violation, Violation.event_id == InspectionEvent.id)
                .where(Violation.category == category)
                .distinct()
            )
        stmt = stmt.order_by(ClientLead.matched_at.desc()).limit(limit).offset(offset)
        return list(self._session.scalars(stmt))

    def count_for_client(self, client_id: UUID, *, category: ViolationCategory | None = None) -> int:
        stmt = select(func.count(func.distinct(ClientLead.id))).select_from(ClientLead).where(
            ClientLead.client_id == client_id
        )
        if category is not None:
            stmt = (
                stmt.join(InspectionEvent, InspectionEvent.id == ClientLead.inspection_event_id)
                .join(Violation, Violation.event_id == InspectionEvent.id)
                .where(Violation.category == category)
            )
        return self._session.scalar(stmt) or 0

    def count_recent_for_client(self, client_id: UUID, *, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(ClientLead)
            .where(ClientLead.client_id == client_id, ClientLead.matched_at >= since)
        )
        return self._session.scalar(stmt) or 0

    def category_breakdown_for_client(self, client_id: UUID) -> dict[str, int]:
        stmt = (
            select(Violation.category, func.count(func.distinct(ClientLead.id)))
            .select_from(ClientLead)
            .join(InspectionEvent, InspectionEvent.id == ClientLead.inspection_event_id)
            .join(Violation, Violation.event_id == InspectionEvent.id)
            .where(ClientLead.client_id == client_id)
            .group_by(Violation.category)
        )
        return {category.value: count for category, count in self._session.execute(stmt)}

    def weekly_counts_for_client(self, client_id: UUID, *, weeks: int) -> list[tuple[date, int]]:
        since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
        week_bucket = func.date_trunc("week", ClientLead.matched_at)
        stmt = (
            select(week_bucket, func.count())
            .where(ClientLead.client_id == client_id, ClientLead.matched_at >= since)
            .group_by(week_bucket)
            .order_by(week_bucket)
        )
        return [(bucket.date(), count) for bucket, count in self._session.execute(stmt)]


class SqlAlchemyEmailDigestRepository(EmailDigestRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_paginated_for_client(self, client_id: UUID, *, limit: int, offset: int) -> list[EmailDigest]:
        stmt = (
            select(EmailDigest)
            .where(EmailDigest.client_id == client_id)
            .order_by(EmailDigest.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self._session.scalars(stmt))

    def count_for_client(self, client_id: UUID) -> int:
        stmt = select(func.count()).select_from(EmailDigest).where(EmailDigest.client_id == client_id)
        return self._session.scalar(stmt) or 0

    def get_by_id_for_client(self, digest_id: UUID, client_id: UUID) -> EmailDigest | None:
        stmt = (
            select(EmailDigest)
            .where(EmailDigest.id == digest_id, EmailDigest.client_id == client_id)
            .options(
                selectinload(EmailDigest.lead_links)
                .selectinload(EmailDigestLead.client_lead)
                .selectinload(ClientLead.inspection_event)
                .selectinload(InspectionEvent.violations)
            )
        )
        return self._session.scalar(stmt)


class SqlAlchemyPasswordResetTokenRepository(PasswordResetTokenRepository):
    def __init__(self, session: Session):
        self._session = session

    def create(self, client_id: UUID, *, token_hash: str, expires_at: datetime) -> PasswordResetToken:
        record = PasswordResetToken(client_id=client_id, token_hash=token_hash, expires_at=expires_at)
        self._session.add(record)
        self._session.flush()
        return record

    def get_valid_by_hash(self, token_hash: str, *, now: datetime) -> PasswordResetToken | None:
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        return self._session.scalar(stmt)

    def mark_used(self, token_id: UUID, *, now: datetime) -> None:
        record = self._session.get(PasswordResetToken, token_id)
        if record is None:
            return
        record.used_at = now
        self._session.flush()

    def invalidate_all_for_client(self, client_id: UUID) -> None:
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.client_id == client_id, PasswordResetToken.used_at.is_(None)
        )
        now = datetime.now(timezone.utc)
        for record in self._session.scalars(stmt):
            record.used_at = now
        self._session.flush()
