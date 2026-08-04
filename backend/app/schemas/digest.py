import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import DigestStatus
from app.schemas.me import LeadOut


class EmailDigestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    period_start: date
    period_end: date
    lead_count: int
    status: DigestStatus
    sent_at: datetime | None
    created_at: datetime


class PaginatedDigestsOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[EmailDigestOut]


class EmailDigestDetailOut(EmailDigestOut):
    """Same fields as the list row, plus exactly which leads were sent in
    this report — read off email_digest_leads, not re-queried by date
    range, so it reflects what actually went out even if matching criteria
    change later."""

    leads: list[LeadOut]

    @classmethod
    def from_digest(cls, digest) -> "EmailDigestDetailOut":
        return cls(
            id=digest.id,
            period_start=digest.period_start,
            period_end=digest.period_end,
            lead_count=digest.lead_count,
            status=digest.status,
            sent_at=digest.sent_at,
            created_at=digest.created_at,
            leads=[LeadOut.model_validate(link.client_lead) for link in digest.lead_links],
        )
