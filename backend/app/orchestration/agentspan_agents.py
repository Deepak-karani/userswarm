"""Real Agentspan-backed reasoning agents (PersonaGenerator, Aggregator).

Agentspan executes any *tool* in a separate Conductor worker process, which cannot
share a live in-process Playwright ``BrowserSession``. So the browser-driving
UXTester stays in-process; the pure-LLM reasoning agents — which need no stateful
tools and therefore spawn no workers (``requiredWorkers=[]``) — run on the
Agentspan durable runtime at ``AGENTSPAN_SERVER_URL``.

Every call is wrapped with a thread join-timeout and returns ``None`` on timeout /
error / non-COMPLETED status, so a run can never hang on Agentspan.

SDK shape (per agentspan.ai/docs/quickstart + observed AgentResult):
    from agentspan.agents import Agent, AgentRuntime
    res = AgentRuntime().run(Agent(name=, model="anthropic/<model>", instructions=, tools=[]), query)
    res.output -> {"result": <parsed JSON or text>, "finishReason": "STOP", ...}; res.status == "COMPLETED"
"""
from __future__ import annotations

import json
import threading

from ..config import settings
from ..llm.client import extract_json

_AGENT_TIMEOUT = float(getattr(settings, "agentspan_timeout", 0) or 90.0)


def _result_value(res):
    out = getattr(res, "output", None)
    if isinstance(out, dict):
        return out.get("result")
    return out


def _run_agent_json(name: str, instructions: str, query: str, model: str | None = None) -> dict | None:
    """Run a tool-less Agentspan agent and return parsed JSON, or None on any failure/timeout."""
    box: dict = {}

    def _go() -> None:
        try:
            from agentspan.agents import Agent, AgentRuntime  # lazy import

            agent = Agent(
                name=name,
                model=model or f"anthropic/{settings.llm_model_fast}",
                instructions=instructions,
                tools=[],
            )
            with AgentRuntime() as rt:
                box["res"] = rt.run(agent, query)
        except Exception as exc:  # import/connection/runtime
            box["err"] = exc

    t = threading.Thread(target=_go, daemon=True)
    t.start()
    t.join(_AGENT_TIMEOUT)
    if t.is_alive() or "err" in box:
        return None

    res = box.get("res")
    if res is None:
        return None
    if str(getattr(res, "status", "")).upper() not in ("COMPLETED", "SUCCESS"):
        return None
    if getattr(res, "error", None):
        return None

    val = _result_value(res)
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        return extract_json(val)
    return None


def generate_personas_agentspan(inputs: dict, n: int = 3) -> list[dict] | None:
    """Generate personas via a real Agentspan agent. None -> caller falls back."""
    instructions = (
        "You generate realistic, diverse user personas for UX testing of a product. "
        "Output ONLY a single JSON object, no prose."
    )
    query = (
        f"Product: {inputs.get('description', '')}\n"
        f"Target audience: {inputs.get('audience', '')}\n"
        f"Task they will attempt: {inputs.get('task', '')}\n\n"
        f"Generate {n} distinct, plausible personas. Respond as JSON:\n"
        '{"personas":[{"name":"...","description":"...","traits":["..."],"goals":["..."]}]}'
    )
    data = _run_agent_json("persona_generator", instructions, query)
    if not isinstance(data, dict):
        return None
    personas = data.get("personas")
    if isinstance(personas, list) and personas:
        return personas
    return None


def aggregate_agentspan(reports: list[dict]) -> dict | None:
    """Aggregate UX reports via a real Agentspan agent. None -> caller falls back."""
    instructions = (
        "You aggregate multiple UX test reports into one concise report for the builder. "
        "Output ONLY a single JSON object, no prose."
    )
    query = (
        "Per-persona UX reports (JSON):\n"
        f"{json.dumps(reports)[:6000]}\n\n"
        "Combine into JSON:\n"
        '{"summary":"...","overall_severity":"low|medium|high",'
        '"top_friction_points":["..."],"recommendations":["..."]}'
    )
    # Use the fast model here: the Agentspan server's provider only accepts the models in
    # `agentspan doctor` (claude-sonnet-4-6 verified); claude-opus-4-8 is rejected there.
    data = _run_agent_json("aggregator", instructions, query)
    if not isinstance(data, dict) or "summary" not in data:
        return None
    data.setdefault("overall_severity", "medium")
    data.setdefault("top_friction_points", [])
    data.setdefault("recommendations", [])
    return data


def critique_agentspan(raw: dict, persona_name: str) -> dict | None:
    """Validate/repair a UX report into the strict schema via a real Agentspan agent."""
    instructions = (
        "You validate and repair a UX test report so it strictly matches the required schema. "
        "Output ONLY the corrected JSON object, no prose."
    )
    query = (
        f"Persona: {persona_name}\n"
        "Required keys: persona(string), task_success(boolean), step_log(string[]), "
        "friction_points(string[]), friction(array of {issue, quote, severity, would_abandon} — you MUST "
        "PRESERVE every quote verbatim and non-empty AND preserve each would_abandon boolean), evidence(string[]), "
        "severity(low|medium|high), recommendations(string[]), confidence(number 0-1), "
        "persona_take(string — ONE punchy first-person verdict line; PRESERVE it verbatim), "
        "abandoned(boolean — PRESERVE it).\n"
        "Repair this draft to satisfy them EXACTLY. Keep the content, especially the friction quotes and the "
        "would_abandon flags, the persona_take line, and the abandoned flag — never drop or blank any of them. "
        "friction_points and evidence MUST be arrays of plain strings:\n"
        f"{json.dumps(raw)[:6000]}"
    )
    data = _run_agent_json("report_critic", instructions, query)
    return data if isinstance(data, dict) else None


def improve_agentspan(base_inputs: dict, annotations: list[dict], eval_failures: list[dict]) -> dict | None:
    """Produce an improved UX-tester system prompt from human labels + failed evals, via Agentspan."""
    instructions = (
        "You improve the system prompt of a UX-testing agent using human annotation labels and failed "
        "evaluations. Output ONLY a JSON object, no prose."
    )
    query = (
        f"Product/task context: {json.dumps(base_inputs)[:1500]}\n"
        f"Human annotation labels: {json.dumps(annotations)[:2500]}\n"
        f"Failed evaluations: {json.dumps(eval_failures)[:1500]}\n\n"
        'Return JSON: {"improved_prompt":"<a stronger, specific system prompt for the UX tester>",'
        '"rationale":"<why these changes address the labels and failures>"}'
    )
    data = _run_agent_json("improver", instructions, query)
    if not isinstance(data, dict) or "improved_prompt" not in data:
        return None
    return data
