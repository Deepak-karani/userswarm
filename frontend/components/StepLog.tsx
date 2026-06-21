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
    return <p className="text-sm text-slate-400">No browser steps recorded.</p>;
  }
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li
          key={i}
          className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 min-w-5 items-center justify-center rounded bg-slate-200 px-1 text-xs font-medium text-slate-600">
              {s.index}
            </span>
            <code className="rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent-fg">
              {s.tool}
            </code>
            <span className="truncate font-mono text-xs text-slate-500">
              {argsToString(s.args)}
            </span>
          </div>
          {s.observation && (
            <p className="mt-1.5 pl-7 text-slate-600">{s.observation}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
