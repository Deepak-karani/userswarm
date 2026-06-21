"""UXTesterAgent: bounded scripted exploration + strict report synthesis.

The exploration is the SAME in mock and live mode and always demonstrates real
open -> observe -> click -> observe behavior. It is capped at
``settings.max_browser_actions`` and degrades gracefully. After exploring, the
LLM is asked for the strict JSON report given the observed page states.
"""
from __future__ import annotations

import json

from ..browser import safety
from ..browser.playwright_driver import BrowserSession
from ..config import settings
from ..llm.client import FAST, LLMClient

_DEFAULT_SYSTEM = (
    "You are a rigorous, skeptical UX tester. You attempted a task as a specific persona using a real "
    "browser. Produce a STRICT JSON UX report. Rules:\n"
    "- Only report friction you can support with concrete on-page evidence (a button label, visible text, "
    "or an observed state change).\n"
    "- NEVER invent UI you did not observe.\n"
    "- Set task_success true only if the success criteria were literally met.\n"
    "- Give specific, actionable recommendations tied to the friction.\n"
    'Respond as JSON with keys: persona, task_success, step_log[], friction_points[], evidence[], '
    "severity(low|medium|high), recommendations[], confidence(0-1)."
)

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
        f"buttons={observation_obj.get('buttons', [])[:6]} | "
        f"inputs={observation_obj.get('inputs', [])[:6]}"
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


def run_test(
    llm: LLMClient,
    persona: dict,
    inputs: dict,
    browser: BrowserSession,
    run_id: str,
    prompt_override: str | None,
) -> tuple[dict, list[dict]]:
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

    # 1) open
    url = inputs.get("url", "")
    if idx < cap:
        record("open_url", {"url": url}, browser.open_url(url))

    # 2) observe
    if idx < cap:
        state = browser.get_page_state()
        record("get_page_state", {}, state)
    else:
        state = states[-1] if states else {}

    # Early stop if login required and no creds available.
    if _looks_like_login(state):
        login_blocked = True

    # 3) attempt one likely CTA (skip if none or login-blocked)
    if not login_blocked and idx < cap:
        cta = _pick_cta(state, rules)
        if cta:
            record("click_by_text", {"text": cta}, browser.click_by_text(cta))
            # 4) observe again
            if idx < cap:
                record("get_page_state", {}, browser.get_page_state())

    # 5) optional scroll
    if not login_blocked and idx < cap:
        record("scroll", {"direction": "down"}, browser.scroll("down"))

    report = _synthesize_report(llm, persona, inputs, states, prompt_override, login_blocked)
    return report, steps


def _synthesize_report(
    llm: LLMClient,
    persona: dict,
    inputs: dict,
    states: list[dict],
    prompt_override: str | None,
    login_blocked: bool,
) -> dict:
    system = prompt_override or _DEFAULT_SYSTEM
    observed = [
        {
            "url": s.get("url", ""),
            "title": s.get("title", ""),
            "visible_text": s.get("visible_text", ""),
            "buttons": s.get("buttons", []),
            "inputs": s.get("inputs", []),
            "note": s.get("note", ""),
        }
        for s in states
    ]
    user = (
        f"Persona: {persona.get('name', '')} - {persona.get('description', '')}\n"
        f"Traits: {persona.get('traits', [])}\n"
        f"Task: {inputs.get('task', '')}\n"
        f"Success criteria: {inputs.get('success_criteria', '')}\n\n"
        f"Observed page states (in order):\n{json.dumps(observed, indent=2)[:6000]}\n\n"
        "Now produce the strict JSON UX report."
    )
    default = {
        "persona": persona.get("name", "Persona"),
        "task_success": not login_blocked,
        "step_log": [],
        "friction_points": [],
        "evidence": [],
        "severity": "medium",
        "recommendations": [],
        "confidence": 0.5,
    }
    report = llm.complete_json(system=system, user=user, tier=FAST, default=default)
    if not isinstance(report, dict):
        report = dict(default)

    report.setdefault("persona", persona.get("name", "Persona"))

    if login_blocked:
        report["task_success"] = False
        fps = list(report.get("friction_points") or [])
        msg = "login required, no test credentials"
        if msg not in fps:
            fps.append(msg)
        report["friction_points"] = fps
        ev = list(report.get("evidence") or [])
        ev.append("Page presented a login / sign-in wall before the task could be attempted.")
        report["evidence"] = ev
    return report
