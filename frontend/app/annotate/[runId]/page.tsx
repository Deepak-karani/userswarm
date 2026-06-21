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
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-lg border text-sm font-medium transition ${
              value === n
                ? "border-accent bg-accent text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-accent/50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {(lowLabel || highLabel) && (
        <div className="mt-1 flex justify-between text-xs text-slate-400">
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
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-2 flex gap-2">
        {[
          { v: true, t: "Yes" },
          { v: false, t: "No" },
        ].map((o) => (
          <button
            key={o.t}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition ${
              value === o.v
                ? "border-accent bg-accent text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-accent/50"
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
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      {label && (
        <span className="mb-2 inline-block rounded bg-accent px-2 py-0.5 text-xs font-semibold text-white">
          Report {label}
        </span>
      )}
      <div className="flex items-center justify-between">
        <p className="font-medium text-slate-800">
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
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
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
        <p className="text-rose-600">{error}</p>
        <Link href="/" className="mt-3 inline-block text-sm text-accent-fg">
          ← Home
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center text-slate-400">
        Loading reports…
      </div>
    );
  }

  if (done) {
    return (
      <>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Thanks for labeling
          </h1>
          <p className="mt-2 text-slate-500">
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
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-fg"
            >
              Label another
            </button>
            <Link
              href={`/runs/${runId}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
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
          className="text-sm text-accent-fg hover:underline"
        >
          ← Back to run
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-fg">
            Terac labeling
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            Calibrate the AI feedback
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Human labels tell us whether to trust the AI user agents.
        </p>

        {/* context */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">
            <span className="font-medium">Product:</span> {data.description}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            <span className="font-medium">Task:</span> {data.task}
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
                  className={`rounded-full px-3 py-1 text-sm transition ${
                    i === selectedIdx
                      ? "bg-accent text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-accent/40"
                  }`}
                >
                  {p?.name || `Report ${i + 1}`}
                </button>
              );
            })}
          </div>
        )}

        {!report ? (
          <p className="mt-6 text-sm text-slate-400">No reports to label.</p>
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
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
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
                  <p className="text-sm font-medium text-slate-700">
                    6. Which report is better?
                  </p>
                  <div className="mt-2 flex gap-2">
                    {(["A", "B"] as const).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setBetter(o)}
                        className={`rounded-lg border px-5 py-1.5 text-sm font-medium transition ${
                          better === o
                            ? "border-accent bg-accent text-white"
                            : "border-slate-300 bg-white text-slate-600 hover:border-accent/50"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Annotator
                </label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  value={annotator}
                  onChange={(e) => setAnnotator(e.target.value)}
                />
              </div>

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-fg disabled:opacity-60"
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
