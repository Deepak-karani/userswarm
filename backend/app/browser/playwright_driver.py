"""Browser session — Playwright only (no static fallback).

Each UX tester thread constructs its own ``BrowserSession`` (Playwright sync is not
thread-safe across sessions). Construction launches a real headless Chromium; if
that fails the constructor RAISES (the run surfaces a real error instead of silently
degrading). Individual tool actions capture their own errors into the observation's
``errors`` list — that's genuine browser behavior (element not found, nav timeout),
not a fallback.
"""
from __future__ import annotations

import os
import re
import uuid

from ..config import settings
from . import safety

_VISIBLE_TEXT_CAP = 1500
_SCREENSHOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "screenshots"))

# Controls whose accessible name is destructive. A fuzzy text match must not resolve
# to one of these (e.g. a hidden "Delete <task title>" button) when the agent only
# asked to click the plain item text.
_DESTRUCTIVE = re.compile(r"\b(delete|remove|archive|discard|trash|destroy|clear)\b", re.I)


def _truncate(text: str, cap: int = _VISIBLE_TEXT_CAP) -> str:
    text = (text or "").strip()
    return text if len(text) <= cap else text[:cap] + "…"


class BrowserSession:
    """One isolated real-browser session. Raises on construction if Chromium
    cannot launch — there is no static fallback."""

    def __init__(self, run_id: str, do_not_click_rules: list[str] | None = None) -> None:
        self.run_id = run_id
        self.do_not_click_rules = do_not_click_rules or []
        # Unique per session so parallel testers don't overwrite each other's
        # screenshots. Filenames are keyed by run + this id + step index, so each
        # agent's actual navigation is preserved as its own image sequence.
        self._sid = uuid.uuid4().hex[:8]
        self._pw = None
        self._browser = None
        self._page = None
        self._shot_idx = 0
        self._start_live()  # raises on failure — no fallback

    # ---- lifecycle ----
    def _start_live(self) -> None:
        from playwright.sync_api import sync_playwright

        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(headless=settings.browser_headless)
        self._page = self._browser.new_page()
        # Bound every Playwright operation so a single action can't stall a run.
        self._page.set_default_timeout(8000)
        self._page.set_default_navigation_timeout(20000)

    def close(self) -> None:
        for closer in (getattr(self._browser, "close", None), getattr(self._pw, "stop", None)):
            try:
                if closer:
                    closer()
            except Exception:
                pass
        self._pw = self._browser = self._page = None

    # ---- screenshots ----
    def _screenshot(self) -> str | None:
        if self._page is None:
            return None
        try:
            os.makedirs(_SCREENSHOT_DIR, exist_ok=True)
            fname = f"{self.run_id}_{self._sid}_{self._shot_idx}.png"
            self._shot_idx += 1
            self._page.screenshot(path=os.path.join(_SCREENSHOT_DIR, fname))
            return f"/static/screenshots/{fname}"
        except Exception:
            return None

    # ---- state extraction ----
    def _state(self, errors: list[str] | None = None) -> dict:
        page = self._page
        try:
            title = page.title()
        except Exception:
            title = ""
        try:
            body = page.inner_text("body")
        except Exception:
            body = ""
        buttons: list[str] = []
        try:
            for el in page.query_selector_all("button, a[role=button], input[type=submit], [class*=btn]"):
                txt = (el.inner_text() if el else "") or el.get_attribute("value") or ""
                txt = re.sub(r"\s+", " ", txt).strip()
                if txt and txt not in buttons:
                    buttons.append(txt)
        except Exception:
            pass
        inputs: list[str] = []
        try:
            for el in page.query_selector_all("input, textarea"):
                itype = (el.get_attribute("type") or "text").lower()
                if itype in ("hidden", "submit", "button", "checkbox", "radio", "file"):
                    continue
                label = (
                    el.get_attribute("placeholder")
                    or el.get_attribute("aria-label")
                    or el.get_attribute("name")
                    or el.get_attribute("id")
                    or "field"
                ).strip()
                try:
                    val = (el.input_value() or "").strip()
                except Exception:
                    val = ""
                # Echo the CURRENT value so the agent can see what it has typed,
                # instead of assuming an unlabeled field "didn't register".
                entry = f"{label} = {val}" if val else label
                if entry not in inputs:
                    inputs.append(entry)
        except Exception:
            pass
        return {
            "url": page.url,
            "title": title,
            "visible_text": _truncate(body),
            "buttons": buttons[:25],
            "inputs": inputs[:25],
            "errors": errors or [],
            "screenshot_path": self._screenshot(),
            "note": "live",
        }

    # ---- tools ----
    def open_url(self, url: str) -> dict:
        errors: list[str] = []
        try:
            self._page.goto(url, wait_until="domcontentloaded", timeout=20000)
        except Exception as exc:
            errors.append(f"navigation error: {str(exc)[:160]}")
        return self._state(errors)

    def get_page_state(self) -> dict:
        return self._state()

    def _contexts(self):
        """Main page + (cross-origin) frames — Playwright can reach into iframes like an
        embedded Calendly widget. Capped to keep failed lookups fast."""
        ctxs = [self._page]
        try:
            ctxs += [f for f in self._page.frames if f is not self._page.main_frame]
        except Exception:
            pass
        return ctxs[:6]

    def click_by_text(self, text: str) -> dict:
        if safety.is_dangerous(text, self.do_not_click_rules):
            state = self._state([f"blocked destructive click on '{text}'"])
            state["note"] = "blocked: destructive action"
            return state
        wants_destructive = bool(_DESTRUCTIVE.search(text or ""))
        for ctx in self._contexts():
            # Exact matches first (so "Buy milk" hits the task label, not the
            # "Delete Buy milk" button), then fall back to fuzzy matching.
            for getter in (
                lambda c: c.get_by_role("button", name=text, exact=True),
                lambda c: c.get_by_role("checkbox", name=text, exact=False),
                lambda c: c.get_by_role("link", name=text, exact=True),
                lambda c: c.get_by_text(text, exact=True),
                lambda c: c.get_by_role("button", name=text, exact=False),
                lambda c: c.get_by_role("link", name=text, exact=False),
                lambda c: c.get_by_text(text, exact=False),
            ):
                try:
                    loc = getter(ctx).first
                    if loc.count() == 0:
                        continue
                    # Guard: a fuzzy match must not resolve to a destructive control
                    # whose name merely *contains* the requested text.
                    if not wants_destructive:
                        name = loc.get_attribute("aria-label") or ""
                        if not name:
                            try:
                                name = loc.inner_text(timeout=500) or ""
                            except Exception:
                                name = ""
                        if _DESTRUCTIVE.search(name):
                            continue
                    loc.scroll_into_view_if_needed(timeout=1000)
                    loc.click(timeout=2500)
                    try:
                        self._page.wait_for_load_state("domcontentloaded", timeout=3000)
                    except Exception:
                        pass
                    self._page.wait_for_timeout(500)  # let modals / iframes settle
                    return self._state()
                except Exception:
                    continue
        return self._state([f"could not click '{text}'"])

    def type_into_field(self, label_or_placeholder: str, value: str) -> dict:
        target = (label_or_placeholder or "").strip()
        # 1) Precise locators: placeholder / label / accessible name.
        for ctx in self._contexts():
            for getter in (
                lambda c: c.get_by_placeholder(target),
                lambda c: c.get_by_label(target),
                lambda c: c.get_by_role("textbox", name=target, exact=False),
            ):
                try:
                    loc = getter(ctx).first
                    if loc.count() == 0:
                        continue
                    loc.fill(value, timeout=2500)
                    return self._state()
                except Exception:
                    continue
        # 2) Fallback: the field may be intentionally unlabeled (no placeholder /
        # vague label) — that's a UX issue, not a broken input. Scan the visible
        # editable inputs and pick the best one so the agent can still proceed and
        # reports the *labeling* friction rather than false-claiming "unresponsive".
        obs = self._fuzzy_fill(target, value)
        if obs is not None:
            return obs
        return self._state([f"could not type into '{target}'"])

    def _fuzzy_fill(self, target: str, value: str) -> dict | None:
        """Type into the best visible editable input when named lookups miss.
        Scores candidates by token overlap with ``target`` and prefers empty fields,
        so multi-field forms get filled in order as the agent addresses each field."""
        tokens = [t for t in re.split(r"\W+", target.lower()) if len(t) > 2]
        sel = (
            "input:not([type=hidden]):not([type=checkbox]):not([type=radio])"
            ":not([type=submit]):not([type=button]):not([type=file]), textarea"
        )
        for ctx in self._contexts():
            try:
                els = ctx.query_selector_all(sel)
            except Exception:
                continue
            scored: list[tuple[int, object]] = []
            for el in els:
                try:
                    if not el.is_visible() or not el.is_editable():
                        continue
                    meta = " ".join(
                        v for v in (
                            el.get_attribute("placeholder"),
                            el.get_attribute("name"),
                            el.get_attribute("aria-label"),
                            el.get_attribute("id"),
                        ) if v
                    ).lower()
                    cur = el.input_value() or ""
                except Exception:
                    continue
                score = 0
                if tokens and any(tok in meta for tok in tokens):
                    score += 10
                if not cur.strip():
                    score += 1  # prefer empty fields so each type targets a new one
                scored.append((score, el))
            if not scored:
                continue
            scored.sort(key=lambda s: s[0], reverse=True)
            el = scored[0][1]
            try:
                el.fill(value, timeout=2500)
                return self._state()
            except Exception:
                try:
                    el.click(timeout=1500)
                    el.type(value, delay=10)
                    return self._state()
                except Exception:
                    continue
        return None

    def scroll(self, direction: str) -> dict:
        errors: list[str] = []
        try:
            delta = 800 if str(direction).lower() != "up" else -800
            self._page.mouse.wheel(0, delta)
        except Exception:
            errors.append(f"could not scroll {direction}")
        return self._state(errors)

    def go_back(self) -> dict:
        errors: list[str] = []
        try:
            self._page.go_back(wait_until="domcontentloaded", timeout=8000)
        except Exception:
            errors.append("could not go back")
        return self._state(errors)
