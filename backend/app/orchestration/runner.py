"""Workflow runner: the persona -> fan-out UX testers -> aggregate -> eval DAG.

``InProcessRunner`` executes the DAG directly. ``AgentspanRunner`` tries the
Agentspan SDK (lazy import) and falls back to in-process if it is unavailable.
``get_runner()`` picks based on ``settings.agentspan_mock``.
"""
from __future__ import annotations

import uuid
from concurrent.futures import ThreadPoolExecutor

from ..agents import aggregator, improver, persona_generator, report_critic, ux_tester
from ..browser.playwright_driver import BrowserSession
from ..config import settings
from ..evals import runner as eval_runner
from ..integrations import arize
from ..llm.client import get_llm
from ..models import AgentReport, AggregateReport, BrowserStep, Persona, Run
from . import events


def _new_id() -> str:
    return uuid.uuid4().hex


class InProcessRunner:
    """Executes the workflow DAG directly in this process."""

    def run(self, db, run: Run, prompt_override: str | None = None) -> Run:
        llm = get_llm()
        with arize.traced("run"):
            try:
                run.status = "running"
                db.commit()

                inputs = {
                    "url": run.url,
                    "description": run.description,
                    "audience": run.audience,
                    "task": run.task,
                    "success_criteria": run.success_criteria,
                    "do_not_click_rules": run.do_not_click_rules or [],
                }

                # --- Node: PersonaGenerator ---
                events.emit(db, run.id, "PersonaGenerator", "running")
                personas = self._generate_personas(llm, inputs, 3)
                persona_rows: list[Persona] = []
                for p in personas:
                    row = Persona(
                        id=_new_id(), run_id=run.id, name=p["name"],
                        description=p.get("description", ""),
                        traits=p.get("traits", []), goals=p.get("goals", []),
                    )
                    db.add(row)
                    persona_rows.append(row)
                db.commit()
                events.emit(db, run.id, "PersonaGenerator", "done",
                            f"{len(persona_rows)} personas ({getattr(self, '_persona_engine', 'in-process')})")

                # --- Node: UXTester fan-out (each gets its OWN BrowserSession) ---
                def _test(args):
                    idx, persona_row = args
                    persona = {
                        "name": persona_row.name, "description": persona_row.description,
                        "traits": persona_row.traits, "goals": persona_row.goals,
                    }
                    raw, steps = self._ux_test(llm, persona, inputs, run.id, prompt_override)
                    report = report_critic.validate_and_repair(llm, raw, persona_row.name)
                    return idx, persona_row, report, steps

                results = []
                with ThreadPoolExecutor(max_workers=min(4, len(persona_rows)) or 1) as pool:
                    for idx, persona_row in enumerate(persona_rows):
                        events.emit(db, run.id, f"UXTester:{idx}", "running", persona_row.name)
                    for res in pool.map(_test, list(enumerate(persona_rows))):
                        results.append(res)

                results.sort(key=lambda r: r[0])
                report_dicts: list[dict] = []
                for idx, persona_row, report, steps in results:
                    report_row = AgentReport(
                        id=_new_id(), run_id=run.id, persona_id=persona_row.id, report=report,
                    )
                    db.add(report_row)
                    db.flush()
                    for s in steps:
                        db.add(BrowserStep(
                            report_id=report_row.id, index=s["index"], tool=s["tool"],
                            args=s.get("args", {}), observation=s.get("observation", ""),
                            screenshot_path=s.get("screenshot_path"),
                        ))
                    report_dicts.append(report)
                    events.emit(db, run.id, f"UXTester:{idx}", "done", persona_row.name)
                db.commit()

                # --- Node: Aggregator ---
                events.emit(db, run.id, "Aggregator", "running")
                agg = self._aggregate(llm, report_dicts)
                db.add(AggregateReport(
                    id=_new_id(), run_id=run.id, summary=agg["summary"],
                    overall_severity=agg["overall_severity"],
                    top_friction_points=agg["top_friction_points"],
                    recommendations=agg["recommendations"],
                ))
                db.commit()
                events.emit(db, run.id, "Aggregator", "done", getattr(self, "_agg_engine", "in-process"))

                # --- Node: Evals ---
                events.emit(db, run.id, "Evals", "running")
                db.refresh(run)
                eval_runner.run_all_evals(db, run, llm)
                events.emit(db, run.id, "Evals", "done")

                run.status = "done"
                db.commit()
            except Exception as exc:  # noqa - any node failure -> error state
                db.rollback()
                run.status = "error"
                run.error = str(exc)[:2000]
                db.commit()
                try:
                    events.emit(db, run.id, "Workflow", "error", str(exc)[:500])
                except Exception:
                    pass
        return run

    _engine = "in-process"

    def _generate_personas(self, llm, inputs: dict, n: int):
        """Default persona generation (direct LLM). ``AgentspanRunner`` runs this on Agentspan."""
        self._persona_engine = "in-process"
        return persona_generator.generate(llm, inputs, n=n)

    def _aggregate(self, llm, report_dicts: list[dict]) -> dict:
        """Default aggregation (direct LLM). ``AgentspanRunner`` runs this on Agentspan."""
        self._agg_engine = "in-process"
        return aggregator.aggregate(llm, report_dicts)

    def _ux_test(self, llm, persona: dict, inputs: dict, run_id: str, prompt_override: str | None):
        """Run one UX tester: in-process scripted explorer with its own live BrowserSession.

        The browser tester stays in-process in BOTH runners: Agentspan executes tools in
        separate worker processes that cannot share a live Playwright session.
        """
        browser = BrowserSession(run_id, do_not_click_rules=inputs.get("do_not_click_rules") or [])
        try:
            return ux_tester.run_test(llm, persona, inputs, browser, run_id, prompt_override)
        finally:
            browser.close()

    def improve_and_rerun(self, db, base_run: Run) -> Run:
        from ..models import Annotation, EvalScore

        llm = get_llm()
        annotations = [
            {
                "report_id": a.report_id, "useful_to_builder": a.useful_to_builder,
                "specific_vs_vague": a.specific_vs_vague, "hallucinated": a.hallucinated,
                "understood_task": a.understood_task, "real_user_would_agree": a.real_user_would_agree,
                "better_report": a.better_report, "source": a.source,
            }
            for a in db.query(Annotation).filter(Annotation.run_id == base_run.id).all()
        ]
        eval_failures = [
            {"eval_name": e.eval_name, "score": e.score, "explanation": e.explanation}
            for e in db.query(EvalScore).filter(
                EvalScore.run_id == base_run.id, EvalScore.passed.is_(False)
            ).all()
        ]

        base_inputs = {
            "url": base_run.url, "description": base_run.description,
            "audience": base_run.audience, "task": base_run.task,
            "success_criteria": base_run.success_criteria,
        }
        result = improver.improve(llm, base_inputs, annotations, eval_failures)
        improved_prompt = result["improved_prompt"]

        improved = Run(
            id=_new_id(), url=base_run.url, description=base_run.description,
            audience=base_run.audience, task=base_run.task,
            success_criteria=base_run.success_criteria,
            do_not_click_rules=base_run.do_not_click_rules or [],
            variant="improved", parent_run_id=base_run.id, status="pending",
            improved_prompt=improved_prompt,
        )
        db.add(improved)
        db.commit()
        return self.run(db, improved, prompt_override=improved_prompt)


