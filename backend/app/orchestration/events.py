"""Workflow event emission for the live DAG view."""
from __future__ import annotations

from ..models import WorkflowEvent


def emit(db, run_id: str, node: str, status: str, detail: str = "") -> None:
    """Insert a WorkflowEvent row and commit so the frontend can poll progress."""
    db.add(WorkflowEvent(run_id=run_id, node=node, status=status, detail=str(detail)[:1000]))
    db.commit()
