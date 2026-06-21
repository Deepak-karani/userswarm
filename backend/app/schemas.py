"""Pydantic request/response models + the strict agent-output schema.

The strict report schema is the contract every UXTesterAgent must satisfy and is
reused by evals and the frontend types.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Severity = Literal["low", "medium", "high"]


# ---------- Builder input ----------
class RunCreate(BaseModel):
    url: str
    description: str
    audience: str = ""
    task: str = ""              # optional — empty means the swarm free-explores
    success_criteria: str = ""
    do_not_click_rules: list[str] = Field(default_factory=list)
    num_personas: int = 3                                    # how many AI testers to run (1-5)
    persona_types: list[str] = Field(default_factory=list)   # optional: which persona types to use


# ---------- Strict agent output ----------
class AgentReportSchema(BaseModel):
    """Exactly the JSON each UXTesterAgent must emit."""

    persona: str
    task_success: bool
    step_log: list[str] = Field(default_factory=list)
    friction_points: list[str] = Field(default_factory=list)
    # F2: structured friction — each {issue, quote (voice-of-customer), severity, would_abandon}.
    # F1: would_abandon (bool) is a deterministic JUDGMENT — would a real user of this persona quit
    # at this friction point. friction_points stays the derived [issue, ...] list so evals/critic work.
    friction: list[dict] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    severity: Severity = "medium"
    recommendations: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    # persona_take: one punchy first-person line summarizing this persona's overall verdict in their voice.
    persona_take: str = ""
    # F1: abandoned — would this persona effectively give up before finishing the flow (a judgment, not
    # an actual early stop; the agent still attempts the whole flow).
    abandoned: bool = False


# JSON Schema handed to Claude structured-output / used by ReportCriticAgent.
AGENT_REPORT_JSON_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "persona": {"type": "string"},
        "task_success": {"type": "boolean"},
        "step_log": {"type": "array", "items": {"type": "string"}},
        "friction_points": {"type": "array", "items": {"type": "string"}},
        "friction": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "issue": {"type": "string"},
                    "quote": {"type": "string"},
                    "severity": {"type": "string", "enum": ["low", "medium", "high"]},
                    "would_abandon": {"type": "boolean"},
                },
                "required": ["issue", "quote", "would_abandon"],
            },
        },
        "evidence": {"type": "array", "items": {"type": "string"}},
        "severity": {"type": "string", "enum": ["low", "medium", "high"]},
        "recommendations": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "persona_take": {"type": "string"},
        "abandoned": {"type": "boolean"},
    },
    "required": [
        "persona", "task_success", "step_log", "friction_points",
        "evidence", "severity", "recommendations", "confidence",
        "persona_take", "abandoned",
    ],
    "additionalProperties": False,
}


# ---------- API responses ----------
class PersonaOut(BaseModel):
    id: str
    name: str
    description: str
    traits: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)


class StepOut(BaseModel):
    index: int
    tool: str
    args: dict = Field(default_factory=dict)
    observation: str = ""
    screenshot_path: str | None = None


class ReportOut(BaseModel):
    id: str
    persona_id: str | None
    report: dict
    steps: list[StepOut] = Field(default_factory=list)


class EvalOut(BaseModel):
    eval_name: str
    score: float
    passed: bool
    explanation: str = ""


class EventOut(BaseModel):
    node: str
    status: str
    detail: str = ""


class AggregateOut(BaseModel):
    summary: str
    overall_severity: str
    top_friction_points: list = Field(default_factory=list)
    recommendations: list = Field(default_factory=list)


class RunOut(BaseModel):
    id: str
    status: str
    variant: str
    parent_run_id: str | None = None
    url: str
    description: str
    audience: str
    task: str
    success_criteria: str = ""
    personas: list[PersonaOut] = Field(default_factory=list)
    reports: list[ReportOut] = Field(default_factory=list)
    events: list[EventOut] = Field(default_factory=list)
    evals: list[EvalOut] = Field(default_factory=list)
    aggregate: AggregateOut | None = None
    error: str | None = None


# ---------- Annotation ----------
class AnnotationIn(BaseModel):
    report_id: str | None = None
    report_b_id: str | None = None
    useful_to_builder: int | None = Field(default=None, ge=1, le=5)
    specific_vs_vague: int | None = Field(default=None, ge=1, le=5)
    hallucinated: bool | None = None
    understood_task: bool | None = None
    real_user_would_agree: int | None = Field(default=None, ge=1, le=5)
    better_report: Literal["A", "B"] | None = None
    annotator: str = "anonymous"


class AnnotatePayload(BaseModel):
    run_id: str
    description: str
    task: str
    reports: list[ReportOut] = Field(default_factory=list)
    personas: list[PersonaOut] = Field(default_factory=list)
    has_improved: bool = False
