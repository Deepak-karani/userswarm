"""Arize / OpenInference tracing + eval logging.

Real path lazily registers an OpenTelemetry tracer via ``arize-otel``, instruments
the Anthropic SDK via ``openinference-instrumentation-anthropic``, and logs eval
results as first-class Arize eval objects.  Mock path (``settings.arize_mock``) is
a no-op console shim.  Neither path may raise — observability must never break the
workflow.
"""
from __future__ import annotations

from contextlib import contextmanager

from ..config import settings

_tracer = None
_init_attempted = False
_eval_client = None


def _get_tracer():
    global _tracer, _init_attempted
    if _init_attempted:
        return _tracer
    _init_attempted = True
    if settings.arize_mock:
        return None
    try:
        from arize.otel import register

        tracer_provider = register(
            space_id=settings.arize_space_id,
            api_key=settings.arize_api_key,
            project_name="userswarm",
        )

        try:
            from openinference.instrumentation.anthropic import AnthropicInstrumentor

            AnthropicInstrumentor().instrument(tracer_provider=tracer_provider)
        except Exception:
            pass

        _tracer = tracer_provider.get_tracer("userswarm")
    except Exception:
        _tracer = None
    return _tracer


def _get_eval_client():
    """Lazily build an Arize client for uploading evaluation datasets."""
    global _eval_client
    if _eval_client is not None:
        return _eval_client
    if settings.arize_mock:
        return None
    try:
        from arize.api import Client

        _eval_client = Client(
            space_id=settings.arize_space_id,
            api_key=settings.arize_api_key,
        )
        return _eval_client
    except Exception:
        return None


@contextmanager
def traced(name: str):
    """Context manager that opens an Arize/OTel span, or no-ops in mock mode."""
    tracer = _get_tracer()
    if tracer is None:
        if settings.arize_mock:
            print(f"[arize:mock] span start: {name}")
        try:
            yield None
        finally:
            if settings.arize_mock:
                print(f"[arize:mock] span end:   {name}")
        return
    try:
        with tracer.start_as_current_span(name) as span:
            yield span
    except Exception:
        yield None


def log_eval(run_id: str, eval_name: str, score: float, passed: bool, explanation: str = "") -> None:
    """Record an eval result to the current OTel span, or print in mock mode. Never raises."""
    if settings.arize_mock:
        print(f"[arize:mock] eval run={run_id} {eval_name} score={score:.2f} passed={passed} :: {explanation[:80]}")
        return
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        if span and span.is_recording():
            span.set_attribute(f"eval.{eval_name}.score", float(score))
            span.set_attribute(f"eval.{eval_name}.passed", bool(passed))
            span.set_attribute(f"eval.{eval_name}.explanation", explanation[:500])
    except Exception:
        pass


def log_eval_batch(run_id: str, evals: list[dict]) -> None:
    """Upload a batch of eval results to Arize as a proper evaluation dataset.

    Each dict in ``evals`` should have: eval_name, score, passed, explanation,
    and optionally report_id.  Falls back to per-span logging if the batch upload
    is unavailable.
    """
    if settings.arize_mock:
        for e in evals:
            print(f"[arize:mock] eval run={run_id} {e['eval_name']} score={e['score']:.2f} "
                  f"passed={e['passed']} :: {e.get('explanation', '')[:80]}")
        return

    try:
        import pandas as pd
        from arize.utils.types import Environments

        client = _get_eval_client()
        if client is None:
            for e in evals:
                log_eval(run_id, e["eval_name"], e["score"], e["passed"], e.get("explanation", ""))
            return

        eval_names = set(e["eval_name"] for e in evals)
        for eval_name in eval_names:
            subset = [e for e in evals if e["eval_name"] == eval_name]
            df = pd.DataFrame({
                "run_id": [run_id] * len(subset),
                "eval_name": [e["eval_name"] for e in subset],
                "score": [float(e["score"]) for e in subset],
                "label": ["pass" if e["passed"] else "fail" for e in subset],
                "explanation": [e.get("explanation", "")[:500] for e in subset],
            })

            try:
                client.log_evaluations(
                    dataframe=df,
                    model_id="userswarm",
                    model_version=run_id,
                    eval_name=eval_name,
                    environment=Environments.PRODUCTION,
                )
            except Exception:
                for e in subset:
                    log_eval(run_id, e["eval_name"], e["score"], e["passed"], e.get("explanation", ""))
    except Exception:
        for e in evals:
            log_eval(run_id, e["eval_name"], e["score"], e["passed"], e.get("explanation", ""))


def run_phoenix_evals(report: dict, eval_model: str = "claude-sonnet-4-6") -> dict[str, tuple[float, bool, str]]:
    """Run Arize Phoenix LLM evals on a UX report using phoenix.evals.

    Returns a dict mapping eval_name -> (score, passed, explanation).
    Falls back to empty dict if Phoenix evals are unavailable.
    """
    if settings.arize_mock:
        return {}

    try:
        from phoenix.evals import (
            HallucinationEvaluator,
            QAEvaluator,
            RelevanceEvaluator,
            llm_classify,
        )
        from phoenix.evals.models import AnthropicModel
        import pandas as pd

        model = AnthropicModel(model=eval_model, api_key=settings.anthropic_api_key)
        results: dict[str, tuple[float, bool, str]] = {}

        friction_text = "\n".join(
            f"- {fp}" for fp in (report.get("friction_points") or [])
        )
        evidence_text = "\n".join(
            f"- {ev}" for ev in (report.get("evidence") or [])
        )
        recs_text = "\n".join(
            f"- {r}" for r in (report.get("recommendations") or [])
        )

        df = pd.DataFrame([{
            "input": f"UX test of a product. Task success: {report.get('task_success')}",
            "reference": evidence_text or "No evidence provided.",
            "output": f"Friction points:\n{friction_text}\n\nRecommendations:\n{recs_text}",
        }])

        try:
            hallucination_eval = HallucinationEvaluator(model)
            hall_results = hallucination_eval.evaluate(df)
            if not hall_results.empty:
                label = hall_results.iloc[0].get("label", "")
                explanation = hall_results.iloc[0].get("explanation", "")
                score = 1.0 if label == "factual" else 0.0
                results["phoenix_hallucination"] = (score, score >= 0.5, str(explanation)[:500])
        except Exception:
            pass

        try:
            qa_eval = QAEvaluator(model)
            qa_results = qa_eval.evaluate(df)
            if not qa_results.empty:
                label = qa_results.iloc[0].get("label", "")
                explanation = qa_results.iloc[0].get("explanation", "")
                score = 1.0 if label == "correct" else 0.0
                results["phoenix_qa_correctness"] = (score, score >= 0.5, str(explanation)[:500])
        except Exception:
            pass

        try:
            relevance_eval = RelevanceEvaluator(model)
            rel_results = relevance_eval.evaluate(df)
            if not rel_results.empty:
                label = rel_results.iloc[0].get("label", "")
                explanation = rel_results.iloc[0].get("explanation", "")
                score = 1.0 if label == "relevant" else 0.0
                results["phoenix_relevance"] = (score, score >= 0.5, str(explanation)[:500])
        except Exception:
            pass

        return results
    except Exception:
        return {}
