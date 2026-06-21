"""Anthropic LLM wrapper with JSON helpers and retries.

LIVE only — uses the official ``anthropic`` SDK. There is no mock path: a missing
ANTHROPIC_API_KEY or a missing SDK raises at construction time. Two model tiers:
  - fast  (claude-sonnet-4-6): per-persona UX testers — many cheap calls.
  - smart (claude-opus-4-8):   aggregator / improver / LLM-judge evals.
"""
from __future__ import annotations

import json
import re
import time
from typing import Any, Callable

from ..config import settings

import anthropic


FAST = "fast"
SMART = "smart"


def _model(tier: str) -> str:
    return settings.llm_model_smart if tier == SMART else settings.llm_model_fast


class LLMClient:
    def __init__(self) -> None:
        if not settings.anthropic_api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is required (live-only mode; mock fallback removed)."
            )
        # 60s/request + 2 retries: the SDK default is a 10-minute timeout, which can stall
        # the agentic browser loop for minutes on a single hung request.
        self._client = anthropic.Anthropic(
            api_key=settings.anthropic_api_key, timeout=60.0, max_retries=2
        )

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
        """Return the raw Anthropic message."""
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


# ---------- module-level utilities ----------
def _text_of(msg: Any) -> str:
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


_singleton: LLMClient | None = None


def get_llm() -> LLMClient:
    global _singleton
    if _singleton is None:
        from ..integrations.arize import get_tracer_provider
        get_tracer_provider()
        _singleton = LLMClient()
    return _singleton
