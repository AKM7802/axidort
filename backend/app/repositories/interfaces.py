from abc import ABC, abstractmethod
from datetime import date, datetime
from uuid import UUID

from app.models.client import Client
from app.models.enums import ViolationCategory
from app.models.geo import State
from app.models.lead import ClientLead
from app.models.notification import EmailDigest
from app.models.password_reset import PasswordResetToken


class GeoRepository(ABC):
    @abstractmethod
    def list_states_with_cities(self) -> list[State]:
        """Every state, with its cities eager-loaded — used to resolve
        territory city ids into display names on the client dashboard.
        Tiny table, no pagination needed."""


class ClientRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> Client | None: ...

    @abstractmethod
    def get_by_id(self, client_id: UUID) -> Client | None: ...

    @abstractmethod
    def update_last_login(self, client_id: UUID, *, now: datetime) -> None: ...

    @abstractmethod
    def update_password(self, client_id: UUID, *, hashed_password: str) -> None: ...


class ClientLeadRepository(ABC):
    @abstractmethod
    def get_paginated_for_client(
        self, client_id: UUID, *, limit: int, offset: int, category: ViolationCategory | None = None
    ) -> list[ClientLead]:
        """This client's leads, newest match first, with inspection_event
        (+ its violations) eager-loaded — the client dashboard's lead list.
        """

    @abstractmethod
    def count_for_client(self, client_id: UUID, *, category: ViolationCategory | None = None) -> int: ...

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


class EmailDigestRepository(ABC):
    @abstractmethod
    def get_paginated_for_client(self, client_id: UUID, *, limit: int, offset: int) -> list[EmailDigest]:
        """Most recent first — the client's "reports sent" history."""

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
