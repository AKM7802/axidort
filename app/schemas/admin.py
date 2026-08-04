import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import ClientRole, ClientStatus, TerritoryKind, ViolationCategory
from app.schemas.auth import SubscribableCategory, TerritoryOut
from app.schemas.stats import CategoryCountOut, WeeklyCountOut


class AdminCategorySubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: ViolationCategory


class AdminClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    company_name: str
    contact_name: str
    contact_phone: str | None
    business_address: str | None
    business_city: str | None
    business_state: str | None
    business_zip: str | None
    industry: str | None
    status: ClientStatus
    role: ClientRole
    is_active: bool
    is_exclusive: bool
    created_at: datetime
    territories: list[TerritoryOut] = []
    category_subscriptions: list[AdminCategorySubscriptionOut] = []


class AdminReviewQueueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: str
    created_at: datetime
    violation_id: uuid.UUID
    business_name: str
    category: ViolationCategory
    description_raw: str | None
    ai_confidence: float | None


class AdminZipMappingFlagOut(BaseModel):
    id: uuid.UUID
    inspection_event_id: uuid.UUID
    business_name: str
    inspection_date: date | None
    city_name: str
    postal_code: str | None
    description: str
    created_at: datetime


class PaginatedZipMappingFlagsOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[AdminZipMappingFlagOut]


class AdminStatsOut(BaseModel):
    total_clients: int
    total_inspection_events: int
    total_leads: int
    pending_review_queue: int
    leads_by_week: list[WeeklyCountOut]
    clients_by_week: list[WeeklyCountOut]
    leads_by_category: list[CategoryCountOut]


class AdminUpdateClientRequest(BaseModel):
    """Full replace of territories/categories (same convention as signup),
    plus the admin-only flags no self-service endpoint can touch.
    """

    city_id: uuid.UUID
    territory_kind: TerritoryKind
    # Same rule as signup: only zip may be left empty, meaning "match the
    # whole city" (see auth_service.resolve_territory_rows).
    territory_values: list[str] = Field(default_factory=list)
    categories: list[SubscribableCategory] = Field(min_length=1)
    is_active: bool
    is_exclusive: bool
    status: ClientStatus

    @model_validator(mode="after")
    def _validate_territory_values(self) -> "AdminUpdateClientRequest":
        if not self.territory_values and self.territory_kind != TerritoryKind.ZIP:
            raise ValueError(f"at least one {self.territory_kind.value} value is required")
        return self
