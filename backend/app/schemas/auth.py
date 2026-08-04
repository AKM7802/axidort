import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import ClientRole, ClientStatus, TerritoryKind, ViolationCategory


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
