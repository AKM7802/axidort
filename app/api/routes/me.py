from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_client, get_db_session, require_active_subscription
from app.models.client import Client
from app.repositories.factory import build_repositories
from app.schemas.digest import EmailDigestDetailOut, EmailDigestOut, PaginatedDigestsOut
from app.schemas.me import LeadOut, MeOut, PaginatedLeadsOut
from app.schemas.stats import CategoryCountOut, MeStatsOut, WeeklyCountOut

router = APIRouter(prefix="/me", tags=["me"])

STATS_WEEKS = 8


@router.get("", response_model=MeOut)
def get_me(client: Client = Depends(get_current_client)) -> MeOut:
    return MeOut.model_validate(client)


@router.get("/leads", response_model=PaginatedLeadsOut)
def list_my_leads(
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    client: Client = Depends(require_active_subscription),
    session: Session = Depends(get_db_session),
) -> PaginatedLeadsOut:
    repos = build_repositories(session)
    leads = repos.client_leads.get_paginated_for_client(client.id, limit=limit, offset=offset)
    total = repos.client_leads.count_for_client(client.id)
    return PaginatedLeadsOut(
        total=total,
        limit=limit,
        offset=offset,
        items=[LeadOut.model_validate(lead) for lead in leads],
    )


@router.get("/stats", response_model=MeStatsOut)
def get_my_stats(
    client: Client = Depends(require_active_subscription),
    session: Session = Depends(get_db_session),
) -> MeStatsOut:
    """Aggregate stats for the client dashboard's charts."""
    repos = build_repositories(session)
    since = datetime.now(timezone.utc) - timedelta(days=7)

    by_category = repos.client_leads.category_breakdown_for_client(client.id)
    by_week = repos.client_leads.weekly_counts_for_client(client.id, weeks=STATS_WEEKS)

    return MeStatsOut(
        total_leads=repos.client_leads.count_for_client(client.id),
        leads_last_7_days=repos.client_leads.count_recent_for_client(client.id, since=since),
        by_category=[CategoryCountOut(category=category, count=count) for category, count in by_category.items()],
        by_week=[WeeklyCountOut(week_start=week_start, count=count) for week_start, count in by_week],
    )


@router.get("/digests", response_model=PaginatedDigestsOut)
def list_my_digests(
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    client: Client = Depends(require_active_subscription),
    session: Session = Depends(get_db_session),
) -> PaginatedDigestsOut:
    """Reports (weekly email digests) sent to this client, most recent first."""
    repos = build_repositories(session)
    digests = repos.email_digests.get_paginated_for_client(client.id, limit=limit, offset=offset)
    total = repos.email_digests.count_for_client(client.id)
    return PaginatedDigestsOut(
        total=total,
        limit=limit,
        offset=offset,
        items=[EmailDigestOut.model_validate(digest) for digest in digests],
    )


@router.get("/digests/{digest_id}", response_model=EmailDigestDetailOut)
def get_my_digest(
    digest_id: UUID,
    client: Client = Depends(require_active_subscription),
    session: Session = Depends(get_db_session),
) -> EmailDigestDetailOut:
    """Detail of one report — exactly which leads were sent in it."""
    repos = build_repositories(session)
    digest = repos.email_digests.get_by_id_for_client(digest_id, client.id)
    if digest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    return EmailDigestDetailOut.from_digest(digest)
