"""Real Agentspan-backed UX tester.

Builds an Agentspan ``Agent`` whose tools are the browser actions, runs it on the
Agentspan ``AgentRuntime`` (durable workflow server at ``AGENTSPAN_SERVER_URL``),
and maps the result into our strict report + step log. Browser tools are
module-level (Agentspan ``@tool`` requirement) so each worker thread binds its own
``BrowserSession`` via a thread-local context. Any failure raises, letting the
caller fall back to the in-process scripted tester.

SDK shape (per agentspan.ai/docs/quickstart):
    from agentspan.agents import Agent, AgentRuntime, tool
    agent = Agent(name=..., model="anthropic/<model>", instructions=..., tools=[...])
    with AgentRuntime() as runtime:
        result = runtime.run(agent, "query")
"""
from __future__ import annotations

import threading

from ..agents import ux_tester
from ..browser.playwright_driver import BrowserSession
from ..config import settings
from ..llm.client import LLMClient, extract_json

# Thread-local browser context so module-level @tool fns target the right session.
_ctx = threading.local()


def _record(tool: str, args: dict, obs: dict) -> dict:
    idx = getattr(_ctx, "idx", 0)
    _ctx.idx = idx + 1
    _ctx.states.append(obs)
    _ctx.steps.append(ux_tester._step(idx, tool, args, obs))
    # Return a compact view to the model.
    return {
        "url": obs.get("url", ""),
        "title": obs.get("title", ""),
        "visible_text": (obs.get("visible_text", "") or "")[:1200],
        "buttons": obs.get("buttons", [])[:12],
        "inputs": obs.get("inputs", [])[:12],
        "note": obs.get("note", ""),
    }


def _capped() -> bool:
    return getattr(_ctx, "idx", 0) >= getattr(_ctx, "cap", 12)


def _build_tools():
    """Define the @tool-decorated browser functions bound to the thread context."""
    from agentspan.agents import tool  # lazy: only when Agentspan is present

    @tool
    def open_url(url: str) -> dict:
        """Open a URL in the browser and return the page state."""
        if _capped():
            return {"note": "action limit reached"}
        return _record("open_url", {"url": url}, _ctx.session.open_url(url))

    @tool
    def get_page_state() -> dict:
        """Return the current page's title, visible text, buttons, and inputs."""
        if _capped():
            return {"note": "action limit reached"}
        return _record("get_page_state", {}, _ctx.session.get_page_state())

    @tool
    def click_by_text(text: str) -> dict:
        """Click the first visible element matching the text. Destructive actions are blocked."""
        if _capped():
            return {"note": "action limit reached"}
        return _record("click_by_text", {"text": text}, _ctx.session.click_by_text(text))

    @tool
    def type_into_field(label_or_placeholder: str, value: str) -> dict:
        """Type a value into the input identified by its label or placeholder."""
        if _capped():
            return {"note": "action limit reached"}
        return _record(
            "type_into_field",
            {"label_or_placeholder": label_or_placeholder, "value": value},
            _ctx.session.type_into_field(label_or_placeholder, value),
        )

    @tool
    def scroll(direction: str) -> dict:
        """Scroll the page 'up' or 'down'."""
        if _capped():
            return {"note": "action limit reached"}
        return _record("scroll", {"direction": direction}, _ctx.session.scroll(direction))

    @tool
    def go_back() -> dict:
        """Navigate back to the previous page."""
        if _capped():
            return {"note": "action limit reached"}
        return _record("go_back", {}, _ctx.session.go_back())

    return [open_url, get_page_state, click_by_text, type_into_field, scroll, go_back]


def _result_text(result) -> str:
    for attr in ("output", "final_output", "text", "content", "message"):
        val = getattr(result, attr, None)
        if isinstance(val, str) and val.strip():
            return val
    return str(result)


def run_ux_test_agentspan(
    llm: LLMClient,
    persona: dict,
    inputs: dict,
    run_id: str,
    prompt_override: str | None,
) -> tuple[dict, list[dict]]:
    """Run one UX tester as a real Agentspan agent. Raises on any failure."""
    from agentspan.agents import Agent, AgentRuntime  # lazy import

    session = BrowserSession(run_id, do_not_click_rules=inputs.get("do_not_click_rules") or [])
    _ctx.session = session
    _ctx.steps = []
    _ctx.states = []
    _ctx.idx = 0
    _ctx.cap = settings.max_browser_actions

    try:
        tools = _build_tools()
        instructions = (prompt_override or ux_tester._DEFAULT_SYSTEM) + (
            "\n\nUse the browser tools to open the product, observe the page, attempt the task, "
            "and gather evidence (cap your actions). When done, respond with ONLY the strict JSON "
            "report object — no prose."
        )
        agent = Agent(
            name="ux_tester",
            model=f"anthropic/{settings.llm_model_fast}",
            instructions=instructions,
            tools=tools,
        )
        query = (
            f"Persona: {persona.get('name', '')} - {persona.get('description', '')}\n"
            f"Traits: {persona.get('traits', [])}\n"
            f"Product URL: {inputs.get('url', '')}\n"
            f"Task: {inputs.get('task', '')}\n"
            f"Success criteria: {inputs.get('success_criteria', '')}\n"
            "Open the URL, attempt the task, then output the strict JSON UX report."
        )
        with AgentRuntime() as runtime:
            result = runtime.run(agent, query)

        raw = extract_json(_result_text(result))
        if not isinstance(raw, dict):
            # Agent didn't return clean JSON; synthesize from observed states.
            raw = ux_tester._synthesize_report(
                llm, persona, inputs, _ctx.states, prompt_override, login_blocked=False
            )
        raw.setdefault("persona", persona.get("name", "Persona"))
        return raw, list(_ctx.steps)
    finally:
        try:
            session.close()
        finally:
            _ctx.session = None
            _ctx.states = []
