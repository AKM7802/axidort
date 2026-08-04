import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.client import Client
from app.repositories.factory import build_repositories
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
