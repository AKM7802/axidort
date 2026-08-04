import re
from datetime import date, datetime
from typing import Any

import httpx

from app.adapters.city.base import CityAdapter
from app.core.config import settings

# Chicago's Food Inspections dataset (Socrata). Docs: https://dev.socrata.com/
DATASET_ID = "4ijn-s7e5"
BASE_URL = f"https://data.cityofchicago.org/resource/{DATASET_ID}.json"

# Individual violations are concatenated in one string, delimited by " | ",
# each shaped like "34. DESCRIPTION OF THE VIOLATION - Comments: free text".
_VIOLATION_SPLIT_RE = re.compile(r"\s*\|\s*")
_VIOLATION_ENTRY_RE = re.compile(
    r"^(?P<code>\d+)\.\s*(?P<desc>.*?)\s*-\s*Comments:\s*(?P<comments>.*)$", re.DOTALL
)


class ChicagoAdapter(CityAdapter):
    city_code = "chicago"

    def fetch_raw(self, since: datetime, limit: int = 5000) -> list[dict[str, Any]]:
        headers = {"X-App-Token": settings.socrata_app_token} if settings.socrata_app_token else {}
        where = f"inspection_date >= '{since.strftime('%Y-%m-%dT%H:%M:%S')}'"

        records: list[dict[str, Any]] = []
        offset = 0
        with httpx.Client(timeout=30.0, headers=headers) as client:
            while True:
                params = {"$where": where, "$limit": str(limit), "$offset": str(offset)}
                response = client.get(BASE_URL, params=params)
                response.raise_for_status()
                batch = response.json()
                records.extend(batch)
                if len(batch) < limit:
                    break
                offset += limit
        return records

    def to_generalized(self, raw: dict[str, Any]) -> dict[str, Any]:
        latitude, longitude = self._extract_coordinates(raw)
        return {
            "source_city": self.city_code,
            "external_id": raw["inspection_id"],
            "business_name": raw.get("dba_name", ""),
            "aka_name": raw.get("aka_name"),
            "license_number": raw.get("license_"),
            "facility_type": raw.get("facility_type"),
            "risk_level": raw.get("risk"),
            "address_line": raw.get("address"),
            "municipality": raw.get("city"),
            "state": raw.get("state"),
            "postal_code": raw.get("zip"),
            "latitude": latitude,
            "longitude": longitude,
            "inspection_date": self._parse_date(raw.get("inspection_date")),
            "inspection_type": raw.get("inspection_type"),
            "result": raw.get("results"),
            "raw_data": raw,
        }

    def extract_violation_entries(self, raw: dict[str, Any]) -> list[dict[str, str]]:
        raw_text = raw.get("violations")
        if not raw_text:
            return []

        entries: list[dict[str, str]] = []
        for chunk in _VIOLATION_SPLIT_RE.split(raw_text.strip()):
            if not chunk:
                continue
            match = _VIOLATION_ENTRY_RE.match(chunk)
            if match:
                entries.append(
                    {
                        "code_raw": f"{match.group('code')}. {match.group('desc')}".strip(),
                        "description_raw": match.group("comments").strip(),
                    }
                )
            else:
                entries.append({"code_raw": None, "description_raw": chunk.strip()})
        return entries

    @staticmethod
    def _parse_date(value: str | None) -> date | None:
        if not value:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()

    @staticmethod
    def _extract_coordinates(raw: dict[str, Any]) -> tuple[float | None, float | None]:
        lat, lon = raw.get("latitude"), raw.get("longitude")
        if lat is not None and lon is not None:
            return float(lat), float(lon)

        coordinates = (raw.get("location") or {}).get("coordinates")
        if coordinates and len(coordinates) == 2:
            lon, lat = coordinates
            return float(lat), float(lon)

        return None, None
