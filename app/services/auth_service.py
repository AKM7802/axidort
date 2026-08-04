import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.client import Client
from app.models.enums import TerritoryKind, ViolationCategory
from app.models.geo import City
from app.repositories.factory import Repositories, build_repositories
from app.schemas.auth import SubscribableCategory
from app.services.email_sender import get_email_sender
from app.services.email_templates import build_password_reset_email

logger = logging.getLogger(__name__)

# How long a password-reset link stays valid before the client has to
# request a new one.
RESET_TOKEN_TTL = timedelta(hours=1)


def _hash_reset_token(token: str) -> str:
    """SHA-256 is fine here (unlike password hashing) because the token
    itself is 256 bits of randomness, not something a human chose — there's
    no dictionary/brute-force risk to slow down, only a lookup key to
    protect against a leaked DB row.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def validate_territory_values(
    repos: Repositories, city: City, territory_kind: TerritoryKind, territory_values: list[str]
) -> None:
    """Raises 422 if any value isn't a real, seeded option for this city.
    radius has no picklist (continuous value, format-checked by the request
    schema instead); zip/borough/local_authority must come from the seeded
    list. Shared by signup and admin client create/update so both enforce
    the same rule.
    """
    if territory_kind == TerritoryKind.RADIUS:
        return
    invalid_values = [
        value for value in territory_values if not repos.territory_options.exists(city.code, territory_kind, value)
    ]
    if invalid_values:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"not a valid {territory_kind.value} for {city.name}: {', '.join(invalid_values)}. "
                f"See GET /territories/options?kind={territory_kind.value}&city_id={city.id} for valid values."
            ),
        )


def resolve_territory_rows(
    repos: Repositories, city_id: UUID, territory_kind: TerritoryKind, territory_values: list[str]
) -> list[dict]:
    """Turns (city_id, territory_kind, territory_values) into the actual
    Territory rows to create. zip with no values means "match this whole
    city" (a single CITY-kind territory, see territory_matching.py); zip
    with values means those specific zips; any other kind is used as-is
    (its values are already required non-empty by the request schema).
    Shared by signup and admin client create/update so both stay in sync.
    """
    city = repos.geo.get_city_by_id(city_id)
    if city is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="not a valid city")

    validate_territory_values(repos, city, territory_kind, territory_values)

    if territory_kind == TerritoryKind.ZIP and not territory_values:
        return [{"kind": TerritoryKind.CITY, "value": str(city.id)}]
    return [{"kind": territory_kind, "value": value} for value in territory_values]


def signup(
    session: Session,
    *,
    email: str,
    password: str,
    city_id: UUID,
    territory_kind: TerritoryKind,
    territory_values: list[str],
    categories: list[SubscribableCategory],
    **client_details: str | None,
) -> tuple[Client, str]:
    repos = build_repositories(session)

    if repos.clients.get_by_email(email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email already registered")

    territory_rows = resolve_territory_rows(repos, city_id, territory_kind, territory_values)

    client = repos.clients.create(
        {"email": email, "hashed_password": hash_password(password), **client_details}
    )
    repos.territories.create_many(client.id, territory_rows)
    repos.category_subscriptions.create_many(
        client.id, [ViolationCategory(category.value) for category in categories]
    )

    # "next run should be set as tomorrow from the joining date"
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    repos.notification_preferences.create(client.id, next_run_at=tomorrow)

    token = create_access_token(subject=str(client.id))
    return client, token


def signin(session: Session, *, email: str, password: str) -> tuple[Client, str]:
    repos = build_repositories(session)

    client = repos.clients.get_by_email(email)
    if client is None or not verify_password(password, client.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid email or password")
    if not client.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="account is inactive")

    repos.clients.update_last_login(client.id, now=datetime.now(timezone.utc))
    token = create_access_token(subject=str(client.id))
    return client, token


def request_password_reset(session: Session, *, email: str) -> None:
    """Always returns successfully to the caller regardless of whether the
    email matches an account — otherwise the response itself would leak
    which addresses are registered (email enumeration). If it does match
    an active client, a one-time reset link is emailed to them.
    """
    repos = build_repositories(session)
    client = repos.clients.get_by_email(email)
    if client is None or not client.is_active:
        return

    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + RESET_TOKEN_TTL
    repos.password_reset_tokens.create(
        client.id, token_hash=_hash_reset_token(raw_token), expires_at=expires_at
    )

    reset_url = f"{settings.frontend_url}/reset-password?token={raw_token}"
    subject, html = build_password_reset_email(
        client_name=client.contact_name,
        reset_url=reset_url,
        ttl_hours=int(RESET_TOKEN_TTL.total_seconds() // 3600),
    )
    try:
        get_email_sender().send(to=client.email, subject=subject, html=html)
    except Exception:
        # A delivery failure (bad recipient, provider outage) shouldn't turn
        # into a 500 here — that would both break the "always succeeds"
        # contract (see docstring) and hand back a distinguishing signal
        # between "email exists" and "email delivery broke".
        logger.exception("password reset email failed to send for client %s", client.id)


def reset_password(session: Session, *, token: str, new_password: str) -> None:
    repos = build_repositories(session)
    now = datetime.now(timezone.utc)

    record = repos.password_reset_tokens.get_valid_by_hash(_hash_reset_token(token), now=now)
    if record is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid or expired reset link")

    client = repos.clients.get_by_id(record.client_id)
    if client is None or not client.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid or expired reset link")

    repos.clients.update_password(client.id, hashed_password=hash_password(new_password))
    repos.password_reset_tokens.mark_used(record.id, now=now)
    # Any other outstanding reset links this client was emailed also die
    # with this one, same as most password managers/auth providers do.
    repos.password_reset_tokens.invalidate_all_for_client(client.id)
