from abc import ABC, abstractmethod
from datetime import date, datetime
from typing import Any
from uuid import UUID

from app.models.billing import Payment, Subscription
from app.models.category_subscription import CategorySubscription
from app.models.client import Client
from app.models.data_quality import ZipMappingFlag
from app.models.enums import ClientStatus, PaymentStatus, TerritoryKind, ViolationCategory
from app.models.geo import City, State
from app.models.inspection import InspectionEvent
from app.models.lead import ClientLead
from app.models.notification import EmailDigest, NotificationPreference
from app.models.password_reset import PasswordResetToken
from app.models.review_queue import ReviewQueue
from app.models.territory import Territory
from app.models.territory_option import TerritoryOption
from app.models.violation import Violation


class GeoRepository(ABC):
    @abstractmethod
    def list_states_with_cities(self) -> list[State]:
        """Every state, with its cities eager-loaded — signup's
        state -> city picker. Tiny table, no pagination needed."""

    @abstractmethod
    def get_city_by_id(self, city_id: UUID) -> City | None: ...

    @abstractmethod
    def get_city_by_code(self, code: str) -> City | None:
        """Looks up a city by its stable adapter/ingestion key (e.g.
        "chicago") — used to resolve city_id when it isn't already known."""


class ZipMappingFlagRepository(ABC):
    @abstractmethod
    def create(
        self, *, inspection_event_id: UUID, city_id: UUID, postal_code: str | None, description: str
    ) -> ZipMappingFlag: ...

    @abstractmethod
    def exists_for_event(self, inspection_event_id: UUID) -> bool:
        """Service 1 re-upserts the same event on every ingest run — this
        guards against re-flagging an already-flagged event every time."""

    @abstractmethod
    def list_all(self, *, limit: int, offset: int) -> list[ZipMappingFlag]:
        """Most recent first — admin visibility into ingestion data-quality issues."""

    @abstractmethod
    def count_all(self) -> int: ...


class InspectionEventRepository(ABC):
    @abstractmethod
    def get_by_external_id(self, source_city: str, external_id: str) -> InspectionEvent | None: ...

    @abstractmethod
    def upsert(self, data: dict[str, Any]) -> InspectionEvent:
        """Insert a new inspection_event, or update the existing one for
        (source_city, external_id) if the source already sent it before.
        """

    @abstractmethod
    def mark_classified(self, event_id: UUID, *, classifier_version: str, is_lead: bool) -> None: ...

    @abstractmethod
    def get_leads_since(self, since: datetime) -> list[InspectionEvent]:
        """Events flagged is_lead whose inspection_date (or, absent that,
        fetch time) falls on/after `since`.
        """

    @abstractmethod
    def count_pest_events_by_restaurant(
        self, keys: list[tuple[str, str]], since: datetime
    ) -> dict[tuple[str, str], int]:
        """For each (source_city, license_number) key, the number of
        distinct is_lead events with a pest-category violation since
        `since` — feeds the rank_score repeat_offender term.
        """

    @abstractmethod
    def set_narration(self, event_id: UUID, narration: str) -> None:
        """Cache the LLM-generated issue description for this event so it's
        generated once, not re-generated on every digest run.
        """

    @abstractmethod
    def count_all(self) -> int:
        """Admin dashboard stats."""


class ViolationRepository(ABC):
    @abstractmethod
    def bulk_create(self, event_id: UUID, violations: list[dict[str, Any]]) -> list[Violation]: ...


class ReviewQueueRepository(ABC):
    @abstractmethod
    def create(self, violation_id: UUID) -> ReviewQueue: ...

    @abstractmethod
    def list_pending(self) -> list[ReviewQueue]:
        """Admin dashboard: items awaiting human review, with violation +
        its inspection_event eager-loaded for display.
        """


class ClientRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> Client | None: ...

    @abstractmethod
    def create(self, data: dict[str, Any]) -> Client: ...

    @abstractmethod
    def update_last_login(self, client_id: UUID, *, now: datetime) -> None: ...

    @abstractmethod
    def update_password(self, client_id: UUID, *, hashed_password: str) -> None: ...

    @abstractmethod
    def list_all(self) -> list[Client]:
        """Admin dashboard: every client, with territories + category_subscriptions eager-loaded."""

    @abstractmethod
    def count_all(self) -> int:
        """Admin dashboard stats."""

    @abstractmethod
    def get_by_id(self, client_id: UUID) -> Client | None:
        """Admin client detail page, with territories + category_subscriptions eager-loaded."""

    @abstractmethod
    def update_flags(
        self, client_id: UUID, *, is_active: bool | None, is_exclusive: bool | None, status: ClientStatus | None
    ) -> Client | None:
        """Admin-only fields not editable via self-service signup/signin."""

    @abstractmethod
    def weekly_signups(self, *, weeks: int) -> list[tuple[date, int]]:
        """[(week_start, count), ...] of new clients over the trailing
        `weeks` weeks, oldest first — admin dashboard growth chart.
        """


