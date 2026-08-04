import enum


class ClientStatus(str, enum.Enum):
    # Default on signup: account + territories/categories are saved, but no
    # leads are matched or emailed (see lead_matching.py, digest_service.py,
    # and the require_active_subscription dependency on /me/*) until the
    # $199/mo Dodo Payments checkout succeeds and the subscription.active
    # webhook flips this to ACTIVE.
    UNPAID = "unpaid"
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"


class ClientRole(str, enum.Enum):
    """Grants admin-dashboard access when set to ADMIN — checked directly
    off the Client row loaded for the request's own bearer token, so there
    is no separate admin login system to keep in sync."""

    CLIENT = "client"
    ADMIN = "admin"


class TerritoryKind(str, enum.Enum):
    ZIP = "zip"
    BOROUGH = "borough"
    LOCAL_AUTHORITY = "local_authority"
    RADIUS = "radius"
    # Matches every event in a city regardless of zip — created when a
    # client picks a city at signup but leaves zip codes empty (the
    # "whole-city" default, see auth_service.signup).
    CITY = "city"


class ProcessingStatus(str, enum.Enum):
    """Pipeline state of a fetched inspection_event, per Service 1."""

    RAW = "raw"
    CLASSIFIED = "classified"
    REVIEWED = "reviewed"
    LEAD_CREATED = "lead_created"


class ViolationCategory(str, enum.Enum):
    PEST = "pest"
    SANITATION = "sanitation"
    EQUIPMENT = "equipment"
    PLUMBING = "plumbing"
    TEMPERATURE = "temperature"
    OTHER = "other"


class ViolationSeverity(str, enum.Enum):
    CLOSURE = "closure"
    CRITICAL = "critical"
    CITATION = "citation"
    CONDUCIVE = "conducive"


class ReviewStatus(str, enum.Enum):
    """Queue for low ai_confidence classifications (<0.8), per intro.md comment."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class BillingInterval(str, enum.Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscriptionStatus(str, enum.Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"


class PaymentStatus(str, enum.Enum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    PENDING = "pending"
    REFUNDED = "refunded"


class DigestStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
