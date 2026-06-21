"""Agreement evals: report-vs-human and base-vs-improved deltas."""
from __future__ import annotations

from ..integrations import terac
from ..models import Annotation

_SEVERITY_RANK = {"low": 0, "medium": 1, "high": 2}


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


def human_likeness(db, run) -> tuple[float, bool, str]:
    """F3: do the agents FAIL WHERE REAL HUMANS FAIL?

    Human-likeness = degree to which the agents' pass/fail and severity
    judgments line up with how humans judged the SAME reports. Per annotated
    report we average two signals:
      - pass/fail agreement: human ``understood_task`` matches agent
        ``task_success`` (both think the task succeeded, or both don't).
      - severity-direction agreement: the agent flags a problem (task_success
        False, or severity >= medium) iff the human also flags a problem
        (``hallucinated`` true, or low ``real_user_would_agree`` <= 3, or low
        ``useful_to_builder`` <= 2).

    Returns (score 0-1, passed (>=0.6), explanation). Never raises. If there are
    no annotations, mock labels are ensured first so this always computes; when
    the labels are mock the explanation says so to avoid overclaiming.
    """
    try:
        anns = _annotations_for(db, run)
        if not anns:
            try:
                terac.ensure_mock_labels(db, run)
            except Exception:
                try:
                    db.rollback()
                except Exception:
                    pass
            anns = _annotations_for(db, run)
        if not anns:
            return (0.0, False, "No annotations available to compute human-likeness.")

        reports_by_id = {r.id: r.report for r in run.reports}
        scored = 0
        align_sum = 0.0
        mock_count = 0
        for ann in anns:
            report = reports_by_id.get(ann.report_id)
            if report is None:
                continue
            scored += 1
            if getattr(ann, "source", "human") == "mock":
                mock_count += 1

            signals = []

            # 1. pass/fail judgment alignment.
            if ann.understood_task is not None:
                signals.append(
                    1.0 if bool(ann.understood_task) == bool(report.get("task_success")) else 0.0
                )

            # 2. severity-direction alignment: does the agent flag a problem
            #    on the same reports where the human flags a problem?
            agent_flags_problem = (
                report.get("task_success") is False
                or _SEVERITY_RANK.get(str(report.get("severity", "medium")).lower(), 1) >= 1
            )
            human_problem_signals = []
            if ann.hallucinated is not None:
                human_problem_signals.append(bool(ann.hallucinated))
            if ann.real_user_would_agree is not None:
                human_problem_signals.append(ann.real_user_would_agree <= 3)
            if ann.useful_to_builder is not None:
                human_problem_signals.append(ann.useful_to_builder <= 2)
            if human_problem_signals:
                human_flags_problem = any(human_problem_signals)
                signals.append(1.0 if agent_flags_problem == human_flags_problem else 0.0)

            align_sum += (sum(signals) / len(signals)) if signals else 0.5

        if scored == 0:
            return (0.0, False, "Annotations present but none matched a report.")

        likeness = align_sum / scored
        suffix = f" (mock-calibrated on {scored} label(s))" if mock_count == scored and scored else ""
        return (likeness, likeness >= 0.6,
                f"Agents failed where humans failed on {likeness:.2f} of {scored} report(s){suffix}.")
    except Exception as exc:  # degrade, never raise out of eval code.
        return (0.0, False, f"human_likeness could not be computed: {exc}")


def improvement_score(db, base_run, improved_run) -> tuple[float, bool, str]:
    """Delta in human agreement (and evidence coverage) from base to improved run."""
    base_agree, _, _ = human_agreement(db, base_run)
    imp_agree, _, _ = human_agreement(db, improved_run)
    delta = imp_agree - base_agree
    # Normalize delta (-1..1) into 0..1 score.
    score = max(0.0, min(1.0, 0.5 + delta / 2.0))
    return (score, delta >= 0.0,
            f"Human agreement base={base_agree:.2f} -> improved={imp_agree:.2f} (delta={delta:+.2f}).")
