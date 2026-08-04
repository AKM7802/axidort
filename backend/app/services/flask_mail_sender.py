from flask import Flask
from flask_mail import Mail, Message

from app.core.config import settings


class FlaskMailSender:
    """Email delivery via SMTP (through Flask-Mail) — the default provider
    everywhere (see settings.email_provider / get_email_sender() in
    app.services.email_sender), since it needs no domain verification and
    works immediately with e.g. a Gmail app password, unlike Resend's
    sandbox tier (which only delivers to the account owner's own address
    until a domain is verified). Switch email_provider to "resend" in
    production once that's done.

    scripts/resend_digest.py always constructs this directly, bypassing
    email_provider — its purpose is specifically to retry a failed send
    through the *other* provider from whatever's configured as default.

    Flask-Mail is built for use inside a running Flask app; here it's only
    ever constructed to hold SMTP config and open a connection — a bare
    Flask app object (never served, no routes, no server) is enough, but
    Flask-Mail's internals (message building, not just the sender fallback)
    reach for `current_app` in a few places, so every send still has to
    happen inside that app's `app_context()`.
    """

    def __init__(self):
        if not settings.mail_server or not settings.mail_username or not settings.mail_password:
            raise RuntimeError(
                "MAIL_SERVER, MAIL_USERNAME, and MAIL_PASSWORD must be set in .env to use FlaskMailSender"
            )

        app = Flask(__name__)
        app.config.update(
            MAIL_SERVER=settings.mail_server,
            MAIL_PORT=settings.mail_port,
            MAIL_USE_TLS=settings.mail_use_tls,
            MAIL_USE_SSL=settings.mail_use_ssl,
            MAIL_USERNAME=settings.mail_username,
            MAIL_PASSWORD=settings.mail_password,
            MAIL_DEFAULT_SENDER=settings.mail_default_sender or settings.mail_username,
        )
        self._app = app
        self._mail = Mail(app)
        self._default_sender = settings.mail_default_sender or settings.mail_username

    def send(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        attachments: list[tuple[str, bytes]] | None = None,
    ) -> str:
        with self._app.app_context():
            message = Message(subject=subject, recipients=[to], html=html, sender=self._default_sender)
            for filename, content in attachments or []:
                message.attach(filename=filename, content_type="text/csv", data=content)
            self._mail.send(message)
        return message.msgId
