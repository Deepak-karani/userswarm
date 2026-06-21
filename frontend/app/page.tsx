"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRun, listRuns, RunOut } from "@/lib/api";
import PitchFooter from "@/components/PitchFooter";
import SeverityBadge from "@/components/SeverityBadge";

const PILLARS = [
  { k: "AI user agents", v: "Instant UX feedback from realistic personas" },
  { k: "Human labels (Terac)", v: "Calibrate whether the feedback is trustworthy" },
  { k: "Arize evals", v: "Prove base-vs-improved improvement" },
  { k: "Orkes / Agentspan", v: "Coordinates the agent workflow" },
];

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    url: "",
    description: "",
    audience: "",
    task: "",
    success_criteria: "",
    do_not_click: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RunOut[]>([]);

  useEffect(() => {
    listRuns()
      .then((r) => setRecent(Array.isArray(r) ? r.slice(0, 6) : []))
      .catch(() => setRecent([]));
  }, []);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const do_not_click_rules = form.do_not_click
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { id } = await createRun({
        url: form.url,
        description: form.description,
        audience: form.audience,
        task: form.task,
        success_criteria: form.success_criteria,
        do_not_click_rules,
      });
      router.push(`/runs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";
  const labelCls = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <>
      <section className="bg-gradient-to-b from-accent-soft/60 to-transparent">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-16">
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-accent-fg ring-1 ring-accent/20">
            AI user agents · human-calibrated · eval-proven
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Run a swarm of AI users through your product and get UX feedback in
            minutes.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            AI user agents give instant UX feedback; human labels calibrate
            whether that feedback is trustworthy; Arize proves improvement;
            Orkes/Agentspan coordinates the workflow.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Not a replacement for real user research.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div
                key={p.k}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-sm font-semibold text-slate-900">{p.k}</p>
                <p className="mt-1 text-xs text-slate-500">{p.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Start a UX run
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Describe the product and the task you want AI users to attempt.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelCls}>Product URL</label>
                <input
                  required
                  type="url"
                  placeholder="https://yourapp.com"
                  className={inputCls}
                  value={form.url}
                  onChange={(e) => set("url", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Product description</label>
                <textarea
                  required
                  rows={2}
                  placeholder="A budgeting app that helps freelancers track invoices."
                  className={inputCls}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Audience</label>
                  <input
                    required
                    placeholder="Freelancers, 25-45"
                    className={inputCls}
                    value={form.audience}
                    onChange={(e) => set("audience", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Task</label>
                  <input
                    required
                    placeholder="Create and send a new invoice"
                    className={inputCls}
                    value={form.task}
                    onChange={(e) => set("task", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Success criteria</label>
                <input
                  required
                  placeholder="Invoice is sent and confirmation is shown"
                  className={inputCls}
                  value={form.success_criteria}
                  onChange={(e) => set("success_criteria", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Do-not-click rules{" "}
                  <span className="font-normal text-slate-400">
                    (optional · comma or newline separated)
                  </span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Delete account, Logout, Submit payment"
                  className={inputCls}
                  value={form.do_not_click}
                  onChange={(e) => set("do_not_click", e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-fg disabled:opacity-60"
            >
              {submitting ? "Starting run…" : "Run the swarm →"}
            </button>
          </form>

          <aside>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent runs
            </h3>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                No runs yet. Start one to see results here.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/runs/${r.id}`}
                      className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-accent/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-800">
                          {r.description || r.url || r.id}
                        </span>
                        {r.aggregate?.overall_severity && (
                          <SeverityBadge
                            severity={r.aggregate.overall_severity}
                          />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 uppercase">
                          {r.variant}
                        </span>
                        <span>{r.status}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </section>

      <PitchFooter />
    </>
  );
}
