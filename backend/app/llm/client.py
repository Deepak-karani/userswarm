"""Anthropic LLM wrapper with JSON helpers, retries, and offline mock mode.

Real path uses the official ``anthropic`` SDK. When ANTHROPIC_API_KEY is absent
(``settings.llm_mock``), every call returns canned-but-plausible output so the
entire workflow runs offline. Two model tiers:
  - fast  (claude-sonnet-4-6): per-persona UX testers — many cheap calls.
  - smart (claude-opus-4-8):   aggregator / improver / LLM-judge evals.
"""
from __future__ import annotations

import json
import re
import time
from typing import Any, Callable

from ..config import settings

try:  # SDK is optional in pure mock mode.
    import anthropic
except Exception:  # pragma: no cover
    anthropic = None  # type: ignore


FAST = "fast"
SMART = "smart"


def _model(tier: str) -> str:
    return settings.llm_model_smart if tier == SMART else settings.llm_model_fast


class LLMClient:
    def __init__(self) -> None:
        self.mock = settings.llm_mock
        self._client = None
        if not self.mock and anthropic is not None:
            # 60s/request + 2 retries: the SDK default is a 10-minute timeout, which can stall
            # the agentic browser loop for minutes on a single hung request.
            self._client = anthropic.Anthropic(
                api_key=settings.anthropic_api_key, timeout=60.0, max_retries=2
            )
        # Allows tests/agents to register a custom mock generator.
        self.mock_handler: Callable[[str, str], str] | None = None

    # ---- low-level ----
    def complete(
        self,
        *,
        system: str,
        user: str = "",
        tier: str = FAST,
        tools: list[dict] | None = None,
        tool_choice: dict | None = None,
        max_tokens: int = 2048,
        messages: list[dict] | None = None,
    ) -> Any:
        """Return the raw Anthropic message (or a mock stand-in)."""
        if self.mock or self._client is None:
            return self._mock_message(system, user, tools)

        kwargs: dict[str, Any] = {
            "model": _model(tier),
            "max_tokens": max_tokens,
            "system": system,
            "messages": messages or [{"role": "user", "content": user}],
        }
        if tools:
            kwargs["tools"] = tools
        if tool_choice:
            kwargs["tool_choice"] = tool_choice
        return self._with_retries(lambda: self._client.messages.create(**kwargs))

    def complete_text(self, *, system: str, user: str, tier: str = FAST, max_tokens: int = 2048) -> str:
        msg = self.complete(system=system, user=user, tier=tier, max_tokens=max_tokens)
        return _text_of(msg)

    def complete_json(
        self,
        *,
        system: str,
        user: str,
        tier: str = FAST,
        max_tokens: int = 2048,
        default: dict | None = None,
    ) -> dict:
        """Ask for JSON, parse robustly. Returns ``default`` if parsing fails."""
        sys = system + "\n\nRespond with ONLY a single valid JSON object. No prose, no markdown fences."
        text = self.complete_text(system=sys, user=user, tier=tier, max_tokens=max_tokens)
        parsed = extract_json(text)
        if parsed is None:
            return default if default is not None else {}
        return parsed

    # ---- helpers ----
    @staticmethod
    def _with_retries(fn: Callable[[], Any], attempts: int = 3) -> Any:
        last = None
        for i in range(attempts):
            try:
                return fn()
            except Exception as exc:  # network / rate-limit
                last = exc
                time.sleep(0.8 * (i + 1))
        raise last  # type: ignore[misc]

    def _mock_message(self, system: str, user: str, tools: list[dict] | None):
        if self.mock_handler is not None:
            return _FakeMessage(self.mock_handler(system, user))
        return _FakeMessage(_mock_text(system, user, tools))


# ---------- module-level utilities ----------
def _text_of(msg: Any) -> str:
    # Works for both real Anthropic messages and _FakeMessage.
    parts = []
    for block in getattr(msg, "content", []) or []:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
        elif isinstance(block, dict) and block.get("type") == "text":
            parts.append(block["text"])
    return "\n".join(parts).strip()


def extract_json(text: str) -> dict | None:
    if not text:
        return None
    # Strip markdown fences if present.
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    # Grab the first {...} balanced-ish object.
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return None
    return None


# ---------- mock content ----------
class _FakeBlock:
    type = "text"

    def __init__(self, text: str) -> None:
        self.text = text


class _FakeMessage:
    def __init__(self, text: str) -> None:
        self.content = [_FakeBlock(text)]
        self.stop_reason = "end_turn"


def _mock_text(system: str, user: str, tools: list[dict] | None) -> str:
    """Heuristic canned output keyed on what the caller is asking for."""
    blob = (system + " " + user).lower()
    if "persona" in blob and "generate" in blob:
        return json.dumps({
            "personas": [
                {"name": "Skeptical First-Timer", "description": "Busy newcomer, low patience, scans before reading.",
                 "traits": ["impatient", "mobile-first", "privacy-conscious"], "goals": ["finish the task fast"]},
                {"name": "Detail-Oriented Researcher", "description": "Reads everything, compares options.",
                 "traits": ["thorough", "skeptical"], "goals": ["understand before committing"]},
                {"name": "Distracted Multitasker", "description": "Half-paying attention, easily lost.",
                 "traits": ["distracted", "error-prone"], "goals": ["complete with minimal thinking"]},
            ]
        })
    if "improve" in blob and "prompt" in blob:
        return json.dumps({
            "improved_prompt": (
                "You are a rigorous UX tester. For EVERY friction point you MUST cite concrete "
                "on-page evidence (exact button label, visible text, or screenshot step). Never invent "
                "UI that you did not observe. Mark task_success only if the success criteria are literally met. "
                "Give specific, actionable recommendations tied to the observed friction."
            ),
            "rationale": "Human labels flagged vague reports and unsupported claims; this enforces evidence + specificity.",
        })
    if any(k in blob for k in ["actionability", "hallucination", "judge", "evaluate"]):
        return json.dumps({"score": 0.7, "passed": True,
                           "explanation": "Mock eval: recommendations are mostly specific; minor unsupported claim."})
    if "aggregate" in blob or "combine" in blob:
        return json.dumps({
            "summary": "Across personas, onboarding is reachable but the value of the recommendation is unclear and CTAs are ambiguous.",
            "overall_severity": "medium",
            "top_friction_points": ["Primary CTA label is vague", "No progress indicator during onboarding",
                                    "Recommendation lacks explanation"],
            "recommendations": ["Rename CTA to a verb-first action", "Add a step indicator", "Explain why the recommendation fits"],
        })
    # Default: a strict UX report.
    return json.dumps({
        "persona": "Mock Persona",
        "task_success": True,
        "step_log": ["open_url -> landing page", "click_by_text 'Get Started'", "type_into_field email",
                     "get_page_state -> recommendation shown"],
        "friction_points": ["CTA label 'Go' is ambiguous", "No confirmation after submitting email"],
        "evidence": ["Visible button text was 'Go' with no context", "Page changed with no success message"],
        "severity": "medium",
        "recommendations": ["Use a descriptive CTA", "Show a success confirmation"],
        "confidence": 0.62,
    })


_singleton: LLMClient | None = None


def get_llm() -> LLMClient:
    global _singleton
    if _singleton is None:
        from ..integrations.arize import get_tracer_provider
        get_tracer_provider()
        _singleton = LLMClient()
    return _singleton
