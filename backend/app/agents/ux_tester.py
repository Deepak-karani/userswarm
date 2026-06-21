"""UXTesterAgent.

Live mode: a real Claude tool-use loop. The model sees each page state and decides
the next browser action (open/click/type/scroll/go_back) to accomplish the builder's
task as a given persona, then calls ``finish_report`` with a strict UX report. This is
a goal-driven agent — it pursues the task (e.g. "book a demo via the Calendly widget"),
not a fixed script.

Mock mode (offline, no ANTHROPIC_API_KEY): a bounded scripted exploration so the demo
still runs without an API key.

Both paths are capped at ``settings.max_browser_actions`` and record every browser
action as a step (with screenshot) for the dashboard.
"""
from __future__ import annotations

import json
import time

from ..browser import safety
from ..browser.playwright_driver import BrowserSession
from ..browser.tools import TOOL_SCHEMAS
from ..config import settings
from ..llm.client import FAST, LLMClient

_AGENT_SYSTEM = (
    "You are a real user with the persona below, testing a LIVE website to accomplish a specific task. "
    "You control a real browser through tools. Work toward the task step by step:\n"
    "- Read the current page state (visible_text, buttons, inputs) before acting.\n"
    "- Click the element that actually advances the TASK (e.g. to book a demo, click the booking CTA, "
    "then interact with the scheduler/calendar that appears: pick an available date, then a time, fill required "
    "fields like name/email, and confirm).\n"
    "- After a click or navigation, call get_page_state to see what changed (modals and embedded widgets like "
    "Calendly load asynchronously).\n"
    "- Never do destructive actions (purchases, deletes, sending real messages).\n"
    "- You have a LIMITED number of actions and time — be efficient; don't re-read the same unchanged page.\n"
    "- THIS IS A TEST: do NOT perform irreversible final submissions (final 'Confirm', 'Schedule Event', "
    "'Place order', 'Send', 'Pay'). For booking/checkout flows, go as far as the final confirmation screen "
    "(select date + time, fill required fields), then STOP and report. Reaching the ready-to-submit confirmation "
    "counts as completing the task.\n"
    "When done or stuck, call finish_report. Rules: set task_success true if the success criteria were met OR you "
    "reached the final ready-to-submit confirmation; cite concrete on-page evidence for every friction point; "
    "never invent UI you did not observe; give specific, actionable recommendations."
)

_DEFAULT_SYSTEM = _AGENT_SYSTEM  # back-compat for callers/imports

_LOGIN_HINTS = ("log in", "login", "sign in", "signin", "password", "create account", "register")


def _looks_like_login(state: dict) -> bool:
    blob = (state.get("visible_text", "") + " " + " ".join(state.get("buttons", []))).lower()
    return any(h in blob for h in _LOGIN_HINTS)


def _pick_cta(state: dict, do_not_click_rules: list[str]) -> str | None:
    for label in state.get("buttons", []):
        if label and not safety.is_dangerous(label, do_not_click_rules):
            return label
    return None


def _step(index: int, tool: str, args: dict, observation_obj: dict) -> dict:
    note = observation_obj.get("note", "")
    errs = observation_obj.get("errors", [])
    obs = (
        f"[{note}] {observation_obj.get('title', '')} | "
        f"buttons={observation_obj.get('buttons', [])[:8]} | "
        f"inputs={observation_obj.get('inputs', [])[:8]}"
    )
    if errs:
        obs += f" | errors={errs}"
    return {
        "index": index,
        "tool": tool,
        "args": args,
        "observation": obs[:500],
        "screenshot_path": observation_obj.get("screenshot_path"),
    }


def _compact(obs: dict) -> str:
    return json.dumps(
        {
            "url": obs.get("url", ""),
            "title": obs.get("title", ""),
            "visible_text": (obs.get("visible_text", "") or "")[:1200],
            "buttons": obs.get("buttons", [])[:20],
            "inputs": obs.get("inputs", [])[:20],
            "errors": obs.get("errors", []),
        }
    )[:2500]


