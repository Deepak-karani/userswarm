"""Run lifecycle endpoints: create, fetch, list, improve."""
from __future__ import annotations

import threading
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import SessionLocal, get_db
from ..models import Run
from ..orchestration import workflow
from ..schemas import (
    AggregateOut, EvalOut, EventOut, PersonaOut, ReportOut, RunCreate, RunOut, StepOut,
)

router = APIRouter(prefix="/runs", tags=["runs"])


def _new_id() -> str:
    return uuid.uuid4().hex


def _run_workflow_thread(run_id: str) -> None:
    db = SessionLocal()
    try:
        run = db.get(Run, run_id)
        if run is not None:
            workflow.execute_run(db, run)
    finally:
        db.close()


def _improve_thread(base_run_id: str, improved_run_id: str) -> None:
    db = SessionLocal()
    try:
        base = db.get(Run, base_run_id)
        improved = db.get(Run, improved_run_id)
        if base is not None and improved is not None:
            from ..orchestration.runner import get_runner
            get_runner().run(db, improved, prompt_override=improved.improved_prompt)
    finally:
        db.close()


@router.post("")
def create_run(body: RunCreate, db: Session = Depends(get_db)) -> dict:
    run = Run(
        id=_new_id(), url=body.url, description=body.description, audience=body.audience,
        task=body.task, success_criteria=body.success_criteria,
        do_not_click_rules=list(body.do_not_click_rules or []), status="pending", variant="base",
    )
    db.add(run)
    db.commit()
    threading.Thread(target=_run_workflow_thread, args=(run.id,), daemon=True).start()
    return {"id": run.id}


def _serialize(run: Run) -> RunOut:
    personas = [
        PersonaOut(id=p.id, name=p.name, description=p.description, traits=p.traits or [], goals=p.goals or [])
        for p in run.personas
    ]
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
    events = [EventOut(node=e.node, status=e.status, detail=e.detail or "")
              for e in sorted(run.events, key=lambda x: x.id)]
    evals = [EvalOut(eval_name=e.eval_name, score=e.score, passed=e.passed, explanation=e.explanation or "")
             for e in run.evals]
    aggregate = None
    if run.aggregate is not None:
        aggregate = AggregateOut(
            summary=run.aggregate.summary, overall_severity=run.aggregate.overall_severity,
            top_friction_points=run.aggregate.top_friction_points or [],
            recommendations=run.aggregate.recommendations or [],
        )
    return RunOut(
        id=run.id, status=run.status, variant=run.variant, parent_run_id=run.parent_run_id,
        url=run.url, description=run.description, audience=run.audience, task=run.task,
        success_criteria=run.success_criteria, personas=personas, reports=reports,
        events=events, evals=evals, aggregate=aggregate, error=run.error,
    )


@router.get("/{run_id}", response_model=RunOut)
def get_run(run_id: str, db: Session = Depends(get_db)) -> RunOut:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    return _serialize(run)


@router.get("")
def list_runs(db: Session = Depends(get_db)) -> list[dict]:
    runs = db.query(Run).order_by(Run.created_at.desc()).limit(50).all()
    return [
        {"id": r.id, "status": r.status, "variant": r.variant, "url": r.url,
         "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in runs
    ]


@router.post("/{run_id}/improve")
def improve_run(run_id: str, db: Session = Depends(get_db)) -> dict:
    from ..agents import improver
    from ..llm.client import get_llm
    from ..models import Annotation, EvalScore

    base = db.get(Run, run_id)
    if base is None:
        raise HTTPException(status_code=404, detail="run not found")

    llm = get_llm()
    annotations = [
        {"useful_to_builder": a.useful_to_builder, "specific_vs_vague": a.specific_vs_vague,
         "hallucinated": a.hallucinated, "understood_task": a.understood_task,
         "real_user_would_agree": a.real_user_would_agree, "source": a.source}
        for a in db.query(Annotation).filter(Annotation.run_id == base.id).all()
    ]
    eval_failures = [
        {"eval_name": e.eval_name, "score": e.score, "explanation": e.explanation}
        for e in db.query(EvalScore).filter(EvalScore.run_id == base.id, EvalScore.passed.is_(False)).all()
    ]
    base_inputs = {"url": base.url, "description": base.description, "audience": base.audience,
                   "task": base.task, "success_criteria": base.success_criteria}
    result = improver.improve(llm, base_inputs, annotations, eval_failures)

    improved = Run(
        id=_new_id(), url=base.url, description=base.description, audience=base.audience,
        task=base.task, success_criteria=base.success_criteria,
        do_not_click_rules=list(base.do_not_click_rules or []),
        variant="improved", parent_run_id=base.id, status="pending",
        improved_prompt=result["improved_prompt"],
    )
    db.add(improved)
    db.commit()
    threading.Thread(target=_improve_thread, args=(base.id, improved.id), daemon=True).start()
    return {"id": improved.id}