class TerritoryRepository(ABC):
    @abstractmethod
    def create_many(self, client_id: UUID, territories: list[dict[str, Any]]) -> list[Territory]:
        """Create territories (each {kind, value}) for a client, e.g. at signup."""

    @abstractmethod
    def get_all_with_client(self) -> list[Territory]:
        """Every territory across every client, with client +
        client.category_subscriptions eager-loaded — the candidate set for
        the lead-matching pass.
        """

    @abstractmethod
    def delete_all_for_client(self, client_id: UUID) -> None:
        """Admin edit: territories are replaced wholesale, not diffed."""


class TerritoryOptionRepository(ABC):
    @abstractmethod
    def list_options(self, source_city: str, kind: TerritoryKind | None = None) -> list[TerritoryOption]:
        """The 'available list' a client picks territory_values from."""

    @abstractmethod
    def exists(self, source_city: str, kind: TerritoryKind, value: str) -> bool:
        """Used to validate a signup's territory_values at request time."""

    @abstractmethod
    def bulk_upsert(self, source_city: str, kind: TerritoryKind, values: list[str]) -> int:
        """Insert any values not already present for (source_city, kind).
        Returns the number actually inserted. Used by the seed script.
        """


class CategorySubscriptionRepository(ABC):
    @abstractmethod
    def create_many(self, client_id: UUID, categories: list[ViolationCategory]) -> list[CategorySubscription]: ...

    @abstractmethod
    def delete_all_for_client(self, client_id: UUID) -> None:
        """Admin edit: category subscriptions are replaced wholesale, not diffed."""


class DoNotContactRepository(ABC):
    @abstractmethod
    def get_all_blocked(self) -> set[tuple[UUID, str, str]]:
        """Every (client_id, source_city, license_number) a client has
        blocked, for the matching pass to exclude in one pass rather than
        a query per (client, event) pair.
        """


class NotificationPreferenceRepository(ABC):
    @abstractmethod
    def create(self, client_id: UUID, *, next_run_at: date) -> NotificationPreference:
        """One-time creation at signup: next_run_at is set to tomorrow
        (joining date + 1 day) by the caller.
        """

    @abstractmethod
    def get_all_active(self) -> list[NotificationPreference]:
        """Every active preference, regardless of next_run_at — used in
        'instant' digest mode. Client + client.territories eager-loaded.
        """

    @abstractmethod
    def get_due_today(self, today: date) -> list[NotificationPreference]:
        """Active preferences whose next_run_at has arrived (or was never
        set) as of `today` — used in 'scheduled' digest mode. Client +
        client.territories eager-loaded.
        """

    @abstractmethod
    def reschedule(self, preference_id: UUID, *, now: datetime) -> None:
        """Set last_sent_at=now and next_run_at=now.date()+lead_lookback_days.
        Call only after a successful send.
        """


