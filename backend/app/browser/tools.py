"""Anthropic tool-use schemas for the live browser tool-loop.

These mirror the methods on ``BrowserSession`` plus a ``finish_report`` terminal
tool. They are used when driving Claude in a live tool-calling loop; the scripted
explorer in ``ux_tester`` does not strictly need them, but they keep the live path
real-ready.
"""
from __future__ import annotations

TOOL_SCHEMAS: list[dict] = [
    {
        "name": "open_url",
        "description": "Navigate the browser to a URL and return the page state.",
        "input_schema": {
            "type": "object",
            "properties": {"url": {"type": "string", "description": "Absolute URL to open."}},
            "required": ["url"],
        },
    },
    {
        "name": "get_page_state",
        "description": "Return the current page's title, visible text, buttons, and inputs.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "click_by_text",
        "description": "Click the first visible element matching the given text. Destructive actions are blocked.",
        "input_schema": {
            "type": "object",
            "properties": {"text": {"type": "string", "description": "Visible label of the element to click."}},
            "required": ["text"],
        },
    },
    {
        "name": "type_into_field",
        "description": "Type a value into the input identified by its label or placeholder.",
        "input_schema": {
            "type": "object",
            "properties": {
                "label_or_placeholder": {"type": "string"},
                "value": {"type": "string"},
            },
            "required": ["label_or_placeholder", "value"],
        },
    },
    {
        "name": "scroll",
        "description": "Scroll the page 'up' or 'down'.",
        "input_schema": {
            "type": "object",
            "properties": {"direction": {"type": "string", "enum": ["up", "down"]}},
            "required": ["direction"],
        },
    },
    {
        "name": "go_back",
        "description": "Navigate back to the previous page.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "finish_report",
        "description": "Emit the final strict UX report and stop exploring.",
        "input_schema": {
            "type": "object",
            "properties": {
                "persona": {"type": "string"},
                "task_success": {"type": "boolean"},
                "step_log": {"type": "array", "items": {"type": "string"}},
                "friction_points": {"type": "array", "items": {"type": "string"}},
                "evidence": {"type": "array", "items": {"type": "string"}},
                "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                "recommendations": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
            },
            "required": ["persona", "task_success", "friction_points", "evidence", "recommendations"],
        },
    },
]
