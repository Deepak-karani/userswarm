import { EvalResult } from "@/lib/api";

function pct(score: number): string {
  if (score <= 1) return `${Math.round(score * 100)}%`;
  return `${Math.round(score)}`;
}

export default function EvalScores({ evals }: { evals: EvalResult[] }) {
  if (!evals?.length) {
    return <p className="text-sm text-slate-400">No evals yet.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {evals.map((e, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">
              {e.eval_name}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                e.passed
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {e.passed ? "pass" : "fail"}
            </span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-semibold tabular-nums text-slate-900">
              {pct(e.score)}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                e.passed ? "bg-emerald-500" : "bg-rose-400"
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, (e.score <= 1 ? e.score * 100 : e.score)))}%`,
              }}
            />
          </div>
          {e.explanation && (
            <p className="mt-2 text-xs text-slate-500">{e.explanation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
