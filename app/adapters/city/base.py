from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any


class CityAdapter(ABC):
    """One implementation per city's raw API shape.

    Service 1 only ever calls these three methods, so adding a new city is
    "write an adapter", not "touch the ingestion pipeline".
    """

    city_code: str

    @abstractmethod
    def fetch_raw(self, since: datetime, limit: int = 5000) -> list[dict[str, Any]]:
        """Return raw records from the source API, updated at/after `since`."""

    @abstractmethod
    def to_generalized(self, raw: dict[str, Any]) -> dict[str, Any]:
        """Map one raw record to the generalized inspection_events column set."""

    @abstractmethod
    def extract_violation_entries(self, raw: dict[str, Any]) -> list[dict[str, str]]:
        """Split the raw record's free-text violations blob into individual
        {code_raw, description_raw} entries, ready for the LLM classifier.
        """

    def is_closed(self, raw: dict[str, Any]) -> bool:
        """Whether the record's own context says the establishment was
        closed as a direct result of this inspection. Feeds the
        classifier's `closed` flag so it never infers closure from
        violation text alone. Defaults to False; override where the
        source actually carries this signal.
        """
        return False
