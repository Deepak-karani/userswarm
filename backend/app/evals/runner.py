"""Eval orchestrator: compute code + LLM + Phoenix + agreement evals, persist, and log to Arize."""
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


def run_all_evals(db, run, llm) -> None:
    """Compute per-report and aggregate evals, persist EvalScore rows, log to Arize."""
    eval_batch: list[dict] = []

    with arize.traced("evals"):
        for report in run.reports:
            rdict = report.report or {}

            for eval_name, fn in [
                ("has_task_success", lambda r: code_evals.has_task_success(r)),
                ("has_evidence", lambda r: code_evals.has_evidence(r)),
                ("actionability", lambda r: llm_evals.actionability(llm, r)),
                ("hallucination_risk", lambda r: llm_evals.hallucination_risk(llm, r)),
            ]:
                result = fn(rdict)
                _persist(db, run.id, report.id, eval_name, result)
                eval_batch.append({
                    "eval_name": eval_name,
                    "score": result[0],
                    "passed": result[1],
                    "explanation": result[2],
                    "report_id": report.id,
                })

            phoenix_results = arize.run_phoenix_evals(rdict)
            for eval_name, result in phoenix_results.items():
                _persist(db, run.id, report.id, eval_name, result)
                eval_batch.append({
                    "eval_name": eval_name,
                    "score": result[0],
                    "passed": result[1],
                    "explanation": result[2],
                    "report_id": report.id,
                })

        # Human-agreement eval (ensure synthetic labels exist first).
        try:
            terac.ensure_mock_labels(db, run)
        except Exception:
            db.rollback()

        ha_result = agreement.human_agreement(db, run)
        _persist(db, run.id, None, "human_agreement", ha_result)
        eval_batch.append({
            "eval_name": "human_agreement",
            "score": ha_result[0],
            "passed": ha_result[1],
            "explanation": ha_result[2],
        })

        # F3: human-likeness — do the agents fail where real humans fail?
        hl_result = agreement.human_likeness(db, run)
        _persist(db, run.id, None, "human_likeness", hl_result)
        eval_batch.append({
            "eval_name": "human_likeness",
            "score": hl_result[0],
            "passed": hl_result[1],
            "explanation": hl_result[2],
        })

        db.commit()

    arize.log_eval_batch(run.id, eval_batch)
