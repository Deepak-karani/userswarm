"""Destructive-action guard for the browser tool-loop.

Before any click we check the target text against a built-in keyword blocklist
plus the run's custom ``do_not_click_rules``. Matching is case-insensitive and
substring-based so "Place order now" trips on "place order".
"""
from __future__ import annotations

DANGEROUS_KEYWORDS = [
    "buy", "purchase", "pay", "payment", "checkout", "delete", "remove",
    "send", "invite", "subscribe", "confirm order", "place order",
]


def is_dangerous(text: str | None, do_not_click_rules: list[str] | None) -> bool:
    """True if *text* matches any dangerous keyword or custom rule."""
    if not text:
        return False
    haystack = text.lower()
    for kw in DANGEROUS_KEYWORDS:
        if kw in haystack:
            return True
    for rule in do_not_click_rules or []:
        if rule and str(rule).strip().lower() in haystack:
            return True
    return False
