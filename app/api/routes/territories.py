from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.models.enums import TerritoryKind
from app.repositories.factory import build_repositories
from app.schemas.territory import TerritoryOptionOut

router = APIRouter(prefix="/territories", tags=["territories"])


@router.get("/options", response_model=list[TerritoryOptionOut])
def list_territory_options(
    city_id: UUID,
    kind: TerritoryKind | None = None,
    session: Session = Depends(get_db_session),
) -> list[TerritoryOptionOut]:
    """The list a client picks territory_values from at signup, scoped to
    whichever city they picked (radius has no picklist — it's a continuous
    value, not enumerable).
    """
    repos = build_repositories(session)
    city = repos.geo.get_city_by_id(city_id)
    if city is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="city not found")
    options = repos.territory_options.list_options(city.code, kind=kind)
    return [TerritoryOptionOut.model_validate(option) for option in options]
