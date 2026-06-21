import { StepLogItem } from "@/lib/api";

function argsToString(args: StepLogItem["args"]): string {
  if (args == null) return "";
  if (typeof args === "string") return args;
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

export default function StepLog({ steps }: { steps: StepLogItem[] }) {
  if (!steps?.length) {
    return (
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-faint">
        No browser steps recorded.
      </p>
    );
  }
  return (
    <ol className="space-y-2 rounded-lg border border-ink-line bg-ink-900/60 p-3">
      {steps.map((s, i) => (
        <li key={i} className="text-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-5 min-w-5 items-center justify-center rounded bg-white/5 px-1 font-mono text-[10px] text-fog-faint ring-1 ring-inset ring-ink-line">
              {s.index}
            </span>
            <code className="rounded bg-cool/10 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-cool">
              {s.tool}
            </code>
            <span className="truncate font-mono text-xs text-fog-muted">
              {argsToString(s.args)}
            </span>
          </div>
          {s.observation && (
            <p className="mt-1.5 pl-7 font-mono text-xs leading-relaxed text-fog-muted">
              {s.observation}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
