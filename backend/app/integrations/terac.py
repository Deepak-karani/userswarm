"""Terac human-annotation integration.

Real path posts reports to Terac for labeling (placeholder endpoints behind
``# TODO``). Mock path (``settings.terac_mock``) returns synthetic-but-realistic
labels for the six annotation questions so agreement evals can compute offline.
"""
from __future__ import annotations

import hashlib

from ..config import settings


def _stable_int(seed: str, lo: int, hi: int) -> int:
    h = int(hashlib.sha256(seed.encode()).hexdigest(), 16)
    return lo + (h % (hi - lo + 1))


def _synthetic_label(run_id: str, report: dict) -> dict:
    rid = str(report.get("id") or report.get("persona") or "")
    seed = f"{run_id}:{rid}"
    rpt = report.get("report", report) if isinstance(report, dict) else {}
    task_success = bool(rpt.get("task_success", True))
    has_evidence = len(rpt.get("evidence") or []) > 0
    return {
        "report_id": report.get("id"),
        "useful_to_builder": _stable_int(seed + "u", 3, 5),
        "specific_vs_vague": _stable_int(seed + "s", 3, 5) if has_evidence else _stable_int(seed + "s", 1, 3),
        "hallucinated": not has_evidence and _stable_int(seed + "h", 0, 1) == 1,
        "understood_task": task_success or _stable_int(seed + "t", 0, 1) == 1,
        "real_user_would_agree": _stable_int(seed + "r", 3, 5),
        "better_report": "A",
    }


def create_annotation_job(run_id: str, reports: list[dict]) -> dict:
    """Create a Terac annotation job for a run's reports."""
    if settings.terac_mock:
        return {"job_id": f"mock-job-{run_id}", "status": "completed", "count": len(reports), "source": "mock"}
    try:
        import httpx

        # TODO: replace with the real Terac job-creation endpoint.
        resp = httpx.post(
            f"{settings.terac_base_url}/v1/annotation-jobs",
            headers={"Authorization": f"Bearer {settings.terac_api_key}"},
            json={"run_id": run_id, "reports": reports},
            timeout=30.0,
        )
        return resp.json()
    except Exception as exc:
        return {"job_id": None, "status": "error", "error": str(exc)}


def fetch_labels(job_id: str) -> list[dict]:
    """Fetch human labels for a previously-created job."""
    if settings.terac_mock or not job_id:
        return []
    try:
        import httpx

        # TODO: replace with the real Terac labels endpoint.
        resp = httpx.get(
            f"{settings.terac_base_url}/v1/annotation-jobs/{job_id}/labels",
            headers={"Authorization": f"Bearer {settings.terac_api_key}"},
            timeout=30.0,
        )
        data = resp.json()
        return data if isinstance(data, list) else data.get("labels", [])
    except Exception:
        return []


def ensure_mock_labels(db, run) -> None:
    """If a run has no Annotation rows, insert synthetic ones (source='mock')."""
    from ..models import Annotation

    existing = db.query(Annotation).filter(Annotation.run_id == run.id).count()
    if existing:
        return

    for report in run.reports:
        rdict = {"id": report.id, "persona": report.report.get("persona", ""),
                 "report": report.report}
        label = _synthetic_label(run.id, rdict)
        db.add(Annotation(
            run_id=run.id,
            report_id=report.id,
            useful_to_builder=label["useful_to_builder"],
            specific_vs_vague=label["specific_vs_vague"],
            hallucinated=label["hallucinated"],
            understood_task=label["understood_task"],
            real_user_would_agree=label["real_user_would_agree"],
            better_report=label["better_report"],
            annotator="terac-mock",
            source="mock",
        ))
    db.commit()
