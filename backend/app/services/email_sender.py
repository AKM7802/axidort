import base64
from typing import Protocol

import resend

from app.core.config import settings
from app.services.flask_mail_sender import FlaskMailSender


class EmailSenderProtocol(Protocol):
    """Structural interface both EmailSender (Resend) and FlaskMailSender
    (SMTP, see app.services.flask_mail_sender) satisfy — lets callers like
    digest_service.send_pending_digest accept either without depending on
    a concrete provider."""

    def send(
        self, *, to: str, subject: str, html: str, attachments: list[tuple[str, bytes]] | None = None
    ) -> str: ...


class EmailSender:
    """Thin wrapper around Resend so the digest service depends on this
    interface, not the SDK directly (same reasoning as the repository layer:
    swap the provider here without touching app/services/digest_service.py).
    """

    def __init__(self, api_key: str | None = None):
        resend.api_key = api_key or settings.resend_api_key

    def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        attachments: list[tuple[str, bytes]] | None = None,
    ) -> str:
        """attachments: list of (filename, raw_bytes) — base64-encoded here
        since that's what Resend's API expects on the wire.
        """
        params: dict = {
            "from": settings.resend_email,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        if attachments:
            params["attachments"] = [
                {"filename": filename, "content": base64.b64encode(content).decode("ascii")}
                for filename, content in attachments
            ]

        response = resend.Emails.send(params)
        return response["id"]


def get_email_sender() -> EmailSenderProtocol:
    """Single switch for which provider actually sends app-initiated email
    (password reset, subscription welcome, Service 2 digests) — see
    settings.email_provider (EMAIL_PROVIDER in .env). Everywhere that used
    to construct EmailSender() directly should call this instead so
    switching providers is one env var, not a code change.
    """
    if settings.email_provider == "resend":
        return EmailSender()
    return FlaskMailSender()