class AgentspanRunner(InProcessRunner):
    """Runs the pure-LLM reasoning agents (PersonaGenerator, Aggregator) on the Agentspan
    durable runtime; the browser-driving UXTester stays in-process.

    Agentspan executes every tool in a separate Conductor worker process, which cannot
    share a live in-process Playwright session — so only the tool-less reasoning agents
    run on Agentspan. Each Agentspan call has a join-timeout and falls back to the direct
    LLM path, so a run can never hang or fail for infrastructure reasons.
    """

    _engine = "Agentspan"

    def _generate_personas(self, llm, inputs: dict, n: int):
        from .agentspan_agents import generate_personas_agentspan

        try:
            data = generate_personas_agentspan(inputs, n)
        except Exception:
            data = None
        if data:
            self._persona_engine = "Agentspan"
            return data
        self._persona_engine = "in-process (Agentspan fallback)"
        return super()._generate_personas(llm, inputs, n)

    def _aggregate(self, llm, report_dicts: list[dict]) -> dict:
        from .agentspan_agents import aggregate_agentspan

        try:
            data = aggregate_agentspan(report_dicts)
        except Exception:
            data = None
        if data:
            self._agg_engine = "Agentspan"
            return data
        self._agg_engine = "in-process (Agentspan fallback)"
        return super()._aggregate(llm, report_dicts)


def get_runner() -> InProcessRunner:
    return InProcessRunner() if settings.agentspan_mock else AgentspanRunner()


# Public re-exports used by the thin workflow facade / routers.
class WorkflowRunner(InProcessRunner):
    """Stable public class name combining run + improve_and_rerun."""
