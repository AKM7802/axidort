from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.repositories.factory import build_repositories
from app.schemas.geo import StateOut

router = APIRouter(prefix="/geo", tags=["geo"])


@router.get("/states", response_model=list[StateOut])
def list_states(session: Session = Depends(get_db_session)) -> list[StateOut]:
    """State -> city picker for signup (Chicago, Illinois only for now)."""
    repos = build_repositories(session)
    return [StateOut.model_validate(state) for state in repos.geo.list_states_with_cities()]
