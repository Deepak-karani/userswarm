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
import SessionReplay from "@/components/SessionReplay";
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
    <section className="rounded-2xl border border-ink-line bg-ink-800/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
          {title}
        </h2>
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
      <div className="mx-auto max-w-4xl px-6 py-20 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-fog-faint">
        Loading run…
      </div>
    );
  }

  if (!run && error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="text-heat-high">{error}</p>
        <Link href="/" className="mt-4 inline-block text-sm text-cool hover:underline">
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
              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-muted ring-1 ring-inset ring-ink-line">
                {run.variant}
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                  run.status === "error"
                    ? "text-heat-high"
                    : run.status === "done"
                    ? "text-cool"
                    : "text-cool"
                }`}
              >
                {isRunning && (
                  <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-cool align-middle" />
                )}
                {run.status}
              </span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fog">
              {run.description || run.url}
            </h1>
            <p className="mt-1.5 text-sm text-fog-muted">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fog-faint">
                Task
              </span>{" "}
              {run.task ? (
                run.task
              ) : (
                <span className="text-fog-faint">free explore</span>
              )}
            </p>
            <a
              href={run.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block font-mono text-xs text-cool hover:underline"
            >
              {run.url}
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/annotate/${run.id}`}
              className="rounded-md border border-ink-line bg-ink-800 px-3 py-2 text-sm font-medium text-fog transition hover:border-cool/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
            >
              Annotate
            </Link>
            <button
              onClick={onImprove}
              disabled={improving || isRunning}
              className="rounded-md bg-heat-ember px-3 py-2 text-sm font-semibold text-ink-900 shadow-[0_8px_28px_-8px_rgba(240,104,60,0.7)] transition hover:bg-heat-ember/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-ember/50 disabled:opacity-50"
            >
              {improving ? "Starting…" : "Run improvement"}
            </button>
            {showCompare && (
              <Link
                href={`/runs/${run.id}/compare`}
                className="rounded-md border border-cool/40 bg-cool/10 px-3 py-2 text-sm font-medium text-cool transition hover:bg-cool/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
              >
                Compare
              </Link>
            )}
          </div>
        </div>

        {run.status === "error" && run.error && (
          <div className="rounded-xl border border-heat-high/30 bg-heat-high/10 px-4 py-3 text-sm text-heat-high">
            {run.error}
          </div>
        )}

        {/* aggregate summary */}
        {run.aggregate && (
          <Section
            title="Summary"
            right={<SeverityBadge severity={run.aggregate.overall_severity} />}
          >
            <p className="text-fog">{run.aggregate.summary}</p>
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
              <div className="mt-4 rounded-xl border border-cool/30 bg-cool/10 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cool">
                  Terac human agreement
                </p>
                <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-fog">
                  {humanAgreement.score <= 1
                    ? `${Math.round(humanAgreement.score * 100)}%`
                    : humanAgreement.score.toFixed(1)}
                </p>
                {humanAgreement.explanation && (
                  <p className="mt-1 text-xs text-fog-muted">
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
            <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-fog-faint">
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
    <div className="rounded-xl border border-ink-line bg-ink-800/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display font-semibold text-fog">
          {personaName || "Persona"}
        </h4>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ring-1 ring-inset ${
              success
                ? "bg-cool/10 text-cool ring-cool/30"
                : "bg-heat-high/10 text-heat-high ring-heat-high/30"
            }`}
          >
            {success ? "task succeeded" : "task failed"}
          </span>
          <SeverityBadge severity={r?.severity} />
          {typeof r?.confidence === "number" && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog-faint">
              conf {Math.round((r.confidence <= 1 ? r.confidence * 100 : r.confidence))}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          {r?.friction?.length ? (
            <div>
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
                Friction points
              </p>
              <ul className="space-y-2.5">
                {r.friction.map((f, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-ink-line bg-ink-900/40 p-3"
                  >
                    <div className="flex gap-2 text-sm text-fog">
                      <span className="mt-0.5 font-mono text-heat-med">•</span>
                      <span>{f.issue}</span>
                    </div>
                    {f.quote && (
                      <p className="mt-2 border-l-2 border-heat-ember/60 pl-3 text-sm italic text-fog-muted">
                        &ldquo;{f.quote}&rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <FrictionList title="Friction points" items={r?.friction_points || []} />
          )}
          <FrictionList
            title="Recommendations"
            items={r?.recommendations || []}
            variant="reco"
          />
          {r?.evidence?.length > 0 && (
            <div>
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
                Evidence
              </p>
              <ul className="space-y-1 text-sm text-fog-muted">
                {r.evidence.map((ev, i) => (
                  <li key={i} className="border-l-2 border-cool/30 pl-2 italic">
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
              Browser steps
            </p>
            <StepLog steps={report.steps} />
          </div>
          <SessionReplay steps={report.steps} />
        </div>
      </div>
    </div>
  );
}
