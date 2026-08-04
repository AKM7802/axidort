"""Deletes ALL inspection_events and client_leads.

Cascades (via existing ON DELETE CASCADE foreign keys) to:
  - violations (event_id -> inspection_events.id)
  - review_queue (violation_id -> violations.id)
  - zip_mapping_flags (inspection_event_id -> inspection_events.id)
  - email_digest_leads (client_lead_id -> client_leads.id) — join rows only;
    the email_digests themselves are NOT deleted, they just lose their lead
    links (period_start/period_end/lead_count/status/sent_at stay intact
    as a historical record of what was sent).

Dry run by default — pass --yes to actually delete anything.
"""
import argparse
import logging

from sqlalchemy import delete, func, select

from app.db.session import SessionLocal
from app.models.data_quality import ZipMappingFlag
from app.models.inspection import InspectionEvent
from app.models.lead import ClientLead
from app.models.notification import EmailDigestLead
from app.models.review_queue import ReviewQueue
from app.models.violation import Violation

logger = logging.getLogger(__name__)


def _counts(session) -> dict[str, int]:
    return {
        "inspection_events": session.scalar(select(func.count()).select_from(InspectionEvent)) or 0,
        "client_leads": session.scalar(select(func.count()).select_from(ClientLead)) or 0,
        "violations": session.scalar(select(func.count()).select_from(Violation)) or 0,
        "review_queue": session.scalar(select(func.count()).select_from(ReviewQueue)) or 0,
        "zip_mapping_flags": session.scalar(select(func.count()).select_from(ZipMappingFlag)) or 0,
        "email_digest_leads": session.scalar(select(func.count()).select_from(EmailDigestLead)) or 0,
    }


def _print_counts(counts: dict[str, int]) -> None:
    for name, count in counts.items():
        print(f"  {name}: {count}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--yes", action="store_true", help="Actually perform the deletion (default: dry run only)"
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    session = SessionLocal()
    try:
        before = _counts(session)
        print("Current row counts:")
        _print_counts(before)

        if not args.yes:
            print("\nDry run only — pass --yes to actually delete. Nothing was changed.")
            return

        print("\nDeleting client_leads and inspection_events (cascades handle the rest)...")
        session.execute(delete(ClientLead))
        session.execute(delete(InspectionEvent))
        session.commit()

        after = _counts(session)
        print("\nRow counts after deletion:")
        _print_counts(after)
    except Exception:
        session.rollback()
        logger.exception("purge failed, rolled back — no changes were made")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