def _exec_tool(browser: BrowserSession, name: str, args: dict) -> dict:
    if name == "open_url":
        return browser.open_url(args.get("url", ""))
    if name == "get_page_state":
        return browser.get_page_state()
    if name == "click_by_text":
        return browser.click_by_text(args.get("text", ""))
    if name == "type_into_field":
        return browser.type_into_field(args.get("label_or_placeholder", ""), args.get("value", ""))
    if name == "scroll":
        return browser.scroll(args.get("direction", "down"))
    if name == "go_back":
        return browser.go_back()
    return browser.get_page_state()


def run_test(
    llm: LLMClient,
    persona: dict,
    inputs: dict,
    browser: BrowserSession,
    run_id: str,
    prompt_override: str | None,
) -> tuple[dict, list[dict]]:
    if llm.mock:
        return _scripted_test(llm, persona, inputs, browser, prompt_override)
    return _agentic_test(llm, persona, inputs, browser, prompt_override)


# --------------------------------------------------------------------------- #
# Live: real Claude tool-use loop
# --------------------------------------------------------------------------- #
def _agentic_test(llm, persona, inputs, browser, prompt_override) -> tuple[dict, list[dict]]:
    cap = settings.max_browser_actions
    system = prompt_override or _AGENT_SYSTEM
    steps: list[dict] = []
    states: list[dict] = []
    idx = 0

    # Seed: open the product URL so the model starts on the page.
    url = inputs.get("url", "")
    obs = browser.open_url(url)
    states.append(obs)
    steps.append(_step(idx, "open_url", {"url": url}, obs))
    idx += 1

    initial = (
        f"PERSONA: {persona.get('name', '')} — {persona.get('description', '')}; "
        f"traits {persona.get('traits', [])}\n"
        f"TASK: {inputs.get('task', '')}\n"
        f"SUCCESS CRITERIA: {inputs.get('success_criteria', '')}\n\n"
        f"You have already opened {url}. Current page state:\n{_compact(obs)}\n\n"
        f"You may take up to {cap - 1} more browser actions. Decide the next action toward the task."
    )
    messages: list[dict] = [{"role": "user", "content": initial}]
    report: dict | None = None
    deadline = time.monotonic() + settings.tester_budget_seconds

    while idx < cap:
        if time.monotonic() > deadline:
            break  # out of time budget -> synthesize an honest report from what we saw
        msg = llm.complete(
            system=system, messages=messages, tools=TOOL_SCHEMAS, tier=FAST, max_tokens=2000
        )
        assistant_content: list[dict] = []
        tool_uses = []
        for b in getattr(msg, "content", []) or []:
            bt = getattr(b, "type", None)
            if bt == "text":
                assistant_content.append({"type": "text", "text": b.text})
            elif bt == "tool_use":
                assistant_content.append(
                    {"type": "tool_use", "id": b.id, "name": b.name, "input": b.input or {}}
                )
                tool_uses.append(b)
        messages.append({"role": "assistant", "content": assistant_content or [{"type": "text", "text": "(no output)"}]})

        if not tool_uses:
            break  # model stopped without acting

        tool_results: list[dict] = []
        finished = False
        for tu in tool_uses:
            if tu.name == "finish_report":
                report = dict(tu.input or {})
                finished = True
                tool_results.append({"type": "tool_result", "tool_use_id": tu.id, "content": "report received"})
                continue
            if idx >= cap:
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": tu.id,
                     "content": "action limit reached — call finish_report now."}
                )
                continue
            obs = _exec_tool(browser, tu.name, tu.input or {})
            states.append(obs)
            steps.append(_step(idx, tu.name, tu.input or {}, obs))
            idx += 1
            tool_results.append({"type": "tool_result", "tool_use_id": tu.id, "content": _compact(obs)})

        messages.append({"role": "user", "content": tool_results})
        if finished:
            break
        if idx >= cap:
            # One last chance to summarize honestly.
            messages.append({"role": "user", "content": "You have used all your actions. Call finish_report now."})
            msg = llm.complete(system=system, messages=messages, tools=TOOL_SCHEMAS,
                               tier=FAST, max_tokens=2000, tool_choice={"type": "tool", "name": "finish_report"})
            for b in getattr(msg, "content", []) or []:
                if getattr(b, "type", None) == "tool_use" and b.name == "finish_report":
                    report = dict(b.input or {})
            break

    if not isinstance(report, dict) or not report:
        report = _synthesize_report(llm, persona, inputs, states, prompt_override, login_blocked=False)
    return _normalize(report, persona), steps


