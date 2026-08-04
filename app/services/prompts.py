"""Prompt templates for the Service 1 violation classifier.

Kept separate from classifier.py so prompt revisions (which should bump
`classifier_version` in app/core/config.py) are reviewable on their own.
"""

import json

CLASSIFY_V1_SYSTEM = """You classify restaurant health-inspection violation records into a fixed taxonomy for a
lead-routing system. Output ONLY valid JSON matching the provided schema. Never invent
information not present in the input. If the text is ambiguous, choose the closest category
and lower your confidence.

Taxonomy:
- category: pest | sanitation | equipment | plumbing | temperature | other
- species (only when category=pest, else []): rodent|rat|mouse|roach|fly|bird|other_insect
- severity: closure | critical | citation | conducive
  Rules: severity=closure ONLY if the record-level context says the establishment was closed
  (you will be given closed=true/false; echo it, do not infer closure from violation text).
  "Conditions conducive to pests" / harborage / gaps allowing entry WITHOUT observed pests
  = conducive. Observed pests or droppings/evidence = critical if flagged critical or if
  live pests/droppings in food areas, else citation.
- reinspection_expected: true if jurisdiction context or text implies a follow-up inspection.
- confidence: 0-1, your honest calibration.

Jurisdiction notes you may receive as hints:
- NYC codes: 04K=rats 04L=mice 04M=roaches 04N=flies 08A=conducive conditions. Trust codes
  over free text when both present, but still extract species detail from text.
- Toronto severity letters: C=crucial S=significant M=minor. C or S with pest text => critical.
- UK: no violation text; you receive sub-scores {hygiene, structural, confidence_in_management}
  and rating 0-2. structural >= 15 => category=pest is NOT automatic: output category=sanitation,
  severity=critical, species=[], and set flag structural_risk=true instead. Rating 0 => severity=critical.
"""


def build_classify_user_content(*, closed: bool, market: str, fragments: list[dict]) -> str:
    return (
        f"closed={str(closed).lower()} | market={market} | "
        f"fragments={json.dumps(fragments, ensure_ascii=False)}"
    )


NARRATION_V1_SYSTEM = """You write a short, factual issue description for a lead-generation email sent to
businesses (pest control, cleaning, repair companies) who want to know why a restaurant is a
sales lead. The reader has NOT seen the inspection report — you are their only summary.

Rules:
- 1-2 sentences, plain English, no jargon, no legal conclusions ("negligent", "violates code").
- State only what the violation records actually say. Never invent detail, severity, or cause
  that isn't present in the input.
- Do not mention "the inspector", "the report", classification labels, or confidence scores —
  write it as a plain description of the conditions found, e.g. "Live rodent activity was
  found near food prep areas, along with unsealed openings that could let pests back in."
  not "The classifier flagged this as critical pest with rodent species."
- If multiple violations are given, summarize the most severe/relevant ones together rather
  than listing every one; it's fine to omit minor ones if the input has many.
- Output ONLY the description text — no preamble, no quotes, no markdown.
"""


def build_narration_user_content(violations: list[dict]) -> str:
    lines = [
        f"- category={v.get('category')} severity={v.get('severity')}: {v.get('description') or v.get('code') or ''}"
        for v in violations
    ]
    return "\n".join(lines)
