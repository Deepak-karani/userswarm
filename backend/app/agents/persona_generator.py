"""PersonaGeneratorAgent: synthesize 3-5 distinct user personas for a target.

Prompt deliberately contains the words "generate" and "persona" so the offline
mock keys onto the right canned response.
"""
from __future__ import annotations

from ..llm.client import FAST, LLMClient

_DEFAULT_PERSONAS = [
    {"name": "Skeptical First-Timer", "description": "Busy newcomer with low patience who scans before reading.",
     "traits": ["impatient", "mobile-first", "privacy-conscious"], "goals": ["finish the task quickly"]},
    {"name": "Detail-Oriented Researcher", "description": "Reads everything and compares options before acting.",
     "traits": ["thorough", "skeptical"], "goals": ["understand fully before committing"]},
    {"name": "Distracted Multitasker", "description": "Half-paying attention and easily lost in the flow.",
     "traits": ["distracted", "error-prone"], "goals": ["complete with minimal thinking"]},
]

_SYSTEM = (
    "You are a UX research lead. Generate diverse, realistic user personas for a product. "
    "Each persona must be distinct in motivation, skill, and patience."
)


def generate(llm: LLMClient, inputs: dict, n: int = 3) -> list[dict]:
    """Return 3-5 personas as ``{name, description, traits[], goals[]}``."""
    n = max(3, min(5, n))
    user = (
        f"Generate {n} distinct personas to test this experience.\n"
        f"URL: {inputs.get('url', '')}\n"
        f"Description: {inputs.get('description', '')}\n"
        f"Target audience: {inputs.get('audience', '')}\n"
        f"Task to attempt: {inputs.get('task', '')}\n"
        f"Success criteria: {inputs.get('success_criteria', '')}\n\n"
        'Respond as JSON: {"personas": [{"name","description","traits":[],"goals":[]}, ...]}'
    )
    data = llm.complete_json(system=_SYSTEM, user=user, tier=FAST,
                             default={"personas": _DEFAULT_PERSONAS})
    personas = data.get("personas") if isinstance(data, dict) else None
    if not isinstance(personas, list) or not personas:
        return list(_DEFAULT_PERSONAS)

    cleaned: list[dict] = []
    for p in personas[:5]:
        if not isinstance(p, dict):
            continue
        cleaned.append({
            "name": str(p.get("name") or "Unnamed Persona"),
            "description": str(p.get("description") or ""),
            "traits": [str(t) for t in (p.get("traits") or []) if t],
            "goals": [str(g) for g in (p.get("goals") or []) if g],
        })
    return cleaned or list(_DEFAULT_PERSONAS)
