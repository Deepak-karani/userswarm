"""LLM-judge evals. Prompts contain 'actionability'/'hallucination' so the mock keys."""
from __future__ import annotations

import json

from ..llm.client import SMART, LLMClient


def _judge(llm: LLMClient, system: str, user: str) -> tuple[float, bool, str]:
    default = {"score": 0.7, "passed": True, "explanation": "Mock judge: acceptable."}
    data = llm.complete_json(system=system, user=user, tier=SMART, default=default)
    if not isinstance(data, dict):
        data = default
    try:
        score = float(data.get("score", 0.0))
    except Exception:
        score = 0.0
    score = max(0.0, min(1.0, score))
    passed = bool(data.get("passed", score >= 0.6))
    explanation = str(data.get("explanation", ""))
    return (score, passed, explanation)


def actionability(llm: LLMClient, report: dict) -> tuple[float, bool, str]:
    system = (
        "You are an evaluation judge scoring the ACTIONABILITY of a UX report. High actionability means the "
        "recommendations are specific, concrete, and directly fixable by a builder. Score 0-1."
    )
    user = (
        "Judge the actionability of this report's recommendations.\n\n"
        f"{json.dumps(report)[:4000]}\n\n"
        'Respond as JSON: {"score": 0-1, "passed": bool, "explanation": "..."}'
    )
    return _judge(llm, system, user)


def hallucination_risk(llm: LLMClient, report: dict) -> tuple[float, bool, str]:
    system = (
        "You are an evaluation judge scoring HALLUCINATION risk in a UX report. Score is the degree to which "
        "claims are grounded in cited evidence (1.0 = fully grounded, low hallucination; 0.0 = many unsupported "
        "claims). Passing means low hallucination risk."
    )
    user = (
        "Assess hallucination risk: are friction_points supported by evidence and observed states?\n\n"
        f"{json.dumps(report)[:4000]}\n\n"
        'Respond as JSON: {"score": 0-1 (higher=less hallucination), "passed": bool, "explanation": "..."}'
    )
    return _judge(llm, system, user)
