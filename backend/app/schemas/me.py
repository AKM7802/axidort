import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import ViolationCategory, ViolationSeverity
from app.schemas.auth import ClientOut


class MeOut(ClientOut):
    """GET /me — same shape as the signup response's client, kept as its
    own schema in case the dashboard needs fields signup doesn't return."""


class ViolationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: ViolationCategory
    severity: ViolationSeverity
    species: list[str] | None
    description_raw: str | None


class LeadEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    business_name: str
    address_line: str | None
    municipality: str | None
    state: str | None
    postal_code: str | None
    inspection_date: date | None
    result: str | None
    narration: str | None
    violations: list[ViolationOut]


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    matched_at: datetime
    included_in_email: bool
    rank_score: float | None
    inspection_event: LeadEventOut


class PaginatedLeadsOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[LeadOut]
