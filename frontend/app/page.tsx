"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRun, listRuns, RunOut } from "@/lib/api";
import SeverityBadge from "@/components/SeverityBadge";
import SwarmField from "@/components/SwarmField";

const PILLARS = [
  ["Agentspan", "coordinates the swarm"],
  ["Terac", "humans calibrate trust"],
  ["Arize", "evals prove improvement"],
];

export default function HomePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    url: "",
    description: "",
    audience: "",
    persona_types: "",
    do_not_click: "",
  });
  const [numPersonas, setNumPersonas] = useState(3);
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
      const persona_types = form.persona_types
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const { id } = await createRun({
        url: form.url,
        description: form.description,
        audience: form.audience,
        num_personas: numPersonas,
        persona_types,
        do_not_click_rules,
      });
      router.push(`/runs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-ink-line bg-ink-900/60 px-3 py-2.5 text-sm text-fog placeholder:text-fog-faint outline-none transition focus:border-cool focus:ring-2 focus:ring-cool/25";
  const labelCls =
    "mb-1.5 block font-mono text-[11px] uppercase tracking-[0.15em] text-fog-muted";

  return (
    <>
      <section className="relative overflow-hidden border-b border-ink-line">
        <SwarmField />
        <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
          {/* thesis */}
          <div className="max-w-xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cool">
              AI user testing · human-calibrated · eval-proven
            </p>
            <h1 className="mt-5 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-fog sm:text-6xl">
              Release a swarm of AI users on your product.
              <span className="block text-fog-muted">
                Watch where they hit{" "}
                <span className="text-heat-ember">friction</span>.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-fog-muted">
              Point it at a URL, say what the product is and who it&apos;s for. A
              swarm of distinct personas explores it like real users and reports the
              friction, in minutes. No test scripts.
            </p>
            <p className="mt-3 font-mono text-xs text-fog-faint">
              Not a replacement for real user research.
            </p>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
              {PILLARS.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs font-semibold uppercase tracking-widest text-cool">
                    {k}
                  </span>
                  <span className="text-xs text-fog-faint">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* the input is the hero */}
          <form
            onSubmit={onSubmit}
            className="relative h-fit rounded-2xl border border-ink-line bg-ink-800/70 p-6 shadow-[0_12px_50px_-16px_rgba(0,0,0,0.7)] backdrop-blur"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-fog">
                Set the target
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-widest text-fog-faint">
                free explore
              </span>
            </div>

            <div className="space-y-4">
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
                <label className={labelCls}>What is it?</label>
                <textarea
                  required
                  rows={2}
                  placeholder="A budgeting app that helps freelancers track invoices."
                  className={inputCls}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Who is it for?</label>
                <input
                  placeholder="Freelancers, 25-45"
                  className={inputCls}
                  value={form.audience}
                  onChange={(e) => set("audience", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Testers</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNumPersonas(n)}
                      aria-pressed={numPersonas === n}
                      className={`h-9 flex-1 rounded-md border font-mono text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/40 ${
                        numPersonas === n
                          ? "border-heat-ember bg-heat-ember/15 text-fog"
                          : "border-ink-line bg-ink-900/60 text-fog-muted hover:border-cool/40"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fog-faint">
                  AI personas to run
                </p>
              </div>
              <div>
                <label className={labelCls}>
                  Persona types{" "}
                  <span className="tracking-normal text-fog-faint">
                    (optional · comma / newline)
                  </span>
                </label>
                <input
                  placeholder="Skeptical buyer, impatient mobile user"
                  className={inputCls}
                  value={form.persona_types}
                  onChange={(e) => set("persona_types", e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Do-not-click{" "}
                  <span className="tracking-normal text-fog-faint">
                    (optional · comma / newline)
                  </span>
                </label>
                <input
                  placeholder="Delete account, Submit payment"
                  className={inputCls}
                  value={form.do_not_click}
                  onChange={(e) => set("do_not_click", e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-md border border-heat-high/30 bg-heat-high/10 px-3 py-2 text-sm text-heat-high">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-heat-ember px-4 py-3 text-sm font-semibold text-ink-900 shadow-[0_8px_28px_-8px_rgba(240,104,60,0.7)] transition hover:bg-heat-ember/90 disabled:opacity-60"
            >
              {submitting ? "Releasing the swarm…" : "Release the swarm →"}
            </button>
          </form>
        </div>
      </section>

      {/* recent runs */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-fog-muted">
          Recent runs
        </h3>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-fog-faint">
            No runs yet. Release a swarm to see results here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/runs/${r.id}`}
                  className="block rounded-xl border border-ink-line bg-ink-800/50 p-4 transition hover:border-cool/40 hover:bg-ink-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-fog">
                      {r.description || r.url || r.id}
                    </span>
                    {r.aggregate?.overall_severity && (
                      <SeverityBadge severity={r.aggregate.overall_severity} />
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-fog-faint">
                    <span className="rounded bg-white/5 px-1.5 py-0.5">
                      {r.variant}
                    </span>
                    <span
                      className={
                        r.status === "done"
                          ? "text-cool"
                          : r.status === "error"
                            ? "text-heat-high"
                            : "text-fog-muted"
                      }
                    >
                      {r.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-ink-line">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-fog-faint">
          AI user agents give instant UX feedback; human labels calibrate whether it
          is trustworthy; Arize proves improvement; Orkes/Agentspan coordinates the
          swarm.
        </div>
      </footer>
    </>
  );
}