def _normalize(report: dict, persona: dict) -> dict:
    report = dict(report or {})
    report.setdefault("persona", persona.get("name", "Persona"))
    report.setdefault("task_success", False)
    for k in ("step_log", "friction_points", "evidence", "recommendations"):
        v = report.get(k)
        if not isinstance(v, list):
            report[k] = [] if v is None else [str(v)]
    if report.get("severity") not in ("low", "medium", "high"):
        report["severity"] = "medium"
    try:
        report["confidence"] = max(0.0, min(1.0, float(report.get("confidence", 0.5))))
    except Exception:
        report["confidence"] = 0.5
    return report


# --------------------------------------------------------------------------- #
# Mock: bounded scripted exploration (offline)
# --------------------------------------------------------------------------- #
def _scripted_test(llm, persona, inputs, browser, prompt_override) -> tuple[dict, list[dict]]:
    rules = inputs.get("do_not_click_rules") or []
    cap = settings.max_browser_actions
    steps: list[dict] = []
    states: list[dict] = []
    idx = 0
    login_blocked = False

    def record(tool: str, args: dict, obs: dict) -> None:
        nonlocal idx
        states.append(obs)
        steps.append(_step(idx, tool, args, obs))
        idx += 1

    url = inputs.get("url", "")
    if idx < cap:
        record("open_url", {"url": url}, browser.open_url(url))
    if idx < cap:
        state = browser.get_page_state()
        record("get_page_state", {}, state)
    else:
        state = states[-1] if states else {}
    if _looks_like_login(state):
        login_blocked = True
    if not login_blocked and idx < cap:
        cta = _pick_cta(state, rules)
        if cta:
            record("click_by_text", {"text": cta}, browser.click_by_text(cta))
            if idx < cap:
                record("get_page_state", {}, browser.get_page_state())
    if not login_blocked and idx < cap:
        record("scroll", {"direction": "down"}, browser.scroll("down"))

    report = _synthesize_report(llm, persona, inputs, states, prompt_override, login_blocked)
    return _normalize(report, persona), steps


def _synthesize_report(llm, persona, inputs, states, prompt_override, login_blocked) -> dict:
    system = prompt_override or _AGENT_SYSTEM
    observed = [
        {
            "url": s.get("url", ""), "title": s.get("title", ""),
            "visible_text": s.get("visible_text", ""), "buttons": s.get("buttons", []),
            "inputs": s.get("inputs", []), "note": s.get("note", ""),
        }
        for s in states
    ]
    user = (
        f"Persona: {persona.get('name', '')} - {persona.get('description', '')}\n"
        f"Task: {inputs.get('task', '')}\n"
        f"Success criteria: {inputs.get('success_criteria', '')}\n\n"
        f"Observed page states (in order):\n{json.dumps(observed, indent=2)[:6000]}\n\n"
        "Now produce the strict JSON UX report with keys: persona, task_success, step_log, "
        "friction_points, evidence, severity, recommendations, confidence."
    )
    default = {
        "persona": persona.get("name", "Persona"), "task_success": not login_blocked,
        "step_log": [], "friction_points": [], "evidence": [], "severity": "medium",
        "recommendations": [], "confidence": 0.5,
    }
    report = llm.complete_json(system=system, user=user, tier=FAST, default=default)
    if not isinstance(report, dict):
        report = dict(default)
    if login_blocked:
        report["task_success"] = False
        fps = list(report.get("friction_points") or [])
        if "login required, no test credentials" not in fps:
            fps.append("login required, no test credentials")
        report["friction_points"] = fps
    return report
