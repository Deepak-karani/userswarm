"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getRun,
  improveRun,
  RunOut,
  Report,
} from "@/lib/api";
import StatusTimeline from "@/components/StatusTimeline";
import PersonaCard from "@/components/PersonaCard";
import StepLog from "@/components/StepLog";
import FrictionList from "@/components/FrictionList";
import SeverityBadge from "@/components/SeverityBadge";
import EvalScores from "@/components/EvalScores";
import ScreenshotGrid from "@/components/ScreenshotGrid";
import PitchFooter from "@/components/PitchFooter";

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function RunPage({ params }: { params: { runId: string } }) {
  const { runId } = params;
  const router = useRouter();
  const [run, setRun] = useState<RunOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const data = await getRun(runId);
      setRun(data);
      setError(null);
      if (data.status !== "done" && data.status !== "error") {
        timer.current = setTimeout(poll, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run");
      timer.current = setTimeout(poll, 4000);
    }
  }, [runId]);

  useEffect(() => {
    poll();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  async function onImprove() {
    setImproving(true);
    try {
      const { id } = await improveRun(runId);
      router.push(`/runs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Improvement failed");
      setImproving(false);
    }
  }

  if (!run && !error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center text-slate-400">
        Loading run…
      </div>
    );
  }

  if (!run && error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="text-rose-600">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-accent-fg">
          ← Back home
        </Link>
      </div>
    );
  }

  if (!run) return null;

  const isRunning = run.status === "pending" || run.status === "running";
  const humanAgreement = run.evals?.find(
    (e) => e.eval_name === "human_agreement"
  );
  const showCompare = Boolean(run.parent_run_id);
  const personaById = (id: string) =>
    run.personas?.find((p) => p.id === id);

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-500">
                {run.variant}
              </span>
              <span
                className={`text-xs font-medium uppercase tracking-wide ${
                  run.status === "error"
                    ? "text-rose-600"
                    : run.status === "done"
                    ? "text-emerald-600"
                    : "text-accent-fg"
                }`}
              >
                {isRunning && (
                  <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-accent align-middle" />
                )}
                {run.status}
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {run.description || run.url}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-medium">Task:</span> {run.task}
            </p>
            <a
              href={run.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-accent-fg hover:underline"
            >
              {run.url}
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/annotate/${run.id}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annotate
            </Link>
            <button
              onClick={onImprove}
              disabled={improving || isRunning}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-fg disabled:opacity-50"
            >
              {improving ? "Starting…" : "Run improvement"}
            </button>
            {showCompare && (
              <Link
                href={`/runs/${run.id}/compare`}
                className="rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-sm font-medium text-accent-fg hover:bg-accent-soft/70"
              >
                Compare
              </Link>
            )}
          </div>
        </div>

        {run.status === "error" && run.error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {run.error}
          </div>
        )}

        {/* aggregate summary */}
        {run.aggregate && (
          <Section
            title="Summary"
            right={<SeverityBadge severity={run.aggregate.overall_severity} />}
          >
            <p className="text-slate-700">{run.aggregate.summary}</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <FrictionList
                title="Top friction points"
                items={run.aggregate.top_friction_points}
              />
              <FrictionList
                title="Recommendations"
                items={run.aggregate.recommendations}
                variant="reco"
              />
            </div>
          </Section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Section title="Workflow status">
            <StatusTimeline events={run.events} />
          </Section>

          <Section title="Arize evals">
            <EvalScores evals={run.evals} />
            {humanAgreement && (
              <div className="mt-4 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-accent-fg">
                  Terac human agreement
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {humanAgreement.score <= 1
                    ? `${Math.round(humanAgreement.score * 100)}%`
                    : humanAgreement.score.toFixed(1)}
                </p>
                {humanAgreement.explanation && (
                  <p className="mt-1 text-xs text-slate-500">
                    {humanAgreement.explanation}
                  </p>
                )}
              </div>
            )}
          </Section>
        </div>

        {run.personas?.length > 0 && (
          <Section title={`Personas (${run.personas.length})`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {run.personas.map((p) => (
                <PersonaCard key={p.id} persona={p} />
              ))}
            </div>
          </Section>
        )}

        {run.reports?.length > 0 ? (
          <Section title={`Per-persona reports (${run.reports.length})`}>
            <div className="space-y-5">
              {run.reports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  personaName={
                    personaById(r.persona_id)?.name || r.report?.persona
                  }
                />
              ))}
            </div>
          </Section>
        ) : (
          isRunning && (
            <p className="text-center text-sm text-slate-400">
              AI users are exploring your product…
            </p>
          )
        )}
      </div>
      <PitchFooter />
    </>
  );
}

function ReportCard({
  report,
  personaName,
}: {
  report: Report;
  personaName?: string;
}) {
  const r = report.report;
  const success =
    r?.task_success === true || r?.task_success === "true" || r?.task_success === "success";
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-slate-900">
          {personaName || "Persona"}
        </h4>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              success
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {success ? "task succeeded" : "task failed"}
          </span>
          <SeverityBadge severity={r?.severity} />
          {typeof r?.confidence === "number" && (
            <span className="text-xs text-slate-400">
              conf {Math.round((r.confidence <= 1 ? r.confidence * 100 : r.confidence))}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <FrictionList title="Friction points" items={r?.friction_points || []} />
          <FrictionList
            title="Recommendations"
            items={r?.recommendations || []}
            variant="reco"
          />
          {r?.evidence?.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Evidence
              </p>
              <ul className="space-y-1 text-sm text-slate-600">
                {r.evidence.map((ev, i) => (
                  <li key={i} className="border-l-2 border-slate-200 pl-2 italic">
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              Browser steps
            </p>
            <StepLog steps={report.steps} />
          </div>
          <ScreenshotGrid steps={report.steps} />
        </div>
      </div>
    </div>
  );
}
