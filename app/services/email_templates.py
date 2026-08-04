import csv
import io
from datetime import date
from html import escape

from app.models.enums import ViolationSeverity
from app.models.lead import ClientLead


def _format_date(value: date) -> str:
    """"August 10, 2026" — used for reader-facing dates (unlike the
    machine-oriented isoformat() dates in the digest email/CSV below).
    Built from .day rather than strftime's %-d so it's portable (%-d is a
    glibc/macOS extension, not available on Windows).
    """
    return f"{value:%B} {value.day}, {value.year}"


def build_digest_email(
    *,
    client_name: str,
    period_start: date,
    period_end: date,
    client_leads: list[ClientLead],
    subscribed_categories: set[str],
) -> tuple[str, str]:
    """Returns (subject, html) for a client's lead-digest email.

    Leads are shown highest rank_score first. Per lead, only the categories
    this client actually subscribes to are shown as full-weight chips —
    other categories the same event was also cited for are real but not
    what they're paying for, so they're folded into a quieter "also cited"
    note instead of diluting the subscribed-category signal.
    """
    ordered_leads = sorted(client_leads, key=lambda lead: lead.rank_score or 0, reverse=True)

    cited = len(ordered_leads)
    closed = sum(
        1
        for lead in ordered_leads
        if any(v.severity == ViolationSeverity.CLOSURE for v in lead.inspection_event.violations)
    )

    subject = f"{cited} new lead{'s' if cited != 1 else ''} this week"

    cards = "".join(_lead_card_html(lead, subscribed_categories) for lead in ordered_leads)
    html = f"""\
<html>
  <body style="font-family: sans-serif; color: #1a1a1a; max-width: 640px; margin: 0 auto;">
    <p>Hi {escape(client_name)},</p>
    <p>
      {cited} cited, {closed} closed in your territory between
      {period_start.isoformat()} and {period_end.isoformat()}.
    </p>
    {cards}
    <p style="font-size:12px;color:#888;">
      A CSV with every lead's full detail (address, categories, species, rank score) is
      attached to this email.
    </p>
  </body>
</html>
"""
    return subject, html


def _lead_card_html(client_lead: ClientLead, subscribed_categories: set[str]) -> str:
    event = client_lead.inspection_event
    address_parts = [event.address_line, event.municipality, event.state, event.postal_code]
    address = ", ".join(part for part in address_parts if part)

    event_categories = {v.category.value for v in event.violations}
    subscribed_here = sorted(event_categories & subscribed_categories)
    other_here = sorted(event_categories - subscribed_categories)

    chips = "".join(
        f'<span style="background:#eee;border-radius:4px;padding:2px 8px;margin-right:4px;'
        f'font-size:12px;">{escape(category)}</span>'
        for category in subscribed_here
    )
    other_note = (
        f'<p style="margin:4px 0 0;font-size:11px;color:#999;">Also cited: {escape(", ".join(other_here))}</p>'
        if other_here
        else ""
    )
    issue_html = (
        f'<p style="margin:8px 0;color:#333;">{escape(event.narration)}</p>' if event.narration else ""
    )

    return f"""\
    <div style="border:1px solid #ddd;border-radius:6px;padding:12px;margin-bottom:10px;">
      <strong>{escape(event.business_name)}</strong><br>
      <span style="color:#555;">{escape(address)}</span>
      <p style="margin:8px 0 2px;">
        {event.inspection_date.isoformat() if event.inspection_date else '—'} &middot;
        {escape(event.result or '—')}
      </p>
      {issue_html}
      <div>{chips}</div>
      {other_note}
    </div>
"""


def render_csv(client_leads: list[ClientLead]) -> bytes:
    """A downloadable CSV with every lead's full detail, attached to the
    digest email so nothing is limited to what fits in the HTML cards.
    """
    ordered_leads = sorted(client_leads, key=lambda lead: lead.rank_score or 0, reverse=True)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "business_name",
            "address",
            "municipality",
            "state",
            "postal_code",
            "inspection_date",
            "result",
            "categories",
            "species",
            "severity",
            "issue_description",
        ]
    )
    for lead in ordered_leads:
        event = lead.inspection_event
        address_parts = [event.address_line, event.municipality, event.state, event.postal_code]
        address = ", ".join(part for part in address_parts if part)
        categories = sorted({v.category.value for v in event.violations})
        species = sorted({s.lower() for v in event.violations for s in (v.species or [])})
        severities = sorted({v.severity.value for v in event.violations})

        writer.writerow(
            [
                event.business_name,
                address,
                event.municipality or "",
                event.state or "",
                event.postal_code or "",
                event.inspection_date.isoformat() if event.inspection_date else "",
                event.result or "",
                "|".join(categories),
                "|".join(species),
                "|".join(severities),
                event.narration or "",
            ]
        )
    return buf.getvalue().encode("utf-8")


def build_password_reset_email(*, client_name: str, reset_url: str, ttl_hours: int) -> tuple[str, str]:
    """Returns (subject, html) for the "reset your password" email. The
    link itself carries the one-time token as a query param; nothing
    sensitive is in this template beyond that URL.
    """
    subject = "Reset your password"
    html = f"""\
<html>
  <body style="font-family: sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
    <p>Hi {escape(client_name)},</p>
    <p>We received a request to reset your password. Click the button below to choose a new one:</p>
    <p style="margin: 24px 0;">
      <a href="{escape(reset_url)}"
         style="background:#4338ca;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
        Reset password
      </a>
    </p>
    <p style="font-size:13px;color:#666;">
      This link expires in {ttl_hours} hour{"s" if ttl_hours != 1 else ""} and can only be used once.
      If you didn't request this, you can safely ignore this email — your password won't change.
    </p>
    <p style="font-size:12px;color:#888;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      {escape(reset_url)}
    </p>
  </body>
</html>
"""
    return subject, html


def build_subscription_welcome_email(*, client_name: str, next_data_date: date) -> tuple[str, str]:
    """Returns (subject, html) for the one-time email sent when a client's
    Dodo subscription verifiably activates (see billing_service.
    _apply_subscription_event) — the "you're paid up, here's what's next"
    welcome message. next_data_date is the upcoming Monday, Service 2's
    weekly digest day (see DIGEST_SEND_MODE in app/core/config.py).
    """
    subject = "Welcome to Leadwire — your subscription is active"
    formatted_date = _format_date(next_data_date)
    html = f"""\
<html>
  <body style="font-family: sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
    <p>Hi {escape(client_name)},</p>
    <p>Thanks for subscribing — your $199/mo Leadwire plan is now active.</p>
    <p>
      Your territories and lead categories are already set from signup, so there's nothing
      else to do. You'll get your first batch of matched leads starting
      <strong>{formatted_date}</strong>, and every Monday after that.
    </p>
    <p style="font-size:13px;color:#666;">
      You can view your account, leads, and reports any time from your dashboard.
    </p>
  </body>
</html>
"""
    return subject, html
