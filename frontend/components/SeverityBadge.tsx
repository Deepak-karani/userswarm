import { Severity } from "@/lib/api";

// Severity as heat: friction radiates warmth.
const STYLES: Record<string, string> = {
  low: "bg-heat-low/15 text-heat-low ring-heat-low/30",
  medium: "bg-heat-med/15 text-heat-med ring-heat-med/30",
  high: "bg-heat-high/15 text-heat-high ring-heat-high/30",
};

export default function SeverityBadge({ severity }: { severity?: Severity }) {
  const key = (severity || "low").toString().toLowerCase();
  const style = STYLES[key] || "bg-white/5 text-fog-muted ring-white/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ring-1 ring-inset ${style}`}
    >
      {key}
    </span>
  );
}
