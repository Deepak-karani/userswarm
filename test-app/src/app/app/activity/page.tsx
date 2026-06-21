"use client";

import { useStore } from "@/lib/store";

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  task_created: { bg: "bg-blue-50", text: "text-blue-700", label: "Task" },
  task_completed: { bg: "bg-green-50", text: "text-green-700", label: "Done" },
  project_created: { bg: "bg-purple-50", text: "text-purple-700", label: "Project" },
  member_invited: { bg: "bg-amber-50", text: "text-amber-700", label: "Team" },
  note_saved: { bg: "bg-slate-50", text: "text-slate-600", label: "Note" },
};

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function ActivityPage() {
  const { state, hydrated } = useStore();

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="activity-heading">
        Activity
      </h1>
      <p className="mt-1 text-sm text-slate-500">Recent actions in your workspace.</p>

      {hydrated && state.activity.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center" data-testid="activity-empty">
          <p className="text-sm text-slate-500">No activity yet. Start creating projects and tasks.</p>
        </div>
      )}

      {hydrated && state.activity.length > 0 && (
        <div className="mt-6 space-y-1" data-testid="activity-feed">
          {state.activity.map((item) => {
            const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.note_saved;
            return (
              <div
                key={item.id}
                data-testid={`activity-item-${item.id}`}
                className="flex items-center gap-4 rounded-lg border border-slate-100 bg-white px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
                <p className="flex-1 text-sm text-slate-700">{item.message}</p>
                <time className="shrink-0 text-xs text-slate-400">{formatTime(item.timestamp)}</time>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
