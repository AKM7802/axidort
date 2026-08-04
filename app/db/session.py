from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def normalize_database_url(url: str) -> str:
    """Accept a plain `postgresql://` connection string (what Supabase and
    most providers hand you) and route it through the psycopg3 driver we
    depend on, without requiring callers to know SQLAlchemy dialect syntax.
    An explicit driver (e.g. `postgresql+psycopg://`) is left untouched.
    """
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


# The only place a DB connection is opened. `settings.database_url` works
# unchanged for Supabase's Postgres connection string, a local Postgres
# instance, or any other Postgres-compatible host — switching providers is
# an env var change, not a code change.
engine = create_engine(normalize_database_url(settings.database_url), pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@contextmanager
def get_db() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
