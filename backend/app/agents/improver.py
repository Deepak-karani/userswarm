"""ImproverAgent: turn human annotations + failing evals into a better tester prompt.

Prompt contains "improve" and "prompt" so the offline mock keys correctly.
"""
from __future__ import annotations

import json

from ..llm.client import SMART, LLMClient

_SYSTEM = (
    "You are a prompt engineer improving a UX-tester agent. Given human annotations and failing evals on the "
    "previous run, rewrite the tester's system prompt so future reports are more useful, specific, evidence-backed, "
    "and free of hallucination. Keep it a single rigorous instruction block."
)

_DEFAULT = {
    "improved_prompt": (
        "You are a rigorous UX tester. For EVERY friction point you MUST cite concrete on-page evidence "
        "(exact button label, visible text, or observed step). Never invent UI you did not observe. Mark "
        "task_success only if the success criteria are literally met. Give specific, actionable recommendations "
        "tied to the observed friction."
    ),
    "rationale": "Defaulted: enforce evidence, specificity, and no hallucination based on prior feedback.",
}


def improve(llm: LLMClient, base_run_inputs: dict, annotations: list[dict], eval_failures: list[dict]) -> dict:
    user = (
        "Improve the UX-tester prompt using this feedback.\n\n"
        f"Run inputs: {json.dumps(base_run_inputs)[:2000]}\n"
        f"Human annotations: {json.dumps(annotations)[:3000]}\n"
        f"Failing evals: {json.dumps(eval_failures)[:3000]}\n\n"
        'Respond as JSON: {"improved_prompt": "...", "rationale": "..."}'
    )
    data = llm.complete_json(system=_SYSTEM, user=user, tier=SMART, default=dict(_DEFAULT))
    if not isinstance(data, dict):
        data = dict(_DEFAULT)
    return {
        "improved_prompt": str(data.get("improved_prompt") or _DEFAULT["improved_prompt"]),
        "rationale": str(data.get("rationale") or _DEFAULT["rationale"]),
    }
