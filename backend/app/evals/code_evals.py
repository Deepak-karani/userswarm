"""Deterministic, code-based evals over a single strict report."""
from __future__ import annotations


def has_task_success(report: dict) -> tuple[float, bool, str]:
    """Did the tester reach a definite verdict on task success?"""
    success = report.get("task_success")
    if isinstance(success, bool):
        return (1.0, True, f"task_success is a definite boolean ({success}).")
    return (0.0, False, "task_success is missing or not a boolean.")


def has_evidence(report: dict) -> tuple[float, bool, str]:
    """Every friction point should be backed by at least some evidence."""
    friction = report.get("friction_points") or []
    evidence = report.get("evidence") or []
    if not friction:
        return (1.0, True, "No friction points claimed; nothing requires evidence.")
    if not evidence:
        return (0.0, False, f"{len(friction)} friction point(s) but zero evidence items.")
    # Heuristic coverage: at least as many evidence items as friction points.
    coverage = min(1.0, len(evidence) / len(friction))
    passed = coverage >= 1.0
    return (coverage, passed,
            f"{len(evidence)} evidence item(s) for {len(friction)} friction point(s); coverage={coverage:.2f}.")
