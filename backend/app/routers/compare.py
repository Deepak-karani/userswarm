"""Base-vs-improved comparison endpoint."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Annotation, EvalScore, Run

router = APIRouter(tags=["compare"])


def _avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 4) if values else 0.0


def _metrics(db: Session, run: Run) -> dict:
    evals = db.query(EvalScore).filter(EvalScore.run_id == run.id).all()
    by_name: dict[str, list[EvalScore]] = {}
    for e in evals:
        by_name.setdefault(e.eval_name, []).append(e)

    def mean_score(name: str) -> float:
        return _avg([e.score for e in by_name.get(name, [])])

    def pass_rate(name: str) -> float:
        items = by_name.get(name, [])
        return _avg([1.0 if e.passed else 0.0 for e in items])

    # usefulness from annotations (1-5 -> 0-1 not normalized; keep raw mean 1-5).
    anns = db.query(Annotation).filter(Annotation.run_id == run.id).all()
    useful = _avg([a.useful_to_builder for a in anns if a.useful_to_builder is not None])

    # task success rate from reports.
    task_success = _avg([1.0 if (r.report or {}).get("task_success") else 0.0 for r in run.reports])

    return {
        "usefulness_rating": useful,
        "evidence_coverage": mean_score("has_evidence"),
        "hallucination_risk": mean_score("hallucination_risk"),
        "human_agreement": mean_score("human_agreement"),
        "human_likeness": mean_score("human_likeness"),
        "actionability_pass_rate": pass_rate("actionability"),
        "task_success_rate": task_success,
    }


@router.get("/runs/{run_id}/compare")
def compare(run_id: str, db: Session = Depends(get_db)) -> dict:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")

    # Resolve the base/improved pair regardless of which id was passed.
    if run.parent_run_id:
        base = db.get(Run, run.parent_run_id)
        improved = run
    else:
        base = run
        improved = db.query(Run).filter(Run.parent_run_id == run.id).order_by(
            Run.created_at.desc()).first()

    if base is None or improved is None:
        raise HTTPException(status_code=404, detail="improved run not found for comparison")

    base_metrics = _metrics(db, base)
    improved_metrics = _metrics(db, improved)
    deltas = {k: round(improved_metrics[k] - base_metrics[k], 4) for k in base_metrics}

    return {
        "base": {"id": base.id, **base_metrics},
        "improved": {"id": improved.id, **improved_metrics},
        "deltas": deltas,
    }
