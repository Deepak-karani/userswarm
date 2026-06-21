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

from ..config import settings
from . import safety

_VISIBLE_TEXT_CAP = 1500
_SCREENSHOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "screenshots"))


def _truncate(text: str, cap: int = _VISIBLE_TEXT_CAP) -> str:
    text = (text or "").strip()
    return text if len(text) <= cap else text[:cap] + "…"


class BrowserSession:
    """One isolated real-browser session. Raises on construction if Chromium
    cannot launch — there is no static fallback."""

    def __init__(self, run_id: str, do_not_click_rules: list[str] | None = None) -> None:
        self.run_id = run_id
        self.do_not_click_rules = do_not_click_rules or []
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
            fname = f"{self.run_id}_{self._shot_idx}.png"
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
                label = el.get_attribute("placeholder") or el.get_attribute("name") or el.get_attribute("aria-label") or ""
                label = label.strip()
                if label and label not in inputs:
                    inputs.append(label)
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

    def click_by_text(self, text: str) -> dict:
        if safety.is_dangerous(text, self.do_not_click_rules):
            state = self._state([f"blocked destructive click on '{text}'"])
            state["note"] = "blocked: destructive action"
            return state
        errors: list[str] = []
        try:
            self._page.get_by_text(text, exact=False).first.click(timeout=5000)
            self._page.wait_for_load_state("domcontentloaded", timeout=8000)
        except Exception:
            errors.append(f"could not click '{text}'")
        return self._state(errors)

    def type_into_field(self, label_or_placeholder: str, value: str) -> dict:
        errors: list[str] = []
        try:
            loc = self._page.get_by_placeholder(label_or_placeholder)
            if loc.count() == 0:
                loc = self._page.get_by_label(label_or_placeholder)
            loc.first.fill(value, timeout=5000)
        except Exception:
            errors.append(f"could not type into '{label_or_placeholder}'")
        return self._state(errors)

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
