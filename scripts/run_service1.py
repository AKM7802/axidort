import argparse
import logging
from datetime import datetime, timedelta, timezone

from app.services.ingest_service import run_ingest


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Service 1 ingestion for a city.")
    parser.add_argument("--city", default="chicago")
    parser.add_argument(
        "--since-days", type=int, default=1, help="Fetch inspections updated N days ago onward"
    )
    parser.add_argument(
        "--limit", type=int, default=None, help="Cap the number of fetched records actually processed"
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    since = datetime.now(timezone.utc) - timedelta(days=args.since_days)
    count = run_ingest(args.city, since, limit=args.limit)
    print(f"processed {count} inspection_events for {args.city} since {since.isoformat()}")


if __name__ == "__main__":
    main()
