"""Eval orchestrator: compute code + LLM + agreement evals, persist, and log to Arize."""
from __future__ import annotations

from ..integrations import arize, terac
from ..models import EvalScore
from . import agreement, code_evals, llm_evals


def _persist(db, run_id: str, report_id, name: str, result: tuple[float, bool, str]) -> None:
    score, passed, explanation = result
    db.add(EvalScore(
        run_id=run_id, report_id=report_id, eval_name=name,
        score=float(score), passed=bool(passed), explanation=str(explanation),
    ))
    arize.log_eval(run_id, name, float(score), bool(passed), str(explanation))


def run_all_evals(db, run, llm) -> None:
    """Compute per-report and aggregate evals, persist EvalScore rows, log to Arize."""
    # Per-report code + LLM evals.
    for report in run.reports:
        rdict = report.report or {}
        _persist(db, run.id, report.id, "has_task_success", code_evals.has_task_success(rdict))
        _persist(db, run.id, report.id, "has_evidence", code_evals.has_evidence(rdict))
        _persist(db, run.id, report.id, "actionability", llm_evals.actionability(llm, rdict))
        _persist(db, run.id, report.id, "hallucination_risk", llm_evals.hallucination_risk(llm, rdict))

    # Human-agreement eval (ensure synthetic labels exist first).
    try:
        terac.ensure_mock_labels(db, run)
    except Exception:
        db.rollback()
    _persist(db, run.id, None, "human_agreement", agreement.human_agreement(db, run))

    db.commit()
