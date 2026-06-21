"""ReportCriticAgent: coerce/repair raw model output to satisfy AgentReportSchema."""
from __future__ import annotations

from ..schemas import AgentReportSchema

_VALID_SEVERITY = {"low", "medium", "high"}


def _as_str_list(value) -> list[str]:
    if isinstance(value, list):
        return [str(v) for v in value if v is not None]
    if value in (None, ""):
        return []
    return [str(value)]


def _clamp_confidence(value) -> float:
    try:
        f = float(value)
    except Exception:
        return 0.5
    return max(0.0, min(1.0, f))


def validate_and_repair(llm, raw: dict, persona_name: str) -> dict:
    """Return a dict guaranteed to satisfy ``AgentReportSchema``."""
    raw = raw if isinstance(raw, dict) else {}
    try:
        return AgentReportSchema(**raw).model_dump()
    except Exception:
        pass

    severity = str(raw.get("severity", "medium")).lower()
    if severity not in _VALID_SEVERITY:
        severity = "medium"

    success = raw.get("task_success")
    if not isinstance(success, bool):
        success = bool(success)

    repaired = {
        "persona": str(raw.get("persona") or persona_name or "Persona"),
        "task_success": success,
        "step_log": _as_str_list(raw.get("step_log")),
        "friction_points": _as_str_list(raw.get("friction_points")),
        "evidence": _as_str_list(raw.get("evidence")),
        "severity": severity,
        "recommendations": _as_str_list(raw.get("recommendations")),
        "confidence": _clamp_confidence(raw.get("confidence", 0.5)),
    }
    try:
        return AgentReportSchema(**repaired).model_dump()
    except Exception:
        # Last-resort minimal valid report.
        return AgentReportSchema(persona=persona_name or "Persona", task_success=False).model_dump()
