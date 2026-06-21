"""Arize / OpenInference tracing + eval logging.

Real path lazily registers an OpenTelemetry tracer via ``arize-otel`` and emits
spans/eval logs. Mock path (``settings.arize_mock``) is a no-op console shim.
Neither path may raise — observability must never break the workflow.
"""
from __future__ import annotations

from contextlib import contextmanager

from ..config import settings

_tracer = None
_init_attempted = False


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
        _tracer = tracer_provider.get_tracer("userswarm")
    except Exception:
        _tracer = None
    return _tracer


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
        # Never let tracing break the workflow.
        yield None


def log_eval(run_id: str, eval_name: str, score: float, passed: bool, explanation: str = "") -> None:
    """Record an eval result to Arize, or print it in mock mode. Never raises."""
    if settings.arize_mock or _get_tracer() is None:
        print(f"[arize:mock] eval run={run_id} {eval_name} score={score:.2f} passed={passed} :: {explanation[:80]}")
        return
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        span.set_attribute(f"eval.{eval_name}.score", float(score))
        span.set_attribute(f"eval.{eval_name}.passed", bool(passed))
        span.set_attribute(f"eval.{eval_name}.explanation", explanation[:500])
    except Exception:
        pass
