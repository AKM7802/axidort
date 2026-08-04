"""All ORM models, imported here so `Base.metadata` is complete for Alembic
autogenerate and for `Base.metadata.create_all()` in tests.
"""

from app.models.admin import AdminUser
from app.models.base import Base
from app.models.billing import Payment, Subscription
from app.models.category_subscription import CategorySubscription
from app.models.client import Client
from app.models.data_quality import ZipMappingFlag
from app.models.do_not_contact import DoNotContact
from app.models.geo import City, State
from app.models.inspection import InspectionEvent
from app.models.lead import ClientLead
from app.models.notification import EmailDigest, EmailDigestLead, NotificationPreference
from app.models.password_reset import PasswordResetToken
from app.models.review_queue import ReviewQueue
from app.models.territory import Territory
from app.models.territory_option import TerritoryOption
from app.models.violation import Violation

__all__ = [
    "Base",
    "Client",
    "AdminUser",
    "Territory",
    "TerritoryOption",
    "CategorySubscription",
    "DoNotContact",
    "Subscription",
    "Payment",
    "InspectionEvent",
    "Violation",
    "ReviewQueue",
    "ClientLead",
    "NotificationPreference",
    "EmailDigest",
    "EmailDigestLead",
    "PasswordResetToken",
    "State",
    "City",
    "ZipMappingFlag",
]
