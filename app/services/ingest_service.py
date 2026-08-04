import logging
import time
from datetime import datetime

from app.adapters.city.registry import get_adapter
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.enums import TerritoryKind
from app.models.inspection import InspectionEvent
from app.repositories.factory import Repositories, build_repositories
from app.services.classifier import ViolationClassifier

logger = logging.getLogger(__name__)


def _flag_unmapped_zip(repos: Repositories, event: InspectionEvent) -> None:
    """Zip codes are the join key between a lead and the clients whose
    territories should see it (see territory_matching.py) — an event whose
    zip is missing or unrecognized would silently never match anyone, so
    it's flagged for review rather than failing loudly or being ignored.
    """
    if repos.zip_mapping_flags.exists_for_event(event.id):
        return  # already flagged on a previous ingest run of this event

    postal_code = event.postal_code
    if not postal_code:
        repos.zip_mapping_flags.create(
            inspection_event_id=event.id,
            city_id=event.city_id,
            postal_code=None,
            description="missing postal_code in source data",
        )
    elif not repos.territory_options.exists(event.source_city, TerritoryKind.ZIP, postal_code):
        repos.zip_mapping_flags.create(
            inspection_event_id=event.id,
            city_id=event.city_id,
            postal_code=postal_code,
            description=f"zip code {postal_code!r} is not a recognized/seeded zip for {event.source_city}",
        )


def run_ingest(city: str, since: datetime, *, limit: int | None = None) -> int:
    """Service 1: fetch raw data -> map to the generalized schema -> store ->
    classify violations with the LLM -> flag leads.

    `limit` caps how many fetched records actually get processed (fetching
    itself is cheap/unbounded; classification is the expensive per-record
    step this is meant to bound, e.g. for a controlled test run). Records
    fetched but past that cap are logged as "pending" — still there,
    untouched, ready for the next run.

    Each record is committed independently so one bad record (a flaky LLM
    call, unexpected payload shape) can't roll back an entire batch.

    Returns the number of inspection_events successfully processed.
    """
    adapter = get_adapter(city)
    classifier = ViolationClassifier()
    run_started = time.monotonic()

    raw_records = adapter.fetch_raw(since)
    fetched = len(raw_records)
    if limit is not None:
        raw_records = raw_records[:limit]
    to_process = len(raw_records)
    pending = fetched - to_process

    logger.info(
        "service1 ingest starting city=%s since=%s fetched=%d to_process=%d pending=%d",
        city, since.isoformat(), fetched, to_process, pending,
    )

    processed = 0
    failed = 0
    for i, raw in enumerate(raw_records, start=1):
        record_started = time.monotonic()
        external_id = raw.get("inspection_id")
        session = SessionLocal()
        try:
            repos = build_repositories(session)

            generalized = adapter.to_generalized(raw)
            event = repos.events.upsert(generalized)
            _flag_unmapped_zip(repos, event)

            entries = adapter.extract_violation_entries(raw)
            classified = classifier.classify(
                entries, market=city, closed=adapter.is_closed(raw)
            )
            violations = repos.violations.bulk_create(event.id, classified)

            for violation in violations:
                if (
                    violation.ai_confidence is not None
                    and violation.ai_confidence < settings.classifier_confidence_threshold
                ):
                    repos.review_queue.create(violation.id)

            repos.events.mark_classified(
                event.id,
                classifier_version=settings.classifier_version,
                is_lead=bool(violations),
            )
            session.commit()
            processed += 1
            logger.info(
                "service1 processed %d/%d external_id=%s in %.2fs",
                i, to_process, external_id, time.monotonic() - record_started,
            )
        except Exception:
            failed += 1
            session.rollback()
            logger.exception(
                "service1 ingest failed for %s external_id=%s after %.2fs",
                city, external_id, time.monotonic() - record_started,
            )
        finally:
            session.close()

    total_elapsed = time.monotonic() - run_started
    avg_elapsed = total_elapsed / to_process if to_process else 0.0
    logger.info(
        "service1 ingest done city=%s processed=%d failed=%d pending=%d "
        "total_time=%.2fs avg_time_per_record=%.2fs",
        city, processed, failed, pending, total_elapsed, avg_elapsed,
    )

    return processed
