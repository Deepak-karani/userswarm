"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Priority } from "@/lib/store";

type DemoTask = {
  id: number;
  title: string;
  priority: Priority;
  done: boolean;
};

const SEED_TASKS: DemoTask[] = [
  { id: 1, title: "Draft the launch checklist", priority: "High", done: false },
  { id: 2, title: "Invite the team", priority: "Medium", done: false },
  { id: 3, title: "Sketch the homepage", priority: "Low", done: true },
];

const PRIORITY_ORDER: Priority[] = ["Low", "Medium", "High"];

const PRIORITY_STYLES: Record<Priority, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
};

function nextPriority(priority: Priority): Priority {
  const index = PRIORITY_ORDER.indexOf(priority);
  return PRIORITY_ORDER[(index + 1) % PRIORITY_ORDER.length];
}

export function LandingDemo() {
  const [tasks, setTasks] = useState<DemoTask[]>(SEED_TASKS);
  const [nextId, setNextId] = useState(SEED_TASKS.length + 1);
  const [draft, setDraft] = useState("");

  const completed = useMemo(
    () => tasks.filter((task) => task.done).length,
    [tasks]
  );
  const total = tasks.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const allDone = total > 0 && completed === total;

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) {
      return;
    }
    setTasks((prev) => [
      ...prev,
      { id: nextId, title, priority: "Medium", done: false },
    ]);
    setNextId((id) => id + 1);
    setDraft("");
  }

  function toggle(id: number) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  }

  function cyclePriority(id: number) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, priority: nextPriority(task.priority) } : task
      )
    );
  }

  function remove(id: number) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  return (
    <div
      data-testid="landing-demo"
      className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Try it live — no account needed
          </h2>
          <p className="text-sm text-slate-500">
            Add a task, set its priority, check it off.
          </p>
        </div>
        <span
          data-testid="demo-progress"
          className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
        >
          {completed} of {total} done
        </span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          data-testid="demo-progress-bar"
          className="h-full rounded-full bg-brand-600 transition-all duration-200"
          style={{ width: `${percent}%` }}
        />
      </div>

      <form onSubmit={handleAdd} className="mt-5 flex gap-2">
        <label htmlFor="demo-task" className="sr-only">
          New task
        </label>
        <input
          id="demo-task"
          name="demo-task"
          type="text"
          placeholder="e.g. Write the press release"
          data-testid="demo-task-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="submit"
          data-testid="demo-add-button"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Add task
        </button>
      </form>

      {total === 0 ? (
        <p
          data-testid="demo-empty"
          className="mt-6 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400"
        >
          Your board is empty. Add a task above to get rolling.
        </p>
      ) : (
        <ul className="mt-5 space-y-2" data-testid="demo-task-list">
          {tasks.map((task) => (
            <li
              key={task.id}
              data-testid={`demo-task-item-${task.id}`}
              className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
            >
              <input
                type="checkbox"
                data-testid={`demo-checkbox-${task.id}`}
                aria-label={`Mark "${task.title}" complete`}
                checked={task.done}
                onChange={() => toggle(task.id)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span
                className={
                  task.done
                    ? "flex-1 text-sm text-slate-400 line-through"
                    : "flex-1 text-sm text-slate-900"
                }
              >
                {task.title}
              </span>
              <button
                type="button"
                data-testid={`demo-priority-${task.id}`}
                onClick={() => cyclePriority(task.id)}
                aria-label={`Change priority of "${task.title}" (currently ${task.priority})`}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${PRIORITY_STYLES[task.priority]}`}
              >
                {task.priority}
              </button>
              <button
                type="button"
                data-testid={`demo-delete-${task.id}`}
                onClick={() => remove(task.id)}
                aria-label={`Remove "${task.title}"`}
                className="rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {allDone ? (
        <p
          data-testid="demo-cleared-banner"
          className="mt-5 rounded-lg bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700"
        >
          Board cleared — that&apos;s the whole Nimbus loop. Ready to make it
          yours?
        </p>
      ) : null}
    </div>
  );
}
