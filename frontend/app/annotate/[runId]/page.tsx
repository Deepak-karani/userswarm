"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getAnnotate,
  postAnnotation,
  AnnotateData,
  Report,
  Persona,
  AnnotationInput,
} from "@/lib/api";
import StepLog from "@/components/StepLog";
import FrictionList from "@/components/FrictionList";
import SeverityBadge from "@/components/SeverityBadge";
import PitchFooter from "@/components/PitchFooter";

const DEFAULT_ANNOTATOR =
  process.env.NEXT_PUBLIC_DEFAULT_ANNOTATOR || "labeler@terac";

function Likert({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-fog">{label}</p>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-md border font-mono text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50 ${
              value === n
                ? "border-cool bg-cool/20 text-cool"
                : "border-ink-line bg-ink-800 text-fog-muted hover:border-cool/40"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-fog-faint">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-fog">{label}</p>
      <div className="mt-2 flex gap-2">
        {[
          { v: true, t: "Yes" },
          { v: false, t: "No" },
        ].map((o) => (
          <button
            key={o.t}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50 ${
              value === o.v
                ? "border-cool bg-cool/20 text-cool"
                : "border-ink-line bg-ink-800 text-fog-muted hover:border-cool/40"
            }`}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReportView({
  report,
  persona,
  label,
}: {
  report: Report;
  persona?: Persona;
  label?: string;
}) {
  const r = report.report;
  return (
    <div className="rounded-xl border border-ink-line bg-ink-800/40 p-4">
      {label && (
        <span className="mb-2 inline-block rounded bg-cool/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cool ring-1 ring-inset ring-cool/30">
          Report {label}
        </span>
      )}
      <div className="flex items-center justify-between">
        <p className="font-display font-medium text-fog">
          {persona?.name || r?.persona || "Persona"}
        </p>
        <SeverityBadge severity={r?.severity} />
      </div>
      <div className="mt-3 space-y-3">
        <FrictionList title="Friction" items={r?.friction_points || []} />
        <FrictionList
          title="Recommendations"
          items={r?.recommendations || []}
          variant="reco"
        />
        {r?.evidence?.length > 0 && (
          <FrictionList title="Evidence" items={r.evidence} />
        )}
        <div>
          <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
            Step log
          </p>
          <StepLog steps={report.steps} />
        </div>
      </div>
    </div>
  );
}

export default function AnnotatePage({
  params,
}: {
  params: { runId: string };
}) {
  const { runId } = params;
  const [data, setData] = useState<AnnotateData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [annotator, setAnnotator] = useState(DEFAULT_ANNOTATOR);
  const [useful, setUseful] = useState<number>();
  const [specific, setSpecific] = useState<number>();
  const [hallucinated, setHallucinated] = useState<boolean>();
  const [understood, setUnderstood] = useState<boolean>();
  const [agree, setAgree] = useState<number>();
  const [better, setBetter] = useState<"A" | "B">();

  useEffect(() => {
    getAnnotate(runId)
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      );
  }, [runId]);

  const personaFor = useMemo(() => {
    return (report?: Report) =>
      data?.personas?.find((p) => p.id === report?.persona_id);
  }, [data]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-heat-high">{error}</p>
        <Link href="/" className="mt-3 inline-block font-mono text-xs text-cool hover:underline">
          ← Home
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-fog-faint">
        Loading reports…
      </div>
    );
  }

  if (done) {
    return (
      <>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cool/15 text-2xl text-cool ring-1 ring-cool/30">
            ✓
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-fog">
            Thanks for labeling
          </h1>
          <p className="mt-2 text-fog-muted">
            Your label helps calibrate whether the AI feedback is trustworthy.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => {
                setDone(false);
                setUseful(undefined);
                setSpecific(undefined);
                setHallucinated(undefined);
                setUnderstood(undefined);
                setAgree(undefined);
                setBetter(undefined);
                setSelectedIdx((i) =>
                  Math.min(i + 1, (data.reports?.length || 1) - 1)
                );
              }}
              className="rounded-md bg-heat-ember px-4 py-2 text-sm font-semibold text-ink-900 shadow-[0_8px_28px_-8px_rgba(240,104,60,0.7)] transition hover:bg-heat-ember/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-ember/50"
            >
              Label another
            </button>
            <Link
              href={`/runs/${runId}`}
              className="rounded-md border border-ink-line bg-ink-800 px-4 py-2 text-sm font-medium text-fog transition hover:border-cool/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
            >
              Back to run
            </Link>
          </div>
        </div>
        <PitchFooter />
      </>
    );
  }

  const reports = data.reports || [];
  const report = reports[selectedIdx];
  const reportB = data.has_improved ? reports[selectedIdx + 1] : undefined;

  async function submit() {
    if (!report) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: AnnotationInput = {
        report_id: report.id,
        annotator,
        useful_to_builder: useful,
        specific_vs_vague: specific,
        hallucinated,
        understood_task: understood,
        real_user_would_agree: agree,
      };
      if (data?.has_improved && reportB) {
        payload.report_b_id = reportB.id;
        payload.better_report = better;
      }
      await postAnnotation(runId, payload);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href={`/runs/${runId}`}
          className="font-mono text-xs text-cool hover:underline"
        >
          ← Back to run
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded bg-cool/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cool ring-1 ring-inset ring-cool/30">
            Terac labeling
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fog">
            Calibrate the AI feedback
          </h1>
        </div>
        <p className="mt-1 text-sm text-fog-muted">
          Human labels tell us whether to trust the AI user agents.
        </p>

        {/* context */}
        <div className="mt-5 rounded-xl border border-ink-line bg-ink-800/50 p-4">
          <p className="text-sm text-fog">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fog-faint">
              Product
            </span>{" "}
            {data.description}
          </p>
          <p className="mt-1 text-sm text-fog">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fog-faint">
              Task
            </span>{" "}
            {data.task ? (
              data.task
            ) : (
              <span className="text-fog-faint">free explore</span>
            )}
          </p>
        </div>

        {reports.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {reports.map((rep, i) => {
              const p = personaFor(rep);
              return (
                <button
                  key={rep.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`rounded-full px-3 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50 ${
                    i === selectedIdx
                      ? "bg-cool/20 text-cool ring-1 ring-inset ring-cool/40"
                      : "bg-ink-800 text-fog-muted ring-1 ring-inset ring-ink-line hover:border-cool/40 hover:text-fog"
                  }`}
                >
                  {p?.name || `Report ${i + 1}`}
                </button>
              );
            })}
          </div>
        )}

        {!report ? (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-fog-faint">
            No reports to label.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              {data.has_improved && reportB ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ReportView
                    report={report}
                    persona={personaFor(report)}
                    label="A"
                  />
                  <ReportView
                    report={reportB}
                    persona={personaFor(reportB)}
                    label="B"
                  />
                </div>
              ) : (
                <ReportView report={report} persona={personaFor(report)} />
              )}
            </div>

            {/* questions */}
            <div className="space-y-5 rounded-2xl border border-ink-line bg-ink-800/50 p-5">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fog-muted">
                Your assessment
              </h3>
              <Likert
                label="1. Useful to the builder?"
                value={useful}
                onChange={setUseful}
                lowLabel="Useless"
                highLabel="Very useful"
              />
              <Likert
                label="2. Specific vs vague?"
                value={specific}
                onChange={setSpecific}
                lowLabel="Vague"
                highLabel="Specific"
              />
              <YesNo
                label="3. Hallucinated anything?"
                value={hallucinated}
                onChange={setHallucinated}
              />
              <YesNo
                label="4. Understood the task?"
                value={understood}
                onChange={setUnderstood}
              />
              <Likert
                label="5. Would a real user agree?"
                value={agree}
                onChange={setAgree}
                lowLabel="No"
                highLabel="Definitely"
              />

              {data.has_improved && reportB && (
                <div>
                  <p className="text-sm font-medium text-fog">
                    6. Which report is better?
                  </p>
                  <div className="mt-2 flex gap-2">
                    {(["A", "B"] as const).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setBetter(o)}
                        className={`rounded-md border px-5 py-1.5 font-mono text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50 ${
                          better === o
                            ? "border-cool bg-cool/20 text-cool"
                            : "border-ink-line bg-ink-800 text-fog-muted hover:border-cool/40"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-fog-muted">
                  Annotator
                </label>
                <input
                  className="w-full rounded-md border border-ink-line bg-ink-900/60 px-3 py-2 text-sm text-fog placeholder:text-fog-faint outline-none transition focus:border-cool focus:ring-2 focus:ring-cool/25"
                  value={annotator}
                  onChange={(e) => setAnnotator(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-md border border-heat-high/30 bg-heat-high/10 px-3 py-2 text-sm text-heat-high">
                  {error}
                </p>
              )}

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-md bg-heat-ember px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-[0_8px_28px_-8px_rgba(240,104,60,0.7)] transition hover:bg-heat-ember/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-heat-ember/50 disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit label"}
              </button>
            </div>
          </div>
        )}
      </div>
      <PitchFooter />
    </>
  );
}
