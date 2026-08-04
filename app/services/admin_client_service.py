from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.enums import ViolationCategory
from app.repositories.factory import build_repositories
from app.schemas.admin import AdminUpdateClientRequest
from app.services.auth_service import resolve_territory_rows


def update_client(session: Session, client_id: UUID, payload: AdminUpdateClientRequest) -> Client:
    """Admin edit: territories and categories are replaced wholesale (same
    convention as the reference this was modeled on — a PUT that submits
    the complete desired set, not a diff/patch).
    """
    repos = build_repositories(session)

    client = repos.clients.get_by_id(client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="client not found")

    territory_rows = resolve_territory_rows(
        repos, payload.city_id, payload.territory_kind, payload.territory_values
    )

    repos.territories.delete_all_for_client(client_id)
    repos.territories.create_many(client_id, territory_rows)

    repos.category_subscriptions.delete_all_for_client(client_id)
    repos.category_subscriptions.create_many(
        client_id, [ViolationCategory(category.value) for category in payload.categories]
    )

    repos.clients.update_flags(
        client_id, is_active=payload.is_active, is_exclusive=payload.is_exclusive, status=payload.status
    )

    # The bulk delete()s above don't refresh `client`'s already-loaded
    # territories/category_subscriptions collections (those were populated
    # by the selectinload in get_by_id above and are now stale in-memory);
    # expire them so the re-fetch below actually reflects the new rows.
    session.expire(client, ["territories", "category_subscriptions"])

    updated = repos.clients.get_by_id(client_id)
    assert updated is not None  # just fetched/updated above
    return updated
