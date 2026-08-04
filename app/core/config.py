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

    socrata_app_token: str | None = None
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    resend_api_key: str | None = None
    resend_email: str = "leads@example.com"

    classifier_version: str = "classify_v1"
    classifier_confidence_threshold: float = 0.8

    # Service 2 (lead-digest emails):
    # - "instant": every active client is matched and emailed on every run.
    # - "scheduled": only clients whose next_run_at has arrived are processed.
    # Either way, a successful send advances next_run_at by lead_lookback_days.
    digest_send_mode: Literal["instant", "scheduled"] = "scheduled"
    lead_lookback_days: int = 7

    # API auth (clients — our own signup/signin). Admin access is the same
    # token/login: a Client with role=ClientRole.ADMIN can hit /admin/*
    # (see get_current_admin) — there is no separate admin login system.
    jwt_secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week

    # Base URL of the Next.js frontend — used only to build the link inside
    # password-reset emails (e.g. f"{frontend_url}/reset-password?token=...").
    frontend_url: str = "http://localhost:3000"

    # Which provider app.services.email_sender.get_email_sender() returns —
    # every app-initiated email (password reset, subscription welcome, and
    # Service 2's digests) goes through whichever one this points at.
    # "flask_mail" (SMTP, e.g. Gmail) by default so local/test setups work
    # without hitting Resend's sandbox restriction (free tier only delivers
    # to the account owner's own address until a domain is verified there —
    # see resend.com/domains); set to "resend" once that's done for prod.
    # scripts/resend_digest.py always uses Flask-Mail directly regardless of
    # this setting — its whole purpose is retrying through the *other*
    # provider when the configured default one is what failed.
    email_provider: Literal["flask_mail", "resend"] = "flask_mail"

    # SMTP (via Flask-Mail) — the default email provider per email_provider
    # above, and always used directly (bypassing that toggle) by
    # scripts/resend_digest.py.
    mail_server: str | None = None
    mail_port: int = 587
    mail_use_tls: bool = True
    mail_use_ssl: bool = False
    mail_username: str | None = None
    mail_password: str | None = None
    mail_default_sender: str | None = None

    # Dodo Payments (test mode during development — see
    # docs.dodopayments.com). Powers the $199/mo subscription gate: signup
    # creates a client with status=unpaid (no leads matched/emailed until
    # paid, see app/services/lead_matching.py and digest_service.py);
    # POST /billing/checkout-session starts a hosted Checkout Session for
    # dodo_payments_product_id, and POST /billing/webhook flips the client
    # to status=active only once Dodo's verified subscription.active event
    # arrives — never on the browser's return_url redirect alone.
    dodo_payments_api_key: str | None = None
    dodo_payments_webhook_key: str | None = None
    dodo_payments_environment: Literal["test_mode", "live_mode"] = "test_mode"
    # The pdt_... id of the $199/mo subscription product, created in the
    # Dodo dashboard (Products -> New -> Subscription, price $199/month).
    dodo_payments_product_id: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
