"""Safe C: UXTester as a real Agentspan agent with a WORKER-LOCAL Playwright browser.

Agentspan runs @tool functions in a separate Conductor worker process, so a live
Playwright BrowserSession must live IN the worker. Main and worker share the local
filesystem and coordinate through backend/.uxworker/:

  control.json          main writes {token, run_id, step_file, do_not_click} before
                        each tester; the worker tools read it to learn which session
                        they serve and where to log.
  steps_<token>.jsonl   the worker appends one record per browser action; main reads
                        it back after the agent finishes (screenshots already land in
                        the shared backend/screenshots/ dir via BrowserSession).

Testers run SEQUENTIALLY (AgentspanRunner concurrency = 1), so one control file + one
worker-global browser never collide. ``run_ux_test_agentspan_worker`` raises on any
failure so the caller falls back to the in-process tester.
"""
from __future__ import annotations

import json
import os
import uuid

from ..browser.playwright_driver import BrowserSession
from ..config import settings
from ..llm.client import extract_json

_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".uxworker"))
_CONTROL = os.path.join(_DIR, "control.json")


def _control_read() -> dict:
    try:
        with open(_CONTROL) as f:
            return json.load(f)
    except Exception:
        return {}


# --------------------------------------------------------------------------- #
# Worker-side state (lives in the Conductor worker process)
# --------------------------------------------------------------------------- #
_W: dict = {"token": None, "browser": None, "idx": 0, "step_file": None}


def _ensure_session() -> BrowserSession:
    """Return the worker's browser, (re)creating it when a new tester starts."""
    ctrl = _control_read()
    token = ctrl.get("token")
    if token and token != _W["token"]:
        if _W["browser"] is not None:
            try:
                _W["browser"].close()
            except Exception:
                pass
        _W["browser"] = BrowserSession(
            ctrl.get("run_id", "agentspan"),
            do_not_click_rules=ctrl.get("do_not_click_rules") or [],
        )
        _W["token"] = token
        _W["idx"] = 0
        _W["step_file"] = ctrl.get("step_file")
    return _W["browser"]


def _obs_text(o: dict) -> str:
    s = (f"[{o.get('note', '')}] {o.get('title', '')} | "
         f"buttons={o.get('buttons', [])[:8]} | inputs={o.get('inputs', [])[:8]}")
    if o.get("errors"):
        s += f" | errors={o['errors']}"
    return s[:500]


def _record(tool: str, args: dict, obs: dict) -> dict:
    idx = _W["idx"]
    _W["idx"] += 1
    rec = {"index": idx, "tool": tool, "args": args,
           "observation": _obs_text(obs), "screenshot_path": obs.get("screenshot_path")}
    sf = _W["step_file"]
    if sf:
        try:
            with open(sf, "a") as f:
                f.write(json.dumps(rec) + "\n")
        except Exception:
            pass
    return {"url": obs.get("url", ""), "title": obs.get("title", ""),
            "visible_text": (obs.get("visible_text", "") or "")[:1200],
            "buttons": obs.get("buttons", [])[:20], "inputs": obs.get("inputs", [])[:20],
            "errors": obs.get("errors", [])}


