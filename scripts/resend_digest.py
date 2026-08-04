"""Sends (or retries) pending-leads digests right now, without re-running
lead matching (Service 2's expensive, global "map leads to every client's
territory/category" pass). Useful when a client's leads are already matched
and pending, but their last send attempt failed (e.g. a Resend sandbox
restriction, a transient network error) — this re-attempts the send against
whatever's still pending and reports exactly how it was recorded.

Sends via SMTP (Flask-Mail) rather than Resend — a separate delivery path
for retrying through a different account/provider when Resend's sandbox
restrictions are what blocked the original send. Requires MAIL_SERVER,
MAIL_USERNAME, and MAIL_PASSWORD to be set in .env (see .env.example).

Usage:
    # Interactive: lists every client with undelivered (pending) leads,
    # their last attempt's status, and lets you pick one or all.
    PYTHONPATH=. python3 scripts/resend_digest.py

    # Non-interactive, one client:
    PYTHONPATH=. python3 scripts/resend_digest.py --email someone@example.com

    # Non-interactive, everyone with pending leads (e.g. for cron/automation):
    PYTHONPATH=. python3 scripts/resend_digest.py --all
"""
import argparse
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.client import Client
from app.repositories.factory import Repositories, build_repositories
from app.services.digest_service import send_pending_digest
from app.services.flask_mail_sender import FlaskMailSender
from app.services.lead_narration import LeadNarrator

logger = logging.getLogger(__name__)


@dataclass
class Candidate:
    client: Client
    pending_count: int
    last_status: str  # "never attempted" | "sent" | "failed" | "pending"
    last_error: str | None


def _find_candidates(repos: Repositories) -> list[Candidate]:
    """Every client with at least one undelivered lead — the only ones this
    script can actually do anything for — annotated with their most recent
    digest attempt so you can see whether it's a fresh match or a retry."""
    candidates = []
    for client in repos.clients.list_all():
        pending_count = len(repos.client_leads.get_pending(client.id))
        if pending_count == 0:
            continue

        recent = repos.email_digests.get_paginated_for_client(client.id, limit=1, offset=0)
        if not recent:
            last_status, last_error = "never attempted", None
        else:
            last_status, last_error = recent[0].status.value.lower(), recent[0].error_message

        candidates.append(Candidate(client, pending_count, last_status, last_error))
    return candidates


def _print_candidates(candidates: list[Candidate]) -> None:
    for i, c in enumerate(candidates, start=1):
        error_note = f" — {c.last_error[:80]}" if c.last_error else ""
        print(f"  [{i}] {c.client.email} — {c.pending_count} pending — last attempt: {c.last_status}{error_note}")


def _send_and_report(repos: Repositories, client: Client, *, since: date, now: datetime) -> None:
    result = send_pending_digest(
        repos, client, since=since, now=now, narrator=LeadNarrator(), email_sender=FlaskMailSender()
    )
    if result is None:
        print(f"{client.email}: nothing pending — no digest was created or sent.")
    elif result is True:
        print(f"{client.email}: send succeeded.")
    else:
        print(f"{client.email}: send FAILED — see traceback above.")


def _report_latest_digest(repos: Repositories, client_id: UUID, email: str) -> None:
    digests = repos.email_digests.get_paginated_for_client(client_id, limit=1, offset=0)
    if not digests:
        print(f"{email}: no digest record found.")
        return
    d = digests[0]
    print(
        f"{email}: latest digest id={d.id} status={d.status.value} sent_at={d.sent_at} "
        f"lead_count={d.lead_count} error_message={d.error_message!r}"
    )


def _resend_one(email: str, *, since: date, now: datetime) -> None:
    session = SessionLocal()
    client_id = None
    try:
        repos = build_repositories(session)
        client = repos.clients.get_by_email(email)
        if client is None:
            print(f"No client found for email={email!r}")
            return
        client_id = client.id
        _send_and_report(repos, client, since=since, now=now)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    if client_id is None:
        return
    session = SessionLocal()
    try:
        _report_latest_digest(build_repositories(session), client_id, email)
    finally:
        session.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", help="Resend to just this client, non-interactively")
    parser.add_argument(
        "--all", action="store_true", help="Resend to every client with pending leads, non-interactively"
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    now = datetime.now(timezone.utc)
    since = (now - timedelta(days=settings.lead_lookback_days)).date()

    if args.email:
        _resend_one(args.email, since=since, now=now)
        return

    if args.all:
        session = SessionLocal()
        try:
            candidates = _find_candidates(build_repositories(session))
        finally:
            session.close()
        if not candidates:
            print("No clients have undelivered (pending) leads right now.")
            return
        for c in candidates:
            _resend_one(c.client.email, since=since, now=now)
        return

    # Interactive: list, then prompt.
    session = SessionLocal()
    try:
        candidates = _find_candidates(build_repositories(session))
    finally:
        session.close()

    if not candidates:
        print("No clients have undelivered (pending) leads right now — nothing to resend.")
        return

    print(f"{len(candidates)} client(s) with undelivered leads:")
    _print_candidates(candidates)
    print(f"  [a] All of the above")

    choice = input("\nResend which? (number or 'a'): ").strip().lower()

    if choice in ("a", "all"):
        for c in candidates:
            _resend_one(c.client.email, since=since, now=now)
        return

    try:
        index = int(choice)
        selected = candidates[index - 1]
    except (ValueError, IndexError):
        print(f"Not a valid choice: {choice!r}")
        return

    _resend_one(selected.client.email, since=since, now=now)


if __name__ == "__main__":
    main()
