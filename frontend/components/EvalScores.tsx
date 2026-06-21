import { EvalResult } from "@/lib/api";

function pct(score: number): string {
  if (score <= 1) return `${Math.round(score * 100)}%`;
  return `${Math.round(score)}`;
}

// Eval scores as mono gauges: label + value + a thin bar.
// Cool when passing, heat when failing.
export default function EvalScores({ evals }: { evals: EvalResult[] }) {
  if (!evals?.length) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-faint">
        No evals yet.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {evals.map((e, i) => (
        <div
          key={i}
          className="rounded-xl border border-ink-line bg-ink-800/50 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-fog-muted">
              {e.eval_name}
            </span>
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                e.passed ? "text-cool" : "text-heat-high"
              }`}
            >
              {e.passed ? "pass" : "fail"}
            </span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span
              className={`font-mono text-2xl font-semibold tabular-nums ${
                e.passed ? "text-fog" : "text-heat-high"
              }`}
            >
              {pct(e.score)}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full ${
                e.passed ? "bg-cool" : "bg-heat-high"
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, (e.score <= 1 ? e.score * 100 : e.score)))}%`,
              }}
            />
          </div>
          {e.explanation && (
            <p className="mt-2 text-xs text-fog-muted">{e.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
