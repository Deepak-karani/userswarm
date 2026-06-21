"""Thin facade the routers import. Delegates to the selected runner."""
from __future__ import annotations

from ..models import Run
from .runner import get_runner


def execute_run(db, run: Run, prompt_override: str | None = None) -> Run:
    return get_runner().run(db, run, prompt_override=prompt_override)


def improve_and_rerun(db, base_run: Run) -> Run:
    return get_runner().improve_and_rerun(db, base_run)
