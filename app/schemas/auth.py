import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.enums import ClientRole, ClientStatus, TerritoryKind, ViolationCategory


class SubscribableCategory(str, Enum):
    """The classifier's taxonomy minus 'other' — that bucket is a catch-all
    for the LLM's classification output, not a meaningful lead preference a
    client should be able to pick.
    """

    PEST = "pest"
    SANITATION = "sanitation"
    EQUIPMENT = "equipment"
    PLUMBING = "plumbing"
    TEMPERATURE = "temperature"


class SignupRequest(BaseModel):
    email: EmailStr
    # bcrypt silently ignores bytes past 72, so cap here rather than let
    # a long passphrase get quietly truncated.
    password: str = Field(min_length=8, max_length=72)

    company_name: str = Field(min_length=1, max_length=255)
    contact_name: str = Field(min_length=1, max_length=255)
    contact_phone: str | None = None
    business_address: str | None = None
    business_city: str | None = None
    business_state: str | None = None
    business_zip: str | None = None
    industry: str | None = None

    # Which city this client wants leads from — required; picked from
    # GET /geo/states (state -> city, Chicago-only for now).
    city_id: uuid.UUID

    # "How matching should happen": one mode per client. For zip/borough/
    # local_authority, territory_values must be chosen from
    # GET /territories/options (checked against the DB in auth_service,
    # not here — that's the "available list" the client picks from).
    # radius is the one mode with no picklist, since it's a continuous
    # value; each entry is instead validated for 'lat,lon,radius_km' shape.
    # zip is the one kind that may be left empty — that means "match the
    # whole city", not "no territory" (see auth_service.resolve_territory_rows).
    territory_kind: TerritoryKind
    territory_values: list[str] = Field(default_factory=list)

    # Which violation categories this client wants leads for — required,
    # since the matching query joins on it (no category sub = no leads).
    categories: list[SubscribableCategory] = Field(min_length=1)

    @model_validator(mode="after")
    def _validate_territory_values(self) -> "SignupRequest":
        if not self.territory_values:
            if self.territory_kind != TerritoryKind.ZIP:
                raise ValueError(f"at least one {self.territory_kind.value} value is required")
            return self  # empty zip values = whole-city match, allowed

        if self.territory_kind != TerritoryKind.RADIUS:
            return self
        for value in self.territory_values:
            parts = value.split(",")
            if len(parts) != 3:
                raise ValueError("radius value must be 'lat,lon,radius_km', e.g. '43.65,-79.38,15'")
            try:
                [float(part.strip()) for part in parts]
            except ValueError:
                raise ValueError("radius value must be 'lat,lon,radius_km' with numeric parts") from None
        return self


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class TerritoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: TerritoryKind
    value: str


class CategorySubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category: ViolationCategory


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    company_name: str
    contact_name: str
    status: ClientStatus
    role: ClientRole
    created_at: datetime
    territories: list[TerritoryOut] = []
    category_subscriptions: list[CategorySubscriptionOut] = []


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    client: ClientOut
