from html import escape

from fastapi import APIRouter, status

from app.core.config import settings
from app.schemas.contact import ContactRequest
from app.services.email_sender import get_email_sender

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
def submit_contact(payload: ContactRequest) -> None:
    """Public — no auth. Landing-page pricing cards and the login page's
    "contact us" link both post here; the submission is emailed straight to
    settings.contact_recipient_email rather than stored, since there's no
    admin panel left to manage accounts from — client creation now happens
    by hand (direct DB access) after this email is read."""
    source_line = f"<p><strong>Source:</strong> {escape(payload.source)}</p>" if payload.source else ""
    html = f"""\
<html>
  <body style="font-family: sans-serif; color: #1a1a1a;">
    <p>New contact form submission:</p>
    <p><strong>Email:</strong> {escape(payload.email)}</p>
    <p><strong>Business type:</strong> {escape(payload.business_type)}</p>
    {source_line}
  </body>
</html>
"""
    get_email_sender().send(
        to=settings.contact_recipient_email,
        subject=f"New contact request — {payload.business_type}",
        html=html,
    )