def _build_tools():
    from agentspan.agents import tool  # lazy: only present in the worker

    cap = settings.max_browser_actions

    @tool
    def open_url(url: str) -> dict:
        """Open a URL in the browser and return the page state."""
        if _W["idx"] >= cap:
            return {"note": "action limit reached"}
        return _record("open_url", {"url": url}, _ensure_session().open_url(url))

    @tool
    def get_page_state() -> dict:
        """Return the current page's title, visible text, buttons, and inputs."""
        if _W["idx"] >= cap:
            return {"note": "action limit reached"}
        return _record("get_page_state", {}, _ensure_session().get_page_state())

    @tool
    def click_by_text(text: str) -> dict:
        """Click the first element matching the text. Destructive actions are blocked."""
        if _W["idx"] >= cap:
            return {"note": "action limit reached"}
        return _record("click_by_text", {"text": text}, _ensure_session().click_by_text(text))

    @tool
    def type_into_field(label_or_placeholder: str, value: str) -> dict:
        """Type a value into the input identified by its label or placeholder."""
        if _W["idx"] >= cap:
            return {"note": "action limit reached"}
        return _record("type_into_field", {"label_or_placeholder": label_or_placeholder, "value": value},
                       _ensure_session().type_into_field(label_or_placeholder, value))

    @tool
    def scroll(direction: str) -> dict:
        """Scroll the page 'up' or 'down'."""
        if _W["idx"] >= cap:
            return {"note": "action limit reached"}
        return _record("scroll", {"direction": direction}, _ensure_session().scroll(direction))

    @tool
    def go_back() -> dict:
        """Navigate back to the previous page."""
        if _W["idx"] >= cap:
            return {"note": "action limit reached"}
        return _record("go_back", {}, _ensure_session().go_back())

    return [open_url, get_page_state, click_by_text, type_into_field, scroll, go_back]


def _extract_report(res):
    out = getattr(res, "output", None)
    val = out.get("result") if isinstance(out, dict) else out
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        return extract_json(val)
    return None


def _fallback_report(persona: dict, steps: list[dict]) -> dict:
    errs = [s["observation"] for s in steps if "errors=" in s.get("observation", "")]
    return {
        "persona": persona.get("name", "Persona"),
        "task_success": False,
        "step_log": [f"{s['tool']} {s.get('args', {})}" for s in steps],
        "friction_points": ["Agent ended without returning a structured report"],
        "evidence": errs[:3],
        "severity": "medium",
        "recommendations": ["Re-run the tester; the agent stopped before finish_report"],
        "confidence": 0.3,
    }


# --------------------------------------------------------------------------- #
# Main-process entry
# --------------------------------------------------------------------------- #
def run_ux_test_agentspan_worker(persona: dict, inputs: dict, prompt_override: str | None):
    """Run one UXTester as a real Agentspan agent (worker-local browser).

    Returns ``(report_dict, steps_list)``. Raises on any failure so the caller can
    fall back to the in-process tester.
    """
    from agentspan.agents import Agent, AgentRuntime  # lazy import
    from ..agents.ux_tester import _AGENT_SYSTEM, _normalize

    os.makedirs(_DIR, exist_ok=True)
    token = uuid.uuid4().hex
    step_file = os.path.join(_DIR, f"steps_{token}.jsonl")
    open(step_file, "w").close()  # seed empty
    with open(_CONTROL, "w") as f:
        json.dump({
            "token": token,
            "run_id": inputs.get("_run_id", "agentspan"),
            "step_file": step_file,
            "do_not_click_rules": inputs.get("do_not_click_rules") or [],
        }, f)

    system = (prompt_override or _AGENT_SYSTEM) + (
        "\n\nUse the browser tools to open the product, observe each page, attempt the task, then respond "
        "with ONLY the strict JSON report object.")
    agent = Agent(
        name="ux_tester",
        model=f"anthropic/{settings.llm_model_fast}",
        instructions=system,
        tools=_build_tools(),
    )
    query = (
        f"Persona: {persona.get('name', '')} - {persona.get('description', '')}\n"
        f"Traits: {persona.get('traits', [])}\n"
        f"Product URL: {inputs.get('url', '')}\n"
        f"Task: {inputs.get('task', '')}\n"
        f"Success criteria: {inputs.get('success_criteria', '')}\n"
        "Open the URL, attempt the task, then output the strict JSON UX report."
    )
    with AgentRuntime() as rt:
        res = rt.run(agent, query)

    steps: list[dict] = []
    try:
        with open(step_file) as f:
            for line in f:
                line = line.strip()
                if line:
                    steps.append(json.loads(line))
    except Exception:
        pass
    try:
        os.remove(step_file)
    except Exception:
        pass

    raw = _extract_report(res)
    if not isinstance(raw, dict) or not raw:
        raw = _fallback_report(persona, steps)
    raw.setdefault("persona", persona.get("name", "Persona"))
    return _normalize(raw, persona), steps
