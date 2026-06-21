import { Severity } from "@/lib/api";

const STYLES: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  high: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default function SeverityBadge({ severity }: { severity?: Severity }) {
  const key = (severity || "low").toString().toLowerCase();
  const style = STYLES[key] || "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ring-1 ring-inset ${style}`}
    >
      {key}
    </span>
  );
}
