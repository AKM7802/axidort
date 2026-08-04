from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.billing import Payment, Subscription
from app.models.category_subscription import CategorySubscription
from app.models.client import Client
from app.models.data_quality import ZipMappingFlag
from app.models.do_not_contact import DoNotContact
from app.models.enums import (
    ClientStatus,
    DigestStatus,
    PaymentStatus,
    ProcessingStatus,
    ReviewStatus,
    TerritoryKind,
    ViolationCategory,
)
from app.models.geo import City, State
from app.models.inspection import InspectionEvent
from app.models.lead import ClientLead
from app.models.notification import EmailDigest, EmailDigestLead, NotificationPreference
from app.models.password_reset import PasswordResetToken
from app.models.review_queue import ReviewQueue
from app.models.territory import Territory
from app.models.territory_option import TerritoryOption
from app.models.violation import Violation
from app.repositories.interfaces import (
    CategorySubscriptionRepository,
    ClientLeadRepository,
    ClientRepository,
    DoNotContactRepository,
    EmailDigestRepository,
    GeoRepository,
    InspectionEventRepository,
    NotificationPreferenceRepository,
    PasswordResetTokenRepository,
    PaymentRepository,
    ReviewQueueRepository,
    SubscriptionRepository,
    TerritoryOptionRepository,
    TerritoryRepository,
    ViolationRepository,
    ZipMappingFlagRepository,
)


class SqlAlchemyGeoRepository(GeoRepository):
    def __init__(self, session: Session):
        self._session = session

    def list_states_with_cities(self) -> list[State]:
        stmt = select(State).options(selectinload(State.cities)).order_by(State.name)
        return list(self._session.scalars(stmt))

    def get_city_by_id(self, city_id: UUID) -> City | None:
        return self._session.get(City, city_id)

    def get_city_by_code(self, code: str) -> City | None:
        return self._session.scalar(select(City).where(City.code == code))


