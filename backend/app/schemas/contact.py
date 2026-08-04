from pydantic import BaseModel, EmailStr, Field


class ContactRequest(BaseModel):
    email: EmailStr
    business_type: str = Field(min_length=1, max_length=255)
    # Which button on the site opened the form, e.g. "Pro plan button",
    # "Enterprise plan button", "Login page button", "Footer button" — lets
    # the mailed-in lead show where the interest came from.
    source: str | None = None
