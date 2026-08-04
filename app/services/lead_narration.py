from google import genai
from google.genai import types

from app.core.config import settings
from app.models.inspection import InspectionEvent
from app.services.prompts import NARRATION_V1_SYSTEM, build_narration_user_content


class LeadNarrator:
    """Turns an event's violations into a short, client-facing description
    of the issue for the digest email — separate from ViolationClassifier
    since this is a distinct purpose (sales-facing prose, not taxonomy
    extraction) with its own prompt.
    """

    def __init__(self, client: genai.Client | None = None):
        self._client = client or genai.Client(api_key=settings.gemini_api_key)

    def narrate(self, event: InspectionEvent) -> str:
        violations = [
            {
                "category": violation.category.value,
                "severity": violation.severity.value,
                "description": violation.description_raw,
                "code": violation.code_raw,
            }
            for violation in event.violations
        ]
        if not violations:
            return ""

        response = self._client.models.generate_content(
            model=settings.gemini_model,
            contents=build_narration_user_content(violations),
            config=types.GenerateContentConfig(system_instruction=NARRATION_V1_SYSTEM),
        )
        return (response.text or "").strip()
