"""Browser session abstraction with a real Playwright path and a static fallback.

Playwright is imported lazily *inside* methods so importing this module never
requires the package. Every tool method returns a uniform observation dict and
NEVER raises: if Playwright is missing, launch fails, or the site blocks the
bot, we fall back to an ``httpx`` GET + light regex parse (``note="static-fallback"``).
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


def _static_fetch(url: str) -> dict:
    """Fallback: fetch + regex-parse a page when Playwright is unavailable."""
    try:
        import httpx

        resp = httpx.get(url, follow_redirects=True, timeout=15.0,
                         headers={"User-Agent": "Mozilla/5.0 (UserSwarm static-fallback)"})
        html = resp.text
    except Exception as exc:  # network blocked / offline
        return {
            "url": url, "title": "", "visible_text": "",
            "buttons": [], "inputs": [], "errors": [f"fetch failed: {exc}"],
            "screenshot_path": None, "note": "static-fallback",
        }

    title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    title = title_m.group(1).strip() if title_m else ""

    buttons = []
    for m in re.finditer(r"<button[^>]*>(.*?)</button>", html, re.IGNORECASE | re.DOTALL):
        txt = re.sub(r"<[^>]+>", " ", m.group(1))
        txt = re.sub(r"\s+", " ", txt).strip()
        if txt:
            buttons.append(txt)
    for m in re.finditer(r'<a\b[^>]*class="[^"]*(?:btn|button|cta)[^"]*"[^>]*>(.*?)</a>',
                         html, re.IGNORECASE | re.DOTALL):
        txt = re.sub(r"<[^>]+>", " ", m.group(1))
        txt = re.sub(r"\s+", " ", txt).strip()
        if txt:
            buttons.append(txt)
    for m in re.finditer(r'<input[^>]*type="(?:submit|button)"[^>]*value="([^"]+)"', html, re.IGNORECASE):
        buttons.append(m.group(1).strip())

    inputs = []
    for m in re.finditer(r"<input\b[^>]*>", html, re.IGNORECASE):
        tag = m.group(0)
        ph = re.search(r'placeholder="([^"]+)"', tag, re.IGNORECASE)
        nm = re.search(r'name="([^"]+)"', tag, re.IGNORECASE)
        label = (ph.group(1) if ph else (nm.group(1) if nm else "")).strip()
        if label:
            inputs.append(label)

    stripped = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    stripped = re.sub(r"<[^>]+>", " ", stripped)
    stripped = re.sub(r"\s+", " ", stripped).strip()

    return {
        "url": str(getattr(resp, "url", url)),
        "title": title,
        "visible_text": _truncate(stripped),
        "buttons": buttons[:25],
        "inputs": inputs[:25],
        "errors": [],
        "screenshot_path": None,
        "note": "static-fallback",
    }


class BrowserSession:
    """One isolated session. Playwright sync is NOT thread-safe across sessions,
    so each UX tester thread must construct its own ``BrowserSession``."""

    def __init__(self, run_id: str, do_not_click_rules: list[str] | None = None) -> None:
        self.run_id = run_id
        self.do_not_click_rules = do_not_click_rules or []
        self._pw = None
        self._browser = None
        self._page = None
        self._shot_idx = 0
        self._static_url: str | None = None  # last url in static mode
        self._live = self._try_start_live()

    # ---- lifecycle ----
    def _try_start_live(self) -> bool:
        try:
            from playwright.sync_api import sync_playwright

            self._pw = sync_playwright().start()
            self._browser = self._pw.chromium.launch(headless=settings.browser_headless)
            self._page = self._browser.new_page()
            return True
        except Exception:
            self._teardown_live()
            return False

    def _teardown_live(self) -> None:
        for closer in (getattr(self._browser, "close", None), getattr(self._pw, "stop", None)):
            try:
                if closer:
                    closer()
            except Exception:
                pass
        self._pw = self._browser = self._page = None
        self._live = False

    def close(self) -> None:
        self._teardown_live()

    # ---- screenshots ----
    def _screenshot(self) -> str | None:
        if not self._live or self._page is None:
            return None
        try:
            os.makedirs(_SCREENSHOT_DIR, exist_ok=True)
            fname = f"{self.run_id}_{self._shot_idx}.png"
            self._shot_idx += 1
            self._page.screenshot(path=os.path.join(_SCREENSHOT_DIR, fname))
            return f"/static/screenshots/{fname}"
        except Exception:
            return None

    # ---- state extraction (live) ----
    def _live_state(self, note: str = "live") -> dict:
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
            "errors": [],
            "screenshot_path": self._screenshot(),
            "note": note,
        }

    # ---- tools ----
    def open_url(self, url: str) -> dict:
        if self._live:
            try:
                self._page.goto(url, wait_until="domcontentloaded", timeout=20000)
                return self._live_state("live")
            except Exception:
                # Navigation failed / blocked -> degrade to static.
                self._teardown_live()
        self._static_url = url
        return _static_fetch(url)

    def get_page_state(self) -> dict:
        if self._live:
            try:
                return self._live_state("live")
            except Exception:
                self._teardown_live()
        if self._static_url:
            return _static_fetch(self._static_url)
        return {
            "url": "", "title": "", "visible_text": "", "buttons": [], "inputs": [],
            "errors": ["no page open"], "screenshot_path": None, "note": "static-fallback",
        }

    def click_by_text(self, text: str) -> dict:
        if safety.is_dangerous(text, self.do_not_click_rules):
            state = self.get_page_state()
            state["note"] = "blocked: destructive action"
            state["errors"] = list(state.get("errors", [])) + [f"blocked click on '{text}'"]
            return state
        if self._live:
            try:
                self._page.get_by_text(text, exact=False).first.click(timeout=5000)
                self._page.wait_for_load_state("domcontentloaded", timeout=8000)
                return self._live_state("live")
            except Exception:
                state = self._safe_live_state()
                state["errors"] = list(state.get("errors", [])) + [f"could not click '{text}'"]
                return state
        state = self.get_page_state()
        state["errors"] = list(state.get("errors", [])) + [f"click '{text}' unavailable in static-fallback"]
        return state

    def type_into_field(self, label_or_placeholder: str, value: str) -> dict:
        if self._live:
            try:
                loc = self._page.get_by_placeholder(label_or_placeholder)
                if loc.count() == 0:
                    loc = self._page.get_by_label(label_or_placeholder)
                loc.first.fill(value, timeout=5000)
                return self._live_state("live")
            except Exception:
                state = self._safe_live_state()
                state["errors"] = list(state.get("errors", [])) + [f"could not type into '{label_or_placeholder}'"]
                return state
        state = self.get_page_state()
        state["errors"] = list(state.get("errors", [])) + ["type unavailable in static-fallback"]
        return state

    def scroll(self, direction: str) -> dict:
        if self._live:
            try:
                delta = 800 if str(direction).lower() != "up" else -800
                self._page.mouse.wheel(0, delta)
                return self._live_state("live")
            except Exception:
                return self._safe_live_state()
        return self.get_page_state()

    def go_back(self) -> dict:
        if self._live:
            try:
                self._page.go_back(wait_until="domcontentloaded", timeout=8000)
                return self._live_state("live")
            except Exception:
                return self._safe_live_state()
        return self.get_page_state()

    def _safe_live_state(self) -> dict:
        try:
            return self._live_state("live")
        except Exception:
            self._teardown_live()
            return self.get_page_state()
