"""Agreement evals: report-vs-human and base-vs-improved deltas."""
from __future__ import annotations

from ..models import Annotation


def _annotations_for(db, run) -> list[Annotation]:
    return db.query(Annotation).filter(Annotation.run_id == run.id).all()


def human_agreement(db, run) -> tuple[float, bool, str]:
    """Compare each report's task_success/specificity against Terac/human labels.

    Agreement = mean over annotated reports of:
      - understood_task label matches report.task_success, AND
      - not flagged as hallucinated.
    """
    anns = _annotations_for(db, run)
    if not anns:
        return (0.0, False, "No annotations available to compute agreement.")

    reports_by_id = {r.id: r.report for r in run.reports}
    scored = 0
    agree_sum = 0.0
    for ann in anns:
        report = reports_by_id.get(ann.report_id)
        if report is None:
            continue
        scored += 1
        signals = []
        if ann.understood_task is not None:
            signals.append(1.0 if bool(ann.understood_task) == bool(report.get("task_success")) else 0.0)
        if ann.hallucinated is not None:
            signals.append(0.0 if ann.hallucinated else 1.0)
        if ann.useful_to_builder is not None:
            signals.append(min(1.0, ann.useful_to_builder / 5.0))
        agree_sum += (sum(signals) / len(signals)) if signals else 0.5

    if scored == 0:
        return (0.0, False, "Annotations present but none matched a report.")
    agreement = agree_sum / scored
    return (agreement, agreement >= 0.6,
            f"Mean human agreement over {scored} report(s): {agreement:.2f}.")


def improvement_score(db, base_run, improved_run) -> tuple[float, bool, str]:
    """Delta in human agreement (and evidence coverage) from base to improved run."""
    base_agree, _, _ = human_agreement(db, base_run)
    imp_agree, _, _ = human_agreement(db, improved_run)
    delta = imp_agree - base_agree
    # Normalize delta (-1..1) into 0..1 score.
    score = max(0.0, min(1.0, 0.5 + delta / 2.0))
    return (score, delta >= 0.0,
            f"Human agreement base={base_agree:.2f} -> improved={imp_agree:.2f} (delta={delta:+.2f}).")
