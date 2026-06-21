import { RunEvent } from "@/lib/api";

function dotColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("complete") || s.includes("success"))
    return "bg-emerald-500";
  if (s.includes("error") || s.includes("fail")) return "bg-rose-500";
  if (s.includes("run") || s.includes("progress")) return "bg-accent animate-pulse";
  return "bg-slate-300";
}

export default function StatusTimeline({ events }: { events: RunEvent[] }) {
  if (!events?.length) {
    return (
      <p className="text-sm text-slate-400">Waiting for workflow events…</p>
    );
  }
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[1.42rem] top-1 h-3 w-3 rounded-full ring-4 ring-white ${dotColor(
              e.status
            )}`}
          />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium text-slate-800">{e.node}</span>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              {e.status}
            </span>
          </div>
          {e.detail && (
            <p className="mt-0.5 text-sm text-slate-500">{e.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
