from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All environment-driven config in one place.

    `database_url` is the single switch for storage: point it at Supabase's
    connection-pooler string today, at a plain Postgres/RDS instance
    tomorrow, and nothing outside this file has to change since the rest of
    the app talks to SQLAlchemy, not to Supabase itself.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/postgres"

    resend_api_key: str | None = None
    resend_email: str = "leads@example.com"

    # API auth (clients — our own signin). There is no signup or admin
    # API/UI in this branch — it was trimmed down to just the landing page
    # and client dashboard.
    jwt_secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week

    # Base URL of the Next.js frontend — used only to build the link inside
    # password-reset emails (e.g. f"{frontend_url}/reset-password?token=...").
    frontend_url: str = "http://localhost:3000"

    # Where POST /contact submissions (landing-page pricing card + login
    # "contact us" forms) get emailed — see app/api/routes/contact.py.
    contact_recipient_email: str = "aswinkunjufreelancer@gmail.com"

    # Which provider app.services.email_sender.get_email_sender() returns —
    # every app-initiated email (password reset) goes through whichever one
    # this points at. "flask_mail" (SMTP, e.g. Gmail) by default so local/
    # test setups work without hitting Resend's sandbox restriction (free
    # tier only delivers to the account owner's own address until a domain
    # is verified — see resend.com/domains); set to "resend" once that's
    # done for prod.
    email_provider: Literal["flask_mail", "resend"] = "flask_mail"

    # SMTP (via Flask-Mail) — the default email provider per email_provider
    # above.
    mail_server: str | None = None
    mail_port: int = 587
    mail_use_tls: bool = True
    mail_use_ssl: bool = False
    mail_username: str | None = None
    mail_password: str | None = None
    mail_default_sender: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
