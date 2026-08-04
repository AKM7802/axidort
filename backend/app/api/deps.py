import uuid
from collections.abc import Iterator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.client import Client

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
