"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getRun,
  improveRun,
  RunOut,
  Report,
  Persona,
  EvalResult,
  FrictionItem,
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

// Compact trust-score chip: label + big % + optional mock-calibrated caption.
function TrustChip({
  label,
  evalResult,
}: {
  label: string;
  evalResult?: EvalResult;
}) {
  const has = typeof evalResult?.score === "number";
  const value = has
    ? evalResult!.score <= 1
      ? `${Math.round(evalResult!.score * 100)}%`
      : evalResult!.score.toFixed(1)
    : "—";
  const mock = evalResult?.explanation
    ?.toLowerCase()
    .includes("mock");
  return (
    <div className="flex-1 rounded-xl border border-cool/25 bg-cool/5 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cool">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fog">
        {value}
      </p>
      {mock && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-fog-faint">
          mock-calibrated
        </p>
      )}
    </div>
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
  const humanLikeness = run.evals?.find(
    (e) => e.eval_name === "human_likeness"
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
              className="mt-1 inline-block font-mono text-xs text-cool hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
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

        {/* concise top-of-page summary: 1-line summary + severity + two trust chips */}
        {(run.aggregate || humanAgreement || humanLikeness) && (
          <Section
            title="Summary"
            right={
              run.aggregate ? (
                <SeverityBadge severity={run.aggregate.overall_severity} />
              ) : undefined
            }
          >
            {run.aggregate?.summary && (
              <p className="line-clamp-2 text-[15px] leading-relaxed text-fog">
                {run.aggregate.summary}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <TrustChip
                label="Terac human agreement"
                evalResult={humanAgreement}
              />
              <TrustChip label="Human-likeness" evalResult={humanLikeness} />
            </div>
          </Section>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Section title="Workflow status">
            <StatusTimeline events={run.events} />
          </Section>

          <Section title="Arize evals">
            <EvalScores evals={run.evals} />
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
            <div className="space-y-4">
              {run.reports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  persona={personaById(r.persona_id)}
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

// Verdict pill: abandoned > succeeded > struggled > passed.
// Heat for abandoned/struggled, cool for succeeded/passed.
function verdict(r: Report["report"]): {
  label: string;
  className: string;
} {
  const success =
    r?.task_success === true ||
    r?.task_success === "true" ||
    r?.task_success === "success";
  const sev = String(r?.severity || "").toLowerCase();
  if (r?.abandoned) {
    return {
      label: "abandoned",
      className: "bg-heat-high/15 text-heat-high ring-heat-high/40",
    };
  }
  if (success) {
    return {
      label: "succeeded",
      className: "bg-cool/10 text-cool ring-cool/30",
    };
  }
  if (sev === "high" || sev === "medium") {
    return {
      label: "struggled",
      className: "bg-heat-med/15 text-heat-med ring-heat-med/40",
    };
  }
  return {
    label: "passed",
    className: "bg-cool/10 text-cool ring-cool/30",
  };
}

// Pull the one-word archetype that makes each tester feel distinct.
function archetype(persona?: Persona): string | null {
  const t = persona?.traits?.[0];
  if (!t) return null;
  return t.split(/\s+/)[0];
}

function ReportCard({
  report,
  persona,
  personaName,
}: {
  report: Report;
  persona?: Persona;
  personaName?: string;
}) {
  const r = report.report;
  const [expanded, setExpanded] = useState(false);
  const v = verdict(r);
  const arch = archetype(persona);

  // Top 2-3 friction points for the scannable default view.
  const friction: FrictionItem[] = r?.friction?.length
    ? r.friction
    : (r?.friction_points || []).map((issue) => ({ issue }));
  const topFriction = friction.slice(0, 3);

  return (
    <div className="rounded-xl border border-ink-line bg-ink-800/30 p-5">
      {/* card header: distinct tester identity + verdict pill */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-cool/10 font-mono text-[11px] font-semibold uppercase text-cool ring-1 ring-inset ring-cool/30"
          >
            {(personaName || "P").slice(0, 2)}
          </span>
          <div>
            <h4 className="font-display font-semibold leading-tight text-fog">
              {personaName || "Persona"}
            </h4>
            {arch && (
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-faint">
                {arch}
              </span>
            )}
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ring-1 ring-inset ${v.className}`}
        >
          {v.label}
        </span>
      </div>

      {/* the headline: persona's first-person take */}
      {r?.persona_take && (
        <p className="mt-3.5 font-display text-[17px] leading-snug text-fog">
          &ldquo;{r.persona_take}&rdquo;
        </p>
      )}

      {/* concise default: top 2-3 friction points with quotes */}
      {topFriction.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {topFriction.map((f, i) => (
            <li
              key={i}
              className="rounded-lg border border-ink-line bg-ink-900/40 p-3"
            >
              <div className="flex gap-2 text-sm text-fog">
                <span className="mt-0.5 font-mono text-heat-med">•</span>
                <span className="flex-1">{f.issue}</span>
                {f.would_abandon && (
                  <span
                    title="A real user would quit here"
                    className="shrink-0 rounded bg-heat-high/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-heat-high ring-1 ring-inset ring-heat-high/40"
                  >
                    quit
                  </span>
                )}
              </div>
              {f.quote && (
                <p className="mt-2 border-l-2 border-heat-ember/60 pl-3 text-sm italic text-fog-muted">
                  &ldquo;{f.quote}&rdquo;
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="mt-4 rounded-md font-mono text-[11px] uppercase tracking-[0.18em] text-cool transition hover:text-cool/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
      >
        {expanded ? "Hide ▾" : "Show full run data ▸"}
      </button>

      {/* full data — hidden by default */}
      {expanded && (
        <div className="mt-4 grid gap-5 border-t border-ink-line pt-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={r?.severity} />
              {typeof r?.confidence === "number" && (
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog-faint">
                  conf{" "}
                  {Math.round(
                    r.confidence <= 1 ? r.confidence * 100 : r.confidence
                  )}
                  %
                </span>
              )}
            </div>

            {friction.length ? (
              <div>
                <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
                  All friction points
                </p>
                <ul className="space-y-2.5">
                  {friction.map((f, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-ink-line bg-ink-900/40 p-3"
                    >
                      <div className="flex gap-2 text-sm text-fog">
                        <span className="mt-0.5 font-mono text-heat-med">•</span>
                        <span className="flex-1">{f.issue}</span>
                        {f.would_abandon && (
                          <span className="shrink-0 rounded bg-heat-high/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-heat-high ring-1 ring-inset ring-heat-high/40">
                            quit
                          </span>
                        )}
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
            ) : null}

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
      )}
    </div>
  );
}
