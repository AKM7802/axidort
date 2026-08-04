from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.repositories.interfaces import (
    ClientLeadRepository,
    ClientRepository,
    EmailDigestRepository,
    GeoRepository,
    PasswordResetTokenRepository,
)
from app.repositories.sqlalchemy_repo import (
    SqlAlchemyClientLeadRepository,
    SqlAlchemyClientRepository,
    SqlAlchemyEmailDigestRepository,
    SqlAlchemyGeoRepository,
    SqlAlchemyPasswordResetTokenRepository,
)


@dataclass
class Repositories:
    clients: ClientRepository
    client_leads: ClientLeadRepository
    email_digests: EmailDigestRepository
    password_reset_tokens: PasswordResetTokenRepository
    geo: GeoRepository


def build_repositories(session: Session) -> Repositories:
    """The single wiring point between the abstract repository interfaces
    and a concrete storage backend. Service code depends only on the
    interfaces in `interfaces.py`; to move off SQLAlchemy/Postgres (e.g. to
    Supabase's PostgREST client or another store entirely), swap the
    implementations constructed here — nothing in app/services/ changes.
    """

    return Repositories(
        clients=SqlAlchemyClientRepository(session),
        client_leads=SqlAlchemyClientLeadRepository(session),
        email_digests=SqlAlchemyEmailDigestRepository(session),
        password_reset_tokens=SqlAlchemyPasswordResetTokenRepository(session),
        geo=SqlAlchemyGeoRepository(session),
    )
