"""AggregatorAgent: merge per-persona reports into one builder-facing summary.

Prompt contains "aggregate" so the offline mock keys correctly.
"""
from __future__ import annotations

import json

from ..llm.client import SMART, LLMClient

_SYSTEM = (
    "You are a UX research synthesizer. Aggregate multiple per-persona UX reports into a single, concise, "
    "builder-facing summary. Prioritize friction points that recur across personas. Be specific and actionable."
)

_VALID_SEVERITY = {"low", "medium", "high"}


def aggregate(llm: LLMClient, reports: list[dict]) -> dict:
    user = (
        "Aggregate these per-persona UX reports into one summary.\n\n"
        f"{json.dumps(reports, indent=2)[:8000]}\n\n"
        'Respond as JSON: {"summary","overall_severity"(low|medium|high),'
        '"top_friction_points":[],"recommendations":[]}'
    )
    default = {
        "summary": "Multiple personas attempted the task; see per-report friction points.",
        "overall_severity": "medium",
        "top_friction_points": [],
        "recommendations": [],
    }
    data = llm.complete_json(system=_SYSTEM, user=user, tier=SMART, default=default)
    if not isinstance(data, dict):
        data = dict(default)

    severity = str(data.get("overall_severity", "medium")).lower()
    if severity not in _VALID_SEVERITY:
        severity = "medium"

    return {
        "summary": str(data.get("summary") or default["summary"]),
        "overall_severity": severity,
        "top_friction_points": [str(x) for x in (data.get("top_friction_points") or []) if x],
        "recommendations": [str(x) for x in (data.get("recommendations") or []) if x],
    }
