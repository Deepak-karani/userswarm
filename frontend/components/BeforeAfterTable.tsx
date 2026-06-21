import { CompareOut, CompareMetrics } from "@/lib/api";

const ROWS: {
  key: keyof CompareMetrics;
  label: string;
  format: "pct" | "rating" | "num";
  higherIsBetter: boolean;
}[] = [
  { key: "usefulness_rating", label: "Usefulness rating", format: "rating", higherIsBetter: true },
  { key: "evidence_coverage", label: "Reports with evidence", format: "pct", higherIsBetter: true },
  { key: "hallucination_risk", label: "Hallucination risk", format: "pct", higherIsBetter: false },
  { key: "human_agreement", label: "Human agreement", format: "rating", higherIsBetter: true },
  { key: "actionability_pass_rate", label: "Actionability pass rate", format: "pct", higherIsBetter: true },
  { key: "task_success_rate", label: "Task success rate", format: "pct", higherIsBetter: true },
];

function fmt(v: number | undefined, format: "pct" | "rating" | "num"): string {
  if (v == null || Number.isNaN(v)) return "—";
  if (format === "pct") return `${Math.round(v <= 1 ? v * 100 : v)}%`;
  if (format === "rating") return v.toFixed(1);
  return String(v);
}

export default function BeforeAfterTable({ data }: { data: CompareOut }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-line bg-ink-800/50">
      <table className="w-full text-sm">
        <thead className="border-b border-ink-line bg-ink-900/40 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-fog-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Metric</th>
            <th className="px-4 py-3 font-medium">Base</th>
            <th className="px-4 py-3 font-medium">Improved</th>
            <th className="px-4 py-3 font-medium">Δ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-line">
          {ROWS.map((row) => {
            const base = data.base?.[row.key];
            const improved = data.improved?.[row.key];
            const delta = data.deltas?.[row.key];
            let good = false;
            if (delta != null && delta !== 0) {
              good = row.higherIsBetter ? delta > 0 : delta < 0;
            }
            return (
              <tr key={row.key}>
                <td className="px-4 py-3 text-fog-muted">
                  {row.label}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-fog-muted">
                  {fmt(base, row.format)}
                </td>
                <td className="px-4 py-3 font-mono font-medium tabular-nums text-fog">
                  {fmt(improved, row.format)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">
                  {delta == null || delta === 0 ? (
                    <span className="text-fog-faint">—</span>
                  ) : (
                    <span
                      className={`font-medium ${
                        good ? "text-cool" : "text-heat-high"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {fmt(Math.abs(delta) === delta ? delta : delta, row.format)}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
