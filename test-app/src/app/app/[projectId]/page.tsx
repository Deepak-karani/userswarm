"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore, type Priority } from "@/lib/store";

const PRIORITIES: Priority[] = ["Low", "Medium", "High"];

const PRIORITY_BADGE: Record<Priority, string> = {
  Low: "bg-slate-100 text-slate-600",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-rose-100 text-rose-700",
};

type Tab = "tasks" | "notes";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const { state, hydrated, addTask, toggleTask, deleteTask, deleteProject, saveNote } = useStore();

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("tasks");
  const [noteContent, setNoteContent] = useState<string | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const project = state.projects.find((p) => p.id === projectId);
  const allTasks = state.tasks.filter((task) => task.projectId === projectId);
  const tasks = allTasks.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });
  const completedCount = allTasks.filter((task) => task.completed).length;
  const note = state.notes.find((n) => n.projectId === projectId);

  if (noteContent === null && note) {
    setNoteContent(note.content);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Enter a task title.");
      return;
    }
    setError(null);
    addTask({ projectId, title: title.trim(), dueDate, priority, assignee: assignee.trim() });
    setTitle("");
    setDueDate("");
    setPriority("Medium");
    setAssignee("");
  }

  function handleSaveNote() {
    saveNote(projectId, noteContent ?? "");
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  if (hydrated && !project) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-16 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Project not found</h1>
        <p className="mt-2 text-sm text-slate-600">This project doesn&apos;t exist in your workspace.</p>
        <Link
          href="/app"
          data-testid="back-to-dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link href="/app" data-testid="back-to-dashboard" className="text-sm text-slate-500 hover:text-slate-800">
        &larr; All projects
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="project-heading">
            {project ? project.title : "Project"}
          </h1>
          {project?.description && (
            <p className="mt-1 text-sm text-slate-500">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600" data-testid="task-counter">
            {completedCount} of {allTasks.length} complete
          </span>
          <button
            type="button"
            data-testid="delete-project-button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Delete project
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4" data-testid="delete-confirm">
          <p className="text-sm text-red-700">Are you sure? This will delete the project and all its tasks.</p>
          <div className="mt-3 flex gap-3">
            <Link
              href="/app"
              onClick={() => deleteProject(projectId)}
              data-testid="confirm-delete-project"
              className="inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
            >
              Delete
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            type="button"
            data-testid="tab-tasks"
            onClick={() => setTab("tasks")}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === "tasks" ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Tasks ({allTasks.length})
          </button>
          <button
            type="button"
            data-testid="tab-notes"
            onClick={() => setTab("notes")}
            className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
              tab === "notes" ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Notes
          </button>
        </nav>
      </div>

      {tab === "tasks" && (
        <>
          <form
            onSubmit={handleSubmit}
            noValidate
            data-testid="add-task-form"
            className="mt-6 rounded-xl border border-slate-200 bg-white p-5"
          >
            <h3 className="text-sm font-semibold text-slate-700">Add a task</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-4">
                <label htmlFor="task-title" className="block text-xs font-medium text-slate-500">Title</label>
                <input
                  id="task-title"
                  type="text"
                  data-testid="add-task-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="task-due" className="block text-xs font-medium text-slate-500">Due date</label>
                <input
                  id="task-due"
                  type="date"
                  data-testid="task-due-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="task-priority" className="block text-xs font-medium text-slate-500">Priority</label>
                <select
                  id="task-priority"
                  data-testid="task-priority-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  {PRIORITIES.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="task-assignee" className="block text-xs font-medium text-slate-500">Assignee</label>
                <input
                  id="task-assignee"
                  type="text"
                  data-testid="task-assignee-input"
                  placeholder="Name"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  data-testid="add-task-button"
                  className="inline-flex h-[38px] w-full items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                >
                  Add task
                </button>
              </div>
            </div>
            {error && <p data-testid="add-task-error" className="mt-2 text-sm text-red-600">{error}</p>}
          </form>

          <div className="mt-4 flex gap-2">
            {(["all", "active", "completed"] as const).map((f) => (
              <button
                key={f}
                type="button"
                data-testid={`filter-${f}`}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {tasks.length === 0 ? (
            <div data-testid="task-empty-state" className="mt-8 text-center text-sm text-slate-400">
              {filter === "all" ? "No tasks yet. Add one above." : `No ${filter} tasks.`}
            </div>
          ) : (
            <ul className="mt-4 space-y-2" data-testid="task-list">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  data-testid={`task-item-${task.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300"
                >
                  <input
                    type="checkbox"
                    data-testid={`task-complete-checkbox-${task.id}`}
                    aria-label={`Mark ${task.title} complete`}
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="min-w-0 flex-1">
                    <span
                      className={task.completed ? "text-slate-400 line-through" : "text-slate-900"}
                      data-testid={`task-title-${task.id}`}
                    >
                      {task.title}
                    </span>
                    {task.assignee && (
                      <span className="ml-2 text-xs text-slate-400">- {task.assignee}</span>
                    )}
                  </div>
                  {task.dueDate && (
                    <span className="text-xs text-slate-400">{task.dueDate}</span>
                  )}
                  <span
                    data-testid={`task-priority-${task.id}`}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                  {task.completed && (
                    <span data-testid={`task-status-${task.id}`} className="text-xs font-semibold text-green-600">
                      Done
                    </span>
                  )}
                  <button
                    type="button"
                    data-testid={`delete-task-${task.id}`}
                    onClick={() => deleteTask(task.id)}
                    className="rounded p-1 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    aria-label={`Delete ${task.title}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "notes" && (
        <div className="mt-6">
          <textarea
            data-testid="project-notes"
            value={noteContent ?? ""}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write project notes, meeting summaries, decisions..."
            rows={12}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              data-testid="save-notes"
              onClick={handleSaveNote}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Save notes
            </button>
            {noteSaved && <span className="text-sm text-green-600">Saved!</span>}
          </div>
        </div>
      )}
    </div>
  );
}
