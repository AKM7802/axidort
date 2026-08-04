"""All ORM models, imported here so `Base.metadata` is complete for Alembic
autogenerate and for `Base.metadata.create_all()` in tests.
"""

from app.models.base import Base
from app.models.category_subscription import CategorySubscription
from app.models.client import Client
from app.models.geo import City, State
from app.models.inspection import InspectionEvent
from app.models.lead import ClientLead
from app.models.notification import EmailDigest, EmailDigestLead
from app.models.password_reset import PasswordResetToken
from app.models.territory import Territory
from app.models.violation import Violation

__all__ = [
    "Base",
    "Client",
    "Territory",
    "CategorySubscription",
    "InspectionEvent",
    "Violation",
    "ClientLead",
    "EmailDigest",
    "EmailDigestLead",
    "PasswordResetToken",
    "State",
    "City",
]
