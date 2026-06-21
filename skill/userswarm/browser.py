#!/usr/bin/env python3
"""UserSwarm local browser driver — a persistent headless Chromium you drive from the CLI.

Claude Code calls these commands to test a local app as different user personas. The
browser persists across commands via a CDP endpoint, so navigation state is kept
between calls (open in one call, click in the next). Each command prints ONE JSON
observation line. Destructive clicks (buy, pay, delete, send, ...) are refused.

  python browser.py start [--headed]      # launch the persistent browser
  python browser.py open <url>            # navigate, return page state
  python browser.py state                 # return current page state
  python browser.py click "<text>"        # click element by visible text
  python browser.py type "<label>" "<v>"  # type into field by label/placeholder
  python browser.py scroll <up|down>      # scroll
  python browser.py stop                  # close the browser

Observation JSON: {url,title,visible_text,buttons,inputs,errors,screenshot_path,note}
Screenshots are written to .userswarm/screenshots/ in the current project.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
import urllib.request

STATE_DIR = os.path.abspath(".userswarm")
STATE = os.path.join(STATE_DIR, "browser.json")
PROFILE = os.path.join(STATE_DIR, "profile")
SHOTS = os.path.join(STATE_DIR, "screenshots")
PORT = 9456
CDP = f"http://127.0.0.1:{PORT}"
CAP = 1500
DANGER = ["buy", "purchase", "pay ", "payment", "checkout", "delete", "remove",
          "send", "invite", "subscribe", "confirm order", "place order"]


def out(o: dict) -> None:
    print(json.dumps(o))


def _load() -> dict:
    try:
        with open(STATE) as f:
            return json.load(f)
    except Exception:
        return {}


def _save(d: dict) -> None:
    with open(STATE, "w") as f:
        json.dump(d, f)


def _cdp_ready() -> bool:
    try:
        urllib.request.urlopen(f"{CDP}/json/version", timeout=1)
        return True
    except Exception:
        return False


def _truncate(t: str) -> str:
    t = (t or "").strip()
    return t if len(t) <= CAP else t[:CAP] + "…"


def _is_dangerous(text: str) -> bool:
    t = (text or "").lower()
    return any(k in t for k in DANGER)


# --------------------------------------------------------------------------- #
def cmd_start(headed: bool = False) -> None:
    os.makedirs(SHOTS, exist_ok=True)
    os.makedirs(PROFILE, exist_ok=True)
    if _cdp_ready():
        out({"ok": True, "note": "already running", "cdp": CDP})
        return
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            exe = p.chromium.executable_path
    except Exception as e:
        out({"ok": False, "error": f"Playwright/Chromium not installed: {e}. "
             "Run: pip install playwright && python -m playwright install chromium"})
        return
    args = [exe, f"--remote-debugging-port={PORT}", f"--user-data-dir={PROFILE}",
            "--no-first-run", "--no-default-browser-check"]
    if not headed:
        args.append("--headless=new")
    proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            start_new_session=True)
    for _ in range(40):
        if _cdp_ready():
            break
        time.sleep(0.25)
    _save({"pid": proc.pid, "cdp": CDP, "shot_idx": 0})
    out({"ok": _cdp_ready(), "pid": proc.pid, "cdp": CDP,
         "note": "browser ready" if _cdp_ready() else "browser did not become ready"})


def _connect():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    b = pw.chromium.connect_over_cdp(CDP)
    ctx = b.contexts[0] if b.contexts else b.new_context()
    page = ctx.pages[0] if ctx.pages else ctx.new_page()
    page.set_default_timeout(6000)
    return pw, b, page


def _contexts(page):
    ctxs = [page]
    try:
        ctxs += [f for f in page.frames if f is not page.main_frame]
    except Exception:
        pass
    return ctxs[:6]


def _screenshot(page) -> str | None:
    st = _load()
    idx = st.get("shot_idx", 0)
    st["shot_idx"] = idx + 1
    _save(st)
    try:
        os.makedirs(SHOTS, exist_ok=True)
        path = os.path.join(SHOTS, f"step_{idx}.png")
        page.screenshot(path=path)
        return os.path.relpath(path)
    except Exception:
        return None


def _state(page, errors: list[str] | None = None) -> dict:
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
            lab = el.get_attribute("placeholder") or el.get_attribute("name") or el.get_attribute("aria-label") or ""
            lab = lab.strip()
            if lab and lab not in inputs:
                inputs.append(lab)
    except Exception:
        pass
    return {"url": page.url, "title": title, "visible_text": _truncate(body),
            "buttons": buttons[:25], "inputs": inputs[:25], "errors": errors or [],
            "screenshot_path": _screenshot(page), "note": "live"}


def _with_page(fn) -> None:
    if not _cdp_ready():
        out({"error": "browser not running — run: python browser.py start"})
        return
    pw, b, page = _connect()
    try:
        out(fn(page))
    finally:
        try:
            pw.stop()  # disconnect; chromium stays alive
        except Exception:
            pass


def cmd_open(url: str) -> None:
    def go(page):
        errs = []
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
        except Exception as e:
            errs.append(f"navigation error: {str(e)[:160]}")
        return _state(page, errs)
    _with_page(go)


def cmd_state() -> None:
    _with_page(lambda page: _state(page))


def cmd_click(text: str) -> None:
    if _is_dangerous(text):
        _with_page(lambda page: {**_state(page, [f"blocked destructive click on '{text}'"]),
                                 "note": "blocked: destructive action"})
        return

    def click(page):
        for ctx in _contexts(page):
            for getter in (lambda c: c.get_by_role("button", name=text, exact=False),
                           lambda c: c.get_by_role("link", name=text, exact=False),
                           lambda c: c.get_by_text(text, exact=False)):
                try:
                    loc = getter(ctx).first
                    if loc.count() == 0:
                        continue
                    loc.scroll_into_view_if_needed(timeout=1000)
                    loc.click(timeout=2500)
                    try:
                        page.wait_for_load_state("domcontentloaded", timeout=3000)
                    except Exception:
                        pass
                    page.wait_for_timeout(500)
                    return _state(page)
                except Exception:
                    continue
        return _state(page, [f"could not click '{text}'"])
    _with_page(click)


def cmd_type(label: str, value: str) -> None:
    def typ(page):
        for ctx in _contexts(page):
            for getter in (lambda c: c.get_by_placeholder(label),
                           lambda c: c.get_by_label(label),
                           lambda c: c.get_by_role("textbox", name=label, exact=False)):
                try:
                    loc = getter(ctx).first
                    if loc.count() == 0:
                        continue
                    loc.fill(value, timeout=2500)
                    return _state(page)
                except Exception:
                    continue
        return _state(page, [f"could not type into '{label}'"])
    _with_page(typ)


def cmd_scroll(direction: str) -> None:
    def sc(page):
        try:
            page.mouse.wheel(0, 800 if str(direction).lower() != "up" else -800)
        except Exception:
            pass
        return _state(page)
    _with_page(sc)


def cmd_stop() -> None:
    st = _load()
    pid = st.get("pid")
    killed = False
    if pid:
        try:
            os.kill(pid, 15)
            killed = True
        except Exception:
            pass
    try:
        os.remove(STATE)
    except Exception:
        pass
    out({"ok": True, "stopped": killed})


def main() -> None:
    args = sys.argv[1:]
    if not args:
        out({"error": "usage: start|open|state|click|type|scroll|stop"})
        return
    cmd, rest = args[0], args[1:]
    if cmd == "start":
        cmd_start(headed="--headed" in rest)
    elif cmd == "open":
        cmd_open(rest[0] if rest else "")
    elif cmd == "state":
        cmd_state()
    elif cmd == "click":
        cmd_click(rest[0] if rest else "")
    elif cmd == "type":
        cmd_type(rest[0] if rest else "", rest[1] if len(rest) > 1 else "")
    elif cmd == "scroll":
        cmd_scroll(rest[0] if rest else "down")
    elif cmd == "stop":
        cmd_stop()
    else:
        out({"error": f"unknown command: {cmd}"})


if __name__ == "__main__":
    main()
