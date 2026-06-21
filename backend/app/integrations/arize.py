"""Arize AX tracing + eval logging via OpenTelemetry.

Follows the Arize AX setup guide: register a TracerProvider via ``arize-otel``,
auto-instrument the Anthropic SDK via ``openinference-instrumentation-anthropic``,
and log eval results as span attributes.

Real path lazily registers once, before any LLM client is created.
Mock path (``settings.arize_mock``) is a no-op console shim.
Neither path may raise — observability must never break the workflow.
"""
from __future__ import annotations

from contextlib import contextmanager

from ..config import settings

_tracer = None
_tracer_provider = None
_init_attempted = False


def _get_tracer():
    global _tracer, _tracer_provider, _init_attempted
    if _init_attempted:
        return _tracer
    _init_attempted = True
    if settings.arize_mock:
        return None
    try:
        from arize.otel import register

        _tracer_provider = register(
            space_id=settings.arize_space_id,
            api_key=settings.arize_api_key,
            project_name="userswarm",
        )

        # Auto-instrument all Anthropic SDK calls so every LLM request
        # appears as a traced span in Arize AX automatically.
        try:
            from openinference.instrumentation.anthropic import AnthropicInstrumentor

            AnthropicInstrumentor().instrument(tracer_provider=_tracer_provider)
        except Exception:
            pass

        _tracer = _tracer_provider.get_tracer("userswarm")
    except Exception:
        _tracer = None
    return _tracer


def get_tracer_provider():
    """Ensure tracer is initialized and return the TracerProvider (or None)."""
    _get_tracer()
    return _tracer_provider


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
    """Record an eval result as attributes on the current OTel span, or print in mock mode."""
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
    """Log a batch of eval results. Uses a dedicated span so results are visible in Arize AX."""
    if settings.arize_mock:
        for e in evals:
            print(f"[arize:mock] eval run={run_id} {e['eval_name']} score={e['score']:.2f} "
                  f"passed={e['passed']} :: {e.get('explanation', '')[:80]}")
        return

    tracer = _get_tracer()
    if tracer is None:
        return

    try:
        with tracer.start_as_current_span("eval_results") as span:
            if span and span.is_recording():
                span.set_attribute("run_id", run_id)
                span.set_attribute("eval.count", len(evals))
                for e in evals:
                    name = e["eval_name"]
                    span.set_attribute(f"eval.{name}.score", float(e["score"]))
                    span.set_attribute(f"eval.{name}.passed", bool(e["passed"]))
                    span.set_attribute(f"eval.{name}.explanation", e.get("explanation", "")[:500])
    except Exception:
        pass
