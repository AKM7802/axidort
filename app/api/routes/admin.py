from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db_session
from app.models.client import Client
from app.models.enums import ViolationCategory
from app.repositories.factory import build_repositories
from app.schemas.admin import (
    AdminClientOut,
    AdminReviewQueueOut,
    AdminStatsOut,
    AdminUpdateClientRequest,
    AdminZipMappingFlagOut,
    PaginatedZipMappingFlagsOut,
)
from app.schemas.auth import SignupRequest
from app.schemas.digest import EmailDigestDetailOut, EmailDigestOut, PaginatedDigestsOut
from app.schemas.me import LeadOut, PaginatedLeadsOut
from app.schemas.stats import CategoryCountOut, WeeklyCountOut
from app.services import admin_client_service, auth_service

router = APIRouter(prefix="/admin", tags=["admin"])

STATS_WEEKS = 8


@router.get("/clients", response_model=list[AdminClientOut])
def list_clients(
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> list[AdminClientOut]:
    repos = build_repositories(session)
    return [AdminClientOut.model_validate(client) for client in repos.clients.list_all()]


@router.post("/clients", response_model=AdminClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: SignupRequest,
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> AdminClientOut:
    """Admin-operated version of public signup — same validation (real
    territory values, at least one category), same fields. The admin sets
    an initial password on the client's behalf; there's no invite/magic-link
    flow here, so hand it off out of band.
    """
    client, _token = auth_service.signup(session, **payload.model_dump())
    return AdminClientOut.model_validate(client)


@router.get("/clients/{client_id}", response_model=AdminClientOut)
def get_client(
    client_id: UUID,
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> AdminClientOut:
    repos = build_repositories(session)
    client = repos.clients.get_by_id(client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="client not found")
    return AdminClientOut.model_validate(client)


@router.put("/clients/{client_id}", response_model=AdminClientOut)
def update_client(
    client_id: UUID,
    payload: AdminUpdateClientRequest,
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> AdminClientOut:
    client = admin_client_service.update_client(session, client_id, payload)
    return AdminClientOut.model_validate(client)


@router.get("/clients/{client_id}/leads", response_model=PaginatedLeadsOut)
def get_client_leads(
    client_id: UUID,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    category: ViolationCategory | None = Query(default=None),
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> PaginatedLeadsOut:
    repos = build_repositories(session)
    if repos.clients.get_by_id(client_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="client not found")

    leads = repos.client_leads.get_paginated_for_client(client_id, limit=limit, offset=offset, category=category)
    total = repos.client_leads.count_for_client(client_id, category=category)
    return PaginatedLeadsOut(
        total=total,
        limit=limit,
        offset=offset,
        items=[LeadOut.model_validate(lead) for lead in leads],
    )


@router.get("/clients/{client_id}/digests", response_model=PaginatedDigestsOut)
def get_client_digests(
    client_id: UUID,
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> PaginatedDigestsOut:
    repos = build_repositories(session)
    if repos.clients.get_by_id(client_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="client not found")

    digests = repos.email_digests.get_paginated_for_client(client_id, limit=limit, offset=offset)
    total = repos.email_digests.count_for_client(client_id)
    return PaginatedDigestsOut(
        total=total,
        limit=limit,
        offset=offset,
        items=[EmailDigestOut.model_validate(digest) for digest in digests],
    )


@router.get("/clients/{client_id}/digests/{digest_id}", response_model=EmailDigestDetailOut)
def get_client_digest(
    client_id: UUID,
    digest_id: UUID,
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> EmailDigestDetailOut:
    repos = build_repositories(session)
    digest = repos.email_digests.get_by_id_for_client(digest_id, client_id)
    if digest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="report not found")
    return EmailDigestDetailOut.from_digest(digest)


@router.get("/review-queue", response_model=list[AdminReviewQueueOut])
def list_review_queue(
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> list[AdminReviewQueueOut]:
    repos = build_repositories(session)
    items = repos.review_queue.list_pending()
    return [
        AdminReviewQueueOut(
            id=item.id,
            status=item.status.value,
            created_at=item.created_at,
            violation_id=item.violation_id,
            business_name=item.violation.event.business_name,
            category=item.violation.category,
            description_raw=item.violation.description_raw,
            ai_confidence=float(item.violation.ai_confidence) if item.violation.ai_confidence is not None else None,
        )
        for item in items
    ]


@router.get("/zip-flags", response_model=PaginatedZipMappingFlagsOut)
def list_zip_mapping_flags(
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> PaginatedZipMappingFlagsOut:
    """Inspection events Service 1 couldn't confidently map to a known zip
    code — either the source data had none, or it wasn't a recognized,
    seeded zip for that city (see ingest_service._flag_unmapped_zip)."""
    repos = build_repositories(session)
    flags = repos.zip_mapping_flags.list_all(limit=limit, offset=offset)
    return PaginatedZipMappingFlagsOut(
        total=repos.zip_mapping_flags.count_all(),
        limit=limit,
        offset=offset,
        items=[
            AdminZipMappingFlagOut(
                id=flag.id,
                inspection_event_id=flag.inspection_event_id,
                business_name=flag.inspection_event.business_name,
                inspection_date=flag.inspection_event.inspection_date,
                city_name=flag.city.name,
                postal_code=flag.postal_code,
                description=flag.description,
                created_at=flag.created_at,
            )
            for flag in flags
        ],
    )


@router.get("/stats", response_model=AdminStatsOut)
def get_stats(
    _admin: Client = Depends(get_current_admin),
    session: Session = Depends(get_db_session),
) -> AdminStatsOut:
    repos = build_repositories(session)

    leads_by_week = repos.client_leads.weekly_counts_all(weeks=STATS_WEEKS)
    clients_by_week = repos.clients.weekly_signups(weeks=STATS_WEEKS)
    leads_by_category = repos.client_leads.category_breakdown_all()

    return AdminStatsOut(
        total_clients=repos.clients.count_all(),
        total_inspection_events=repos.events.count_all(),
        total_leads=repos.client_leads.count_all(),
        pending_review_queue=len(repos.review_queue.list_pending()),
        leads_by_week=[WeeklyCountOut(week_start=week_start, count=count) for week_start, count in leads_by_week],
        clients_by_week=[
            WeeklyCountOut(week_start=week_start, count=count) for week_start, count in clients_by_week
        ],
        leads_by_category=[
            CategoryCountOut(category=category, count=count) for category, count in leads_by_category.items()
        ],
    )
