import { RunEvent } from "@/lib/api";

// Status as instrument readout: cool = working, heat = friction/error.
function dotColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("complete") || s.includes("success"))
    return "bg-cool";
  if (s.includes("error") || s.includes("fail")) return "bg-heat-high";
  if (s.includes("run") || s.includes("progress")) return "bg-cool animate-pulse";
  return "bg-fog-faint";
}

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("done") || s.includes("complete") || s.includes("success"))
    return "text-cool";
  if (s.includes("error") || s.includes("fail")) return "text-heat-high";
  if (s.includes("run") || s.includes("progress")) return "text-cool";
  return "text-fog-muted";
}

export default function StatusTimeline({ events }: { events: RunEvent[] }) {
  if (!events?.length) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-faint">
        Waiting for workflow events…
      </p>
    );
  }
  return (
    <ol className="relative space-y-4 border-l border-ink-line pl-5">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[1.42rem] top-1 h-3 w-3 rounded-full ring-4 ring-ink-800 ${dotColor(
              e.status
            )}`}
          />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-sm font-medium text-fog">
              {e.node}
            </span>
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.18em] ${statusColor(
                e.status
              )}`}
            >
              {e.status}
            </span>
          </div>
          {e.detail && (
            <p className="mt-0.5 text-sm text-fog-muted">{e.detail}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
