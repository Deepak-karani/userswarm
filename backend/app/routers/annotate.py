"""Annotation endpoints: fetch a labeling payload, submit a human annotation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..evals import agreement
from ..models import Annotation, EvalScore, Run
from ..schemas import AnnotatePayload, AnnotationIn, PersonaOut, ReportOut, StepOut

router = APIRouter(prefix="/annotate", tags=["annotate"])


@router.get("/{run_id}", response_model=AnnotatePayload)
def get_annotate_payload(run_id: str, db: Session = Depends(get_db)) -> AnnotatePayload:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")

    reports = [
        ReportOut(
            id=r.id, persona_id=r.persona_id, report=r.report or {},
            steps=[
                StepOut(index=s.index, tool=s.tool, args=s.args or {},
                        observation=s.observation or "", screenshot_path=s.screenshot_path)
                for s in sorted(r.steps, key=lambda x: x.index)
            ],
        )
        for r in run.reports
    ]
    personas = [
        PersonaOut(id=p.id, name=p.name, description=p.description, traits=p.traits or [], goals=p.goals or [])
        for p in run.personas
    ]
    has_improved = db.query(Run).filter(Run.parent_run_id == run.id).count() > 0

    return AnnotatePayload(
        run_id=run.id, description=run.description, task=run.task,
        reports=reports, personas=personas, has_improved=has_improved,
    )


@router.post("/{run_id}")
def submit_annotation(run_id: str, body: AnnotationIn, db: Session = Depends(get_db)) -> dict:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")

    db.add(Annotation(
        run_id=run.id, report_id=body.report_id, report_b_id=body.report_b_id,
        useful_to_builder=body.useful_to_builder, specific_vs_vague=body.specific_vs_vague,
        hallucinated=body.hallucinated, understood_task=body.understood_task,
        real_user_would_agree=body.real_user_would_agree, better_report=body.better_report,
        annotator=body.annotator, source="human",
    ))
    db.commit()

    # Recompute human_agreement for this run.
    db.refresh(run)
    score, passed, explanation = agreement.human_agreement(db, run)
    existing = db.query(EvalScore).filter(
        EvalScore.run_id == run.id, EvalScore.eval_name == "human_agreement",
        EvalScore.report_id.is_(None),
    ).first()
    if existing is None:
        db.add(EvalScore(run_id=run.id, eval_name="human_agreement",
                         score=score, passed=passed, explanation=explanation))
    else:
        existing.score, existing.passed, existing.explanation = score, passed, explanation
    db.commit()
    return {"ok": True, "human_agreement": score}
