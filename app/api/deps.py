import uuid
from collections.abc import Iterator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.client import Client
from app.models.enums import ClientRole, ClientStatus

_client_bearer = HTTPBearer(auto_error=False, description="Token from POST /auth/signin")


def get_db_session() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_current_client(
    credentials: HTTPAuthorizationCredentials | None = Depends(_client_bearer),
    session: Session = Depends(get_db_session),
) -> Client:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="missing bearer token")

    try:
        payload = decode_access_token(credentials.credentials)
        client_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid or expired token") from None

    client = session.get(Client, client_id)
    if client is None or not client.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    return client


def get_current_admin(client: Client = Depends(get_current_client)) -> Client:
    """Same bearer token as get_current_client — admin-ness is just a role
    on that same Client row, not a separate login system."""
    if client.role != ClientRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="admin access required")
    return client


def require_active_subscription(client: Client = Depends(get_current_client)) -> Client:
    """Server-side enforcement of the paywall behind /me/leads, /me/stats,
    and /me/digests: a client only ever reaches status=active via a
    verified Dodo subscription.active webhook (see billing_service.
    handle_webhook) — never from signup or the checkout return_url alone.
    This is defense in depth on top of the frontend's own redirect to
    /payment for non-active clients.
    """
    if client.status != ClientStatus.ACTIVE:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, detail="an active subscription is required")
    return client
