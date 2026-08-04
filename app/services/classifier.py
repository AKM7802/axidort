from typing import Any, Literal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.prompts import CLASSIFY_V1_SYSTEM, build_classify_user_content

Category = Literal["pest", "sanitation", "equipment", "plumbing", "temperature", "other"]
Species = Literal["rodent", "rat", "mouse", "roach", "fly", "bird", "other_insect"]
Severity = Literal["closure", "critical", "citation", "conducive"]

# Severities that should also set the legacy `critical` boolean column.
_CRITICAL_SEVERITIES = {"critical", "closure"}


class ViolationClassification(BaseModel):
    i: int
    category: Category
    species: list[Species] = Field(default_factory=list)
    severity: Severity
    reinspection_expected: bool
    structural_risk: bool
    confidence: float


class ClassificationResponse(BaseModel):
    results: list[ViolationClassification]


class ViolationClassifier:
    """Turns raw {code_raw, description_raw} violation entries into the
    structured fields the `violations` table expects, via a Gemini call
    constrained to the ClassificationResponse schema.
    """

    def __init__(self, client: genai.Client | None = None):
        self._client = client or genai.Client(api_key=settings.gemini_api_key)

    def classify(
        self, entries: list[dict[str, str]], *, market: str, closed: bool = False
    ) -> list[dict[str, Any]]:
        if not entries:
            return []

        fragments = [
            {"i": i, "code": entry.get("code_raw"), "text": entry.get("description_raw")}
            for i, entry in enumerate(entries)
        ]

        response = self._client.models.generate_content(
            model=settings.gemini_model,
            contents=build_classify_user_content(closed=closed, market=market, fragments=fragments),
            config=types.GenerateContentConfig(
                system_instruction=CLASSIFY_V1_SYSTEM,
                response_mime_type="application/json",
                response_schema=ClassificationResponse,
            ),
        )

        parsed: ClassificationResponse = response.parsed
        results_by_index = {result.i: result for result in parsed.results}

        classified = []
        for i, entry in enumerate(entries):
            result = results_by_index.get(i)
            if result is None:
                raise ValueError(f"classifier result missing for fragment index {i}")

            classified.append(
                {
                    "code_raw": entry.get("code_raw"),
                    "description_raw": entry.get("description_raw"),
                    "category": result.category,
                    "species": list(result.species) or None,
                    "severity": result.severity,
                    "critical": result.severity in _CRITICAL_SEVERITIES,
                    "reinspection_expected": result.reinspection_expected,
                    "structural_risk": result.structural_risk,
                    "ai_confidence": result.confidence,
                    "classifier_version": settings.classifier_version,
                }
            )
        return classified