class SqlAlchemyZipMappingFlagRepository(ZipMappingFlagRepository):
    def __init__(self, session: Session):
        self._session = session

    def create(
        self, *, inspection_event_id: UUID, city_id: UUID, postal_code: str | None, description: str
    ) -> ZipMappingFlag:
        flag = ZipMappingFlag(
            inspection_event_id=inspection_event_id,
            city_id=city_id,
            postal_code=postal_code,
            description=description,
        )
        self._session.add(flag)
        self._session.flush()
        return flag

    def exists_for_event(self, inspection_event_id: UUID) -> bool:
        stmt = select(ZipMappingFlag.id).where(ZipMappingFlag.inspection_event_id == inspection_event_id)
        return self._session.scalar(stmt) is not None

    def list_all(self, *, limit: int, offset: int) -> list[ZipMappingFlag]:
        stmt = (
            select(ZipMappingFlag)
            .options(selectinload(ZipMappingFlag.inspection_event), selectinload(ZipMappingFlag.city))
            .order_by(ZipMappingFlag.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self._session.scalars(stmt))

    def count_all(self) -> int:
        return self._session.scalar(select(func.count()).select_from(ZipMappingFlag)) or 0


class SqlAlchemyInspectionEventRepository(InspectionEventRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_by_external_id(self, source_city: str, external_id: str) -> InspectionEvent | None:
        stmt = select(InspectionEvent).where(
            InspectionEvent.source_city == source_city,
            InspectionEvent.external_id == external_id,
        )
        return self._session.scalar(stmt)

    def upsert(self, data: dict[str, Any]) -> InspectionEvent:
        existing = self.get_by_external_id(data["source_city"], data["external_id"])
        if existing is not None:
            for key, value in data.items():
                setattr(existing, key, value)
            existing.fetched_at = datetime.now(timezone.utc)
            self._session.flush()
            return existing

        city = self._session.scalar(select(City).where(City.code == data["source_city"]))
        if city is None:
            raise ValueError(
                f"no City row for source_city={data['source_city']!r} — seed it before ingesting this city"
            )
        event = InspectionEvent(**data, city_id=city.id, fetched_at=datetime.now(timezone.utc))
        self._session.add(event)
        self._session.flush()
        return event

    def mark_classified(self, event_id: UUID, *, classifier_version: str, is_lead: bool) -> None:
        event = self._session.get(InspectionEvent, event_id)
        if event is None:
            return
        event.processing_status = ProcessingStatus.CLASSIFIED
        event.classifier_version = classifier_version
        event.is_lead = is_lead
        self._session.flush()

    def get_leads_since(self, since: datetime) -> list[InspectionEvent]:
        stmt = select(InspectionEvent).where(
            InspectionEvent.is_lead.is_(True),
            or_(
                InspectionEvent.inspection_date >= since.date(),
                and_(InspectionEvent.inspection_date.is_(None), InspectionEvent.fetched_at >= since),
            ),
        )
        return list(self._session.scalars(stmt))

    def count_pest_events_by_restaurant(
        self, keys: list[tuple[str, str]], since: datetime
    ) -> dict[tuple[str, str], int]:
        if not keys:
            return {}

        key_conditions = [
            and_(InspectionEvent.source_city == city, InspectionEvent.license_number == license_number)
            for city, license_number in keys
        ]
        stmt = (
            select(
                InspectionEvent.source_city,
                InspectionEvent.license_number,
                func.count(func.distinct(InspectionEvent.id)),
            )
            .join(Violation, Violation.event_id == InspectionEvent.id)
            .where(
                Violation.category == ViolationCategory.PEST,
                InspectionEvent.is_lead.is_(True),
                InspectionEvent.inspection_date >= since.date(),
                or_(*key_conditions),
            )
            .group_by(InspectionEvent.source_city, InspectionEvent.license_number)
        )
        return {(city, license_number): count for city, license_number, count in self._session.execute(stmt)}

    def set_narration(self, event_id: UUID, narration: str) -> None:
        event = self._session.get(InspectionEvent, event_id)
        if event is None:
            return
        event.narration = narration
        self._session.flush()

    def count_all(self) -> int:
        return self._session.scalar(select(func.count()).select_from(InspectionEvent)) or 0


class SqlAlchemyViolationRepository(ViolationRepository):
    def __init__(self, session: Session):
        self._session = session

    def bulk_create(self, event_id: UUID, violations: list[dict[str, Any]]) -> list[Violation]:
        # replace any previous classification of this event so re-running
        # ingestion for the same inspection doesn't duplicate violations
        self._session.query(Violation).filter(Violation.event_id == event_id).delete()

        rows = [Violation(event_id=event_id, **v) for v in violations]
        self._session.add_all(rows)
        self._session.flush()
        return rows


class SqlAlchemyReviewQueueRepository(ReviewQueueRepository):
    def __init__(self, session: Session):
        self._session = session

    def create(self, violation_id: UUID) -> ReviewQueue:
        row = ReviewQueue(violation_id=violation_id, status=ReviewStatus.PENDING)
        self._session.add(row)
        self._session.flush()
        return row

    def list_pending(self) -> list[ReviewQueue]:
        stmt = (
            select(ReviewQueue)
            .where(ReviewQueue.status == ReviewStatus.PENDING)
            .options(selectinload(ReviewQueue.violation).selectinload(Violation.event))
            .order_by(ReviewQueue.created_at)
        )
        return list(self._session.scalars(stmt))


class SqlAlchemyTerritoryRepository(TerritoryRepository):
    def __init__(self, session: Session):
        self._session = session

    def create_many(self, client_id: UUID, territories: list[dict[str, Any]]) -> list[Territory]:
        if not territories:
            return []
        rows = [Territory(client_id=client_id, **t) for t in territories]
        self._session.add_all(rows)
        self._session.flush()
        return rows

    def get_all_with_client(self) -> list[Territory]:
        stmt = select(Territory).options(
            selectinload(Territory.client).selectinload(Client.category_subscriptions)
        )
        return list(self._session.scalars(stmt))

    def delete_all_for_client(self, client_id: UUID) -> None:
        self._session.query(Territory).filter(Territory.client_id == client_id).delete()
        self._session.flush()


class SqlAlchemyTerritoryOptionRepository(TerritoryOptionRepository):
    def __init__(self, session: Session):
        self._session = session

    def list_options(self, source_city: str, kind: TerritoryKind | None = None) -> list[TerritoryOption]:
        stmt = select(TerritoryOption).where(TerritoryOption.source_city == source_city)
        if kind is not None:
            stmt = stmt.where(TerritoryOption.kind == kind)
        stmt = stmt.order_by(TerritoryOption.value)
        return list(self._session.scalars(stmt))

    def exists(self, source_city: str, kind: TerritoryKind, value: str) -> bool:
        stmt = select(TerritoryOption.id).where(
            TerritoryOption.source_city == source_city,
            TerritoryOption.kind == kind,
            TerritoryOption.value == value,
        )
        return self._session.scalar(stmt) is not None

    def bulk_upsert(self, source_city: str, kind: TerritoryKind, values: list[str]) -> int:
        existing = set(
            self._session.scalars(
                select(TerritoryOption.value).where(
                    TerritoryOption.source_city == source_city, TerritoryOption.kind == kind
                )
            )
        )
        new_values = [v for v in dict.fromkeys(values) if v not in existing]
        if not new_values:
            return 0

        city = self._session.scalar(select(City).where(City.code == source_city))
        if city is None:
            raise ValueError(f"no City row for source_city={source_city!r} — seed it before territory options")

        rows = [
            TerritoryOption(source_city=source_city, city_id=city.id, kind=kind, value=v) for v in new_values
        ]
        self._session.add_all(rows)
        self._session.flush()
        return len(rows)


class SqlAlchemyCategorySubscriptionRepository(CategorySubscriptionRepository):
    def __init__(self, session: Session):
        self._session = session

    def create_many(self, client_id: UUID, categories: list[ViolationCategory]) -> list[CategorySubscription]:
        if not categories:
            return []
        rows = [CategorySubscription(client_id=client_id, category=c) for c in categories]
        self._session.add_all(rows)
        self._session.flush()
        return rows

    def delete_all_for_client(self, client_id: UUID) -> None:
        self._session.query(CategorySubscription).filter(CategorySubscription.client_id == client_id).delete()
        self._session.flush()


class SqlAlchemyDoNotContactRepository(DoNotContactRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_all_blocked(self) -> set[tuple[UUID, str, str]]:
        stmt = select(DoNotContact.client_id, DoNotContact.source_city, DoNotContact.license_number)
        return {(client_id, city, license_number) for client_id, city, license_number in self._session.execute(stmt)}


class SqlAlchemyClientRepository(ClientRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_by_email(self, email: str) -> Client | None:
        return self._session.scalar(select(Client).where(Client.email == email))

    def create(self, data: dict[str, Any]) -> Client:
        client = Client(**data)
        self._session.add(client)
        self._session.flush()
        return client

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

    def list_all(self) -> list[Client]:
        stmt = (
            select(Client)
            .options(selectinload(Client.territories), selectinload(Client.category_subscriptions))
            .order_by(Client.created_at.desc())
        )
        return list(self._session.scalars(stmt))

    def count_all(self) -> int:
        return self._session.scalar(select(func.count()).select_from(Client)) or 0

    def get_by_id(self, client_id: UUID) -> Client | None:
        stmt = (
            select(Client)
            .where(Client.id == client_id)
            .options(selectinload(Client.territories), selectinload(Client.category_subscriptions))
        )
        return self._session.scalar(stmt)

    def update_flags(
        self, client_id: UUID, *, is_active: bool | None, is_exclusive: bool | None, status: ClientStatus | None
    ) -> Client | None:
        client = self._session.get(Client, client_id)
        if client is None:
            return None
        if is_active is not None:
            client.is_active = is_active
        if is_exclusive is not None:
            client.is_exclusive = is_exclusive
        if status is not None:
            client.status = status
        self._session.flush()
        return client

    def weekly_signups(self, *, weeks: int) -> list[tuple[date, int]]:
        since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
        week_bucket = func.date_trunc("week", Client.created_at)
        stmt = (
            select(week_bucket, func.count())
            .where(Client.created_at >= since)
            .group_by(week_bucket)
            .order_by(week_bucket)
        )
        return [(bucket.date(), count) for bucket, count in self._session.execute(stmt)]


class SqlAlchemyNotificationPreferenceRepository(NotificationPreferenceRepository):
    def __init__(self, session: Session):
        self._session = session

    def create(self, client_id: UUID, *, next_run_at: date) -> NotificationPreference:
        pref = NotificationPreference(client_id=client_id, is_active=True, next_run_at=next_run_at)
        self._session.add(pref)
        self._session.flush()
        return pref

    def get_all_active(self) -> list[NotificationPreference]:
        stmt = (
            select(NotificationPreference)
            .where(NotificationPreference.is_active.is_(True))
            .options(
                selectinload(NotificationPreference.client).selectinload(Client.territories),
                selectinload(NotificationPreference.client).selectinload(Client.category_subscriptions),
            )
        )
        return list(self._session.scalars(stmt))

    def get_due_today(self, today: date) -> list[NotificationPreference]:
        stmt = (
            select(NotificationPreference)
            .where(
                NotificationPreference.is_active.is_(True),
                or_(
                    NotificationPreference.next_run_at.is_(None),
                    NotificationPreference.next_run_at <= today,
                ),
            )
            .options(
                selectinload(NotificationPreference.client).selectinload(Client.territories),
                selectinload(NotificationPreference.client).selectinload(Client.category_subscriptions),
            )
        )
        return list(self._session.scalars(stmt))

    def reschedule(self, preference_id: UUID, *, now: datetime) -> None:
        pref = self._session.get(NotificationPreference, preference_id)
        if pref is None:
            return
        pref.last_sent_at = now
        pref.next_run_at = now.date() + timedelta(days=settings.lead_lookback_days)
        self._session.flush()


class SqlAlchemyClientLeadRepository(ClientLeadRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_existing_pairs(self, event_ids: list[UUID]) -> set[tuple[UUID, UUID]]:
        if not event_ids:
            return set()
        stmt = select(ClientLead.client_id, ClientLead.inspection_event_id).where(
            ClientLead.inspection_event_id.in_(event_ids)
        )
        return {(client_id, event_id) for client_id, event_id in self._session.execute(stmt)}

    def get_recent_restaurant_keys(self, since: datetime) -> set[tuple[UUID, str, str]]:
        stmt = (
            select(ClientLead.client_id, InspectionEvent.source_city, InspectionEvent.license_number)
            .join(InspectionEvent, InspectionEvent.id == ClientLead.inspection_event_id)
            .where(ClientLead.matched_at >= since, InspectionEvent.license_number.is_not(None))
        )
        return {
            (client_id, city, license_number) for client_id, city, license_number in self._session.execute(stmt)
        }

    def bulk_create(self, rows: list[dict[str, Any]]) -> list[ClientLead]:
        if not rows:
            return []
        objs = [ClientLead(**r) for r in rows]
        self._session.add_all(objs)
        self._session.flush()
        return objs

    def get_pending(self, client_id: UUID) -> list[ClientLead]:
        stmt = (
            select(ClientLead)
            .where(ClientLead.client_id == client_id, ClientLead.included_in_email.is_(False))
            .options(selectinload(ClientLead.inspection_event).selectinload(InspectionEvent.violations))
        )
        return list(self._session.scalars(stmt))

    def mark_included(self, client_lead_ids: list[UUID], digest_id: UUID) -> None:
        if not client_lead_ids:
            return
        rows = self._session.scalars(select(ClientLead).where(ClientLead.id.in_(client_lead_ids)))
        for row in rows:
            row.included_in_email = True
        self._session.add_all(
            [EmailDigestLead(email_digest_id=digest_id, client_lead_id=cl_id) for cl_id in client_lead_ids]
        )
        self._session.flush()

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

    def count_all(self) -> int:
        return self._session.scalar(select(func.count()).select_from(ClientLead)) or 0

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

    def weekly_counts_all(self, *, weeks: int) -> list[tuple[date, int]]:
        since = datetime.now(timezone.utc) - timedelta(weeks=weeks)
        week_bucket = func.date_trunc("week", ClientLead.matched_at)
        stmt = (
            select(week_bucket, func.count())
            .where(ClientLead.matched_at >= since)
            .group_by(week_bucket)
            .order_by(week_bucket)
        )
        return [(bucket.date(), count) for bucket, count in self._session.execute(stmt)]

    def category_breakdown_all(self) -> dict[str, int]:
        stmt = (
            select(Violation.category, func.count(func.distinct(ClientLead.id)))
            .select_from(ClientLead)
            .join(InspectionEvent, InspectionEvent.id == ClientLead.inspection_event_id)
            .join(Violation, Violation.event_id == InspectionEvent.id)
            .group_by(Violation.category)
        )
        return {category.value: count for category, count in self._session.execute(stmt)}


class SqlAlchemyEmailDigestRepository(EmailDigestRepository):
    def __init__(self, session: Session):
        self._session = session

    def create(self, client_id: UUID, *, period_start: date, period_end: date, lead_count: int) -> EmailDigest:
        digest = EmailDigest(
            client_id=client_id,
            period_start=period_start,
            period_end=period_end,
            lead_count=lead_count,
            status=DigestStatus.PENDING,
        )
        self._session.add(digest)
        self._session.flush()
        return digest

    def mark_sent(self, digest_id: UUID, *, provider_message_id: str) -> None:
        digest = self._session.get(EmailDigest, digest_id)
        if digest is None:
            return
        digest.status = DigestStatus.SENT
        digest.sent_at = datetime.now(timezone.utc)
        digest.provider_message_id = provider_message_id
        self._session.flush()

    def mark_failed(self, digest_id: UUID, *, error_message: str) -> None:
        digest = self._session.get(EmailDigest, digest_id)
        if digest is None:
            return
        digest.status = DigestStatus.FAILED
        digest.error_message = error_message
        self._session.flush()

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


class SqlAlchemySubscriptionRepository(SubscriptionRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_by_client_id(self, client_id: UUID) -> Subscription | None:
        return self._session.scalar(select(Subscription).where(Subscription.client_id == client_id))

    def get_by_provider_subscription_id(self, provider_subscription_id: str) -> Subscription | None:
        return self._session.scalar(
            select(Subscription).where(Subscription.provider_subscription_id == provider_subscription_id)
        )

    def upsert_for_client(self, client_id: UUID, data: dict[str, Any]) -> Subscription:
        subscription = self.get_by_client_id(client_id)
        if subscription is None:
            subscription = Subscription(client_id=client_id, **data)
            self._session.add(subscription)
        else:
            for key, value in data.items():
                setattr(subscription, key, value)
        self._session.flush()
        return subscription


class SqlAlchemyPaymentRepository(PaymentRepository):
    def __init__(self, session: Session):
        self._session = session

    def get_by_provider_payment_id(self, provider_payment_id: str) -> Payment | None:
        return self._session.scalar(select(Payment).where(Payment.provider_payment_id == provider_payment_id))

    def create(self, data: dict[str, Any]) -> Payment:
        payment = Payment(**data)
        self._session.add(payment)
        self._session.flush()
        return payment

    def update_status(self, payment_id: UUID, *, status: PaymentStatus, paid_at: datetime | None) -> None:
        payment = self._session.get(Payment, payment_id)
        if payment is None:
            return
        payment.status = status
        if paid_at is not None:
            payment.paid_at = paid_at
        self._session.flush()