class ClientLeadRepository(ABC):
    @abstractmethod
    def get_existing_pairs(self, event_ids: list[UUID]) -> set[tuple[UUID, UUID]]:
        """(client_id, inspection_event_id) pairs already recorded, for a
        batch of event ids — lets the matching pass skip duplicates without
        relying on catching a unique-constraint violation.
        """

    @abstractmethod
    def get_recent_restaurant_keys(self, since: datetime) -> set[tuple[UUID, str, str]]:
        """(client_id, source_city, license_number) already matched since
        `since` — the 90-day same-restaurant dedup check. Events with no
        license_number never appear here (can't identify the restaurant),
        so they're never blocked by this check.
        """

    @abstractmethod
    def bulk_create(self, rows: list[dict[str, Any]]) -> list[ClientLead]:
        """Create client_lead rows (each {client_id, inspection_event_id,
        territory_id, matched_at, rank_score}). Caller is responsible for
        de-duplication (see get_existing_pairs).
        """

    @abstractmethod
    def get_pending(self, client_id: UUID) -> list[ClientLead]:
        """client_leads for this client not yet included in a sent digest,
        with inspection_event (+ its violations) eager-loaded.
        """

    @abstractmethod
    def mark_included(self, client_lead_ids: list[UUID], digest_id: UUID) -> None: ...

    @abstractmethod
    def get_paginated_for_client(
        self, client_id: UUID, *, limit: int, offset: int, category: ViolationCategory | None = None
    ) -> list[ClientLead]:
        """This client's leads, newest match first, with inspection_event
        (+ its violations) eager-loaded — the client dashboard's lead list.
        `category`, when given, restricts to leads whose underlying event
        has at least one violation of that category (admin leads filter).
        """

    @abstractmethod
    def count_for_client(self, client_id: UUID, *, category: ViolationCategory | None = None) -> int: ...

    @abstractmethod
    def count_all(self) -> int:
        """Admin dashboard stats."""

    @abstractmethod
    def count_recent_for_client(self, client_id: UUID, *, since: datetime) -> int: ...

    @abstractmethod
    def category_breakdown_for_client(self, client_id: UUID) -> dict[str, int]:
        """{category: number of this client's leads whose event has a
        violation of that category} — a lead with 2 categories counts
        toward both, same convention as the leads-table category chips.
        """

    @abstractmethod
    def weekly_counts_for_client(self, client_id: UUID, *, weeks: int) -> list[tuple[date, int]]:
        """[(week_start, count), ...] for this client's leads over the
        trailing `weeks` weeks, oldest first. Chart data for the client
        dashboard.
        """

    @abstractmethod
    def weekly_counts_all(self, *, weeks: int) -> list[tuple[date, int]]:
        """Same as weekly_counts_for_client but system-wide — admin dashboard."""

    @abstractmethod
    def category_breakdown_all(self) -> dict[str, int]:
        """System-wide version of category_breakdown_for_client — admin dashboard."""


class EmailDigestRepository(ABC):
    @abstractmethod
    def create(self, client_id: UUID, *, period_start: date, period_end: date, lead_count: int) -> EmailDigest: ...

    @abstractmethod
    def mark_sent(self, digest_id: UUID, *, provider_message_id: str) -> None: ...

    @abstractmethod
    def mark_failed(self, digest_id: UUID, *, error_message: str) -> None: ...

    @abstractmethod
    def get_paginated_for_client(self, client_id: UUID, *, limit: int, offset: int) -> list[EmailDigest]:
        """Most recent first — the client/admin "reports sent" history."""

    @abstractmethod
    def count_for_client(self, client_id: UUID) -> int: ...

    @abstractmethod
    def get_by_id_for_client(self, digest_id: UUID, client_id: UUID) -> EmailDigest | None:
        """Scoped to client_id so /me/digests/{id} can't be used to read
        another client's digest by guessing its UUID. Eager-loads the
        client_leads that were actually sent in it (report detail view)."""


class PasswordResetTokenRepository(ABC):
    @abstractmethod
    def create(self, client_id: UUID, *, token_hash: str, expires_at: datetime) -> PasswordResetToken: ...

    @abstractmethod
    def get_valid_by_hash(self, token_hash: str, *, now: datetime) -> PasswordResetToken | None:
        """Only returns a row that hasn't expired and hasn't been used yet."""

    @abstractmethod
    def mark_used(self, token_id: UUID, *, now: datetime) -> None: ...

    @abstractmethod
    def invalidate_all_for_client(self, client_id: UUID) -> None:
        """Called right after a successful reset so any other outstanding
        reset links also die with it — see auth_service.reset_password."""


class SubscriptionRepository(ABC):
    """One row per client (see Subscription.client_id unique) tracking the
    Dodo Payments subscription behind their $199/mo plan."""

    @abstractmethod
    def get_by_client_id(self, client_id: UUID) -> Subscription | None: ...

    @abstractmethod
    def get_by_provider_subscription_id(self, provider_subscription_id: str) -> Subscription | None: ...

    @abstractmethod
    def upsert_for_client(self, client_id: UUID, data: dict[str, Any]) -> Subscription:
        """Create the client's subscription row if this is the first
        webhook seen for them, else update the existing one in place —
        keeps webhook replays (Dodo retries undelivered events up to 8
        times) idempotent without a separate dedupe table."""


class PaymentRepository(ABC):
    """Append-only transaction log, one row per Dodo payment/refund event."""

    @abstractmethod
    def get_by_provider_payment_id(self, provider_payment_id: str) -> Payment | None:
        """Used to make payment.succeeded/payment.failed webhook handling
        idempotent — re-delivery updates the existing row instead of
        duplicating it."""

    @abstractmethod
    def create(self, data: dict[str, Any]) -> Payment: ...

    @abstractmethod
    def update_status(self, payment_id: UUID, *, status: PaymentStatus, paid_at: datetime | None) -> None: ...
