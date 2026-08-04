import enum


class ClientStatus(str, enum.Enum):
    # No self-serve signup or payment flow in this branch — accounts are
    # provisioned directly against the DB, already carrying whichever
    # status is appropriate.
    UNPAID = "unpaid"
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"


class ClientRole(str, enum.Enum):
    """No admin API/UI reads this in this branch — kept only as a data
    marker so the column still round-trips through /me."""

    CLIENT = "client"
    ADMIN = "admin"


class TerritoryKind(str, enum.Enum):
    ZIP = "zip"
    BOROUGH = "borough"
    LOCAL_AUTHORITY = "local_authority"
    RADIUS = "radius"
    # Matches every event in a city regardless of zip — set when a client's
    # account was provisioned with no specific zip codes (the "whole-city"
    # default).
    CITY = "city"


class ProcessingStatus(str, enum.Enum):
    """Pipeline state of a fetched inspection_event, set by ingestion
    (not part of this branch) — read-only here."""

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


class DigestStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
