import logging

import httpx

from app.adapters.city.chicago import BASE_URL
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.enums import TerritoryKind
from app.repositories.factory import build_repositories

logger = logging.getLogger(__name__)


def fetch_distinct_chicago_zips() -> list[str]:
    """Pulls the zip codes actually present in Chicago's Food Inspections
    dataset via Socrata's $group (real data, not a hand-typed list).

    The dataset's `address`/`city` free-text fields are unreliable for
    scoping to Chicago proper — inspections in this data carry dozens of
    typo'd city variants (CCHICAGO, CHICAGOO, CHICAGO., ...) plus genuinely
    different suburbs (Evanston, Skokie, Schaumburg, ...). Chicago's actual
    zip codes are entirely within the 606xx range (60601-60661, plus
    60666/O'Hare), so filtering on that numeric range is the reliable way
    to scope to the city, not the text fields.
    """
    headers = {"X-App-Token": settings.socrata_app_token} if settings.socrata_app_token else {}
    params = {
        "$select": "zip",
        "$group": "zip",
        "$where": "zip >= 60600 AND zip < 60700",
        "$limit": "1000",
    }
    with httpx.Client(timeout=30.0, headers=headers) as client:
        response = client.get(BASE_URL, params=params)
        response.raise_for_status()
        rows = response.json()
    return sorted({row["zip"] for row in rows if row.get("zip")})


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    zips = fetch_distinct_chicago_zips()
    logger.info("fetched %d distinct Chicago zip codes", len(zips))

    session = SessionLocal()
    try:
        repos = build_repositories(session)
        inserted = repos.territory_options.bulk_upsert("chicago", TerritoryKind.ZIP, zips)
        session.commit()
        logger.info("inserted %d new territory_options (skipped ones already present)", inserted)
    finally:
        session.close()


if __name__ == "__main__":
    main()
