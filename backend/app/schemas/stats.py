from datetime import date

from pydantic import BaseModel


class WeeklyCountOut(BaseModel):
    week_start: date
    count: int


class CategoryCountOut(BaseModel):
    category: str
    count: int


class MeStatsOut(BaseModel):
    total_leads: int
    leads_last_7_days: int
    by_category: list[CategoryCountOut]
    by_week: list[WeeklyCountOut]
