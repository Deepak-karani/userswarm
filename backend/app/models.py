"""ORM models. JSON columns store flexible agent payloads; created_at is ISO-8601 UTC."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Run(Base):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    # Builder inputs
    url: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    audience: Mapped[str] = mapped_column(Text)
    task: Mapped[str] = mapped_column(Text)
    success_criteria: Mapped[str] = mapped_column(Text, default="")
    do_not_click_rules: Mapped[list] = mapped_column(JSON, default=list)
    num_personas: Mapped[int] = mapped_column(Integer, default=3)       # how many testers (1-5)
    persona_types: Mapped[list] = mapped_column(JSON, default=list)     # optional requested types
    # Lifecycle
    variant: Mapped[str] = mapped_column(String, default="base")  # base | improved
    parent_run_id: Mapped[str | None] = mapped_column(String, ForeignKey("runs.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|running|done|error
    improved_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    personas: Mapped[list["Persona"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    reports: Mapped[list["AgentReport"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    events: Mapped[list["WorkflowEvent"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    evals: Mapped[list["EvalScore"]] = relationship(back_populates="run", cascade="all, delete-orphan")
    aggregate: Mapped["AggregateReport | None"] = relationship(
        back_populates="run", cascade="all, delete-orphan", uselist=False
    )


class Persona(Base):
    __tablename__ = "personas"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    traits: Mapped[list] = mapped_column(JSON, default=list)
    goals: Mapped[list] = mapped_column(JSON, default=list)

    run: Mapped[Run] = relationship(back_populates="personas")


class AgentReport(Base):
    __tablename__ = "agent_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    persona_id: Mapped[str | None] = mapped_column(ForeignKey("personas.id"), nullable=True)
    # The strict JSON report (validated by ReportCriticAgent).
    report: Mapped[dict] = mapped_column(JSON, default=dict)
    raw_model_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    run: Mapped[Run] = relationship(back_populates="reports")
    steps: Mapped[list["BrowserStep"]] = relationship(back_populates="report", cascade="all, delete-orphan")


class BrowserStep(Base):
    __tablename__ = "browser_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_id: Mapped[str] = mapped_column(ForeignKey("agent_reports.id"))
    index: Mapped[int] = mapped_column(Integer)
    tool: Mapped[str] = mapped_column(String)
    args: Mapped[dict] = mapped_column(JSON, default=dict)
    observation: Mapped[str] = mapped_column(Text, default="")
    screenshot_path: Mapped[str | None] = mapped_column(String, nullable=True)

    report: Mapped[AgentReport] = relationship(back_populates="steps")


class AggregateReport(Base):
    __tablename__ = "aggregate_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"), unique=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    overall_severity: Mapped[str] = mapped_column(String, default="medium")
    top_friction_points: Mapped[list] = mapped_column(JSON, default=list)
    recommendations: Mapped[list] = mapped_column(JSON, default=list)

    run: Mapped[Run] = relationship(back_populates="aggregate")


class EvalScore(Base):
    __tablename__ = "eval_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    report_id: Mapped[str | None] = mapped_column(ForeignKey("agent_reports.id"), nullable=True)
    eval_name: Mapped[str] = mapped_column(String)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    explanation: Mapped[str] = mapped_column(Text, default="")

    run: Mapped[Run] = relationship(back_populates="evals")


class Annotation(Base):
    __tablename__ = "annotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    report_id: Mapped[str | None] = mapped_column(ForeignKey("agent_reports.id"), nullable=True)
    report_b_id: Mapped[str | None] = mapped_column(ForeignKey("agent_reports.id"), nullable=True)
    # The six annotation answers.
    useful_to_builder: Mapped[int | None] = mapped_column(Integer, nullable=True)        # 1-5
    specific_vs_vague: Mapped[int | None] = mapped_column(Integer, nullable=True)         # 1-5
    hallucinated: Mapped[bool | None] = mapped_column(Boolean, nullable=True)             # yes/no
    understood_task: Mapped[bool | None] = mapped_column(Boolean, nullable=True)          # yes/no
    real_user_would_agree: Mapped[int | None] = mapped_column(Integer, nullable=True)     # 1-5
    better_report: Mapped[str | None] = mapped_column(String, nullable=True)              # "A" | "B"
    annotator: Mapped[str] = mapped_column(String, default="anonymous")
    source: Mapped[str] = mapped_column(String, default="human")  # human | mock
    created_at: Mapped[datetime] = mapped_column(default=_now)


class WorkflowEvent(Base):
    __tablename__ = "workflow_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id"))
    node: Mapped[str] = mapped_column(String)       # e.g. PersonaGenerator, UXTester:1, Aggregator
    status: Mapped[str] = mapped_column(String)     # pending|running|done|error
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(default=_now)

    run: Mapped[Run] = relationship(back_populates="events")
