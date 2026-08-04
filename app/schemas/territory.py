from pydantic import BaseModel, ConfigDict

from app.models.enums import TerritoryKind


class TerritoryOptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    kind: TerritoryKind
    value: str
    label: str | None = None
