import logging
import time
from datetime import date, datetime, timedelta, timezone

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.client import Client
from app.models.enums import ClientStatus
from app.repositories.factory import Repositories, build_repositories
from app.services.email_sender import EmailSenderProtocol, get_email_sender
from app.services.email_templates import build_digest_email, render_csv
from app.services.lead_matching import run_lead_matching
from app.services.lead_narration import LeadNarrator

logger = logging.getLogger(__name__)


def send_pending_digest(
    repos: Repositories,
    client: Client,
    *,
    since: date,
    now: datetime,
    narrator: LeadNarrator,
    email_sender: EmailSenderProtocol,
) -> bool | None:
    """Sends one client's currently-pending leads as a digest right now —
    the same per-client logic run_digest's loop uses, factored out so a
    one-off retry (e.g. scripts/resend_digest.py, after a send failed) can
    reuse it without re-running lead matching.

    Returns True if the send succeeded, False if it was attempted and
    failed, or None if there was nothing pending to send.
    """
    pending = repos.client_leads.get_pending(client.id)
    if not pending:
        return None

    # Cached per event (not per client/digest): generate once, reuse on
    # every future digest that includes this same event.
    for lead in pending:
        if not lead.inspection_event.narration:
            narration = narrator.narrate(lead.inspection_event)
            if narration:
                repos.events.set_narration(lead.inspection_event.id, narration)
                lead.inspection_event.narration = narration

    digest = repos.email_digests.create(
        client.id, period_start=since, period_end=now.date(), lead_count=len(pending)
    )

    subject, html = build_digest_email(
        client_name=client.contact_name,
        period_start=since,
        period_end=now.date(),
        client_leads=pending,
        subscribed_categories={sub.category.value for sub in client.category_subscriptions},
    )
    csv_bytes = render_csv(pending)

    try:
        message_id = email_sender.send(
            to=client.email, subject=subject, html=html, attachments=[("leads.csv", csv_bytes)]
        )
        repos.email_digests.mark_sent(digest.id, provider_message_id=message_id)
        repos.client_leads.mark_included([lead.id for lead in pending], digest.id)
        return True
    except Exception as exc:
        # Not rescheduled by the caller: next_run_at stays put so this
        # client is retried next run instead of silently skipped for a cycle.
        repos.email_digests.mark_failed(digest.id, error_message=str(exc))
        logger.exception("digest send failed for client_id=%s", client.id)
        return False


def run_digest(now: datetime | None = None) -> int:
    """Service 2: match the last `settings.lead_lookback_days` days of leads
    to clients -> find who should get an email this run -> send a digest ->
    mark it sent.

    Matching runs once, globally, before the per-client loop (see
    app.services.lead_matching) since exclusivity has to be resolved across
    every candidate client for a restaurant, not client-by-client.

    Which clients are "who should get an email" depends on
    settings.digest_send_mode:
      - "instant": every active client, every run.
      - "scheduled": only clients whose next_run_at has arrived.
    Either way, next_run_at only advances (by lead_lookback_days) when a
    digest is actually sent — a skipped (no leads) or failed send leaves it
    untouched so the client is picked up again next run.

    Each client is committed independently so one failure (a flaky send)
    can't roll back another client's run.

    Returns the number of clients an email was actually sent to.
    """
    now = now or datetime.now(timezone.utc)
    since = now - timedelta(days=settings.lead_lookback_days)
    run_started = time.monotonic()
    email_sender = get_email_sender()
    narrator = LeadNarrator()

    session = SessionLocal()
    try:
        repos = build_repositories(session)
        matched = run_lead_matching(repos, since=since, now=now)
        session.commit()
        if matched:
            logger.info("service2 lead matching created %d client_leads", matched)
    except Exception:
        session.rollback()
        logger.exception("service2 lead matching failed")
    finally:
        session.close()

    session = SessionLocal()
    try:
        repos = build_repositories(session)
        if settings.digest_send_mode == "instant":
            preferences = repos.notification_preferences.get_all_active()
        else:
            preferences = repos.notification_preferences.get_due_today(now.date())
    finally:
        session.close()

    candidates = len(preferences)
    logger.info(
        "service2 digest run starting mode=%s candidates=%d", settings.digest_send_mode, candidates
    )

    sent = 0
    skipped = 0
    failed = 0
    for i, preference in enumerate(preferences, start=1):
        client_started = time.monotonic()
        session = SessionLocal()
        try:
            repos = build_repositories(session)
            client = preference.client

            if not client.is_active or client.status != ClientStatus.ACTIVE:
                session.commit()
                skipped += 1
                logger.info(
                    "service2 skipped %d/%d client_id=%s: inactive or subscription not active", i, candidates, client.id
                )
                continue

            result = send_pending_digest(
                repos, client, since=since.date(), now=now, narrator=narrator, email_sender=email_sender
            )

            if result is None:
                skipped += 1
                logger.info(
                    "service2 skipped %d/%d client_id=%s: no pending leads", i, candidates, client.id
                )
            elif result is True:
                repos.notification_preferences.reschedule(preference.id, now=now)
                sent += 1
                logger.info(
                    "service2 sent %d/%d client_id=%s in %.2fs",
                    i, candidates, client.id, time.monotonic() - client_started,
                )
            else:
                failed += 1
                logger.error(
                    "service2 failed to send digest to client_id=%s after %.2fs",
                    client.id, time.monotonic() - client_started,
                )

            session.commit()
        except Exception:
            failed += 1
            session.rollback()
            logger.exception(
                "service2 digest run failed for client_id=%s after %.2fs",
                preference.client_id, time.monotonic() - client_started,
            )
        finally:
            session.close()

    total_elapsed = time.monotonic() - run_started
    avg_elapsed = total_elapsed / candidates if candidates else 0.0
    logger.info(
        "service2 digest run done candidates=%d sent=%d skipped=%d failed=%d pending_next_run=%d "
        "total_time=%.2fs avg_time_per_client=%.2fs",
        candidates, sent, skipped, failed, candidates - sent, total_elapsed, avg_elapsed,
    )

    return sent
