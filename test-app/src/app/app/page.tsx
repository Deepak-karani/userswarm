"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";

export default function DashboardPage() {
  const { state, hydrated, addProject } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasProjects = state.projects.length > 0;
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((t) => t.completed).length;
  const overdueTasks = state.tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Give your project a name.");
      return;
    }
    setError(null);
    addProject(title.trim(), description.trim());
    setTitle("");
    setDescription("");
    setShowForm(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="dashboard-heading">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {hydrated && state.workspaceName ? state.workspaceName : "Your workspace"} overview
          </p>
        </div>
        <button
          type="button"
          data-testid="new-project-button"
          onClick={() => setShowForm(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          + New project
        </button>
      </div>

      {hydrated && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="stats-grid">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Total tasks</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{totalTasks}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Completed</p>
            <p className="mt-1 text-3xl font-bold text-green-600">{completedTasks}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Overdue</p>
            <p className="mt-1 text-3xl font-bold text-red-600">{overdueTasks}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6" data-testid="project-form">
          <h2 className="text-lg font-semibold text-slate-900">Create a project</h2>
          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
            <div>
              <label htmlFor="project-title" className="block text-sm font-medium text-slate-700">
                Project name
              </label>
              <input
                id="project-title"
                name="project-title"
                type="text"
                data-testid="project-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              {error && (
                <p data-testid="project-error" className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>
            <div>
              <label htmlFor="project-desc" className="block text-sm font-medium text-slate-700">
                Description (optional)
              </label>
              <textarea
                id="project-desc"
                name="project-desc"
                data-testid="project-desc-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                data-testid="project-submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Create project
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
        {hasProjects ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="project-list">
            {state.projects.map((project) => {
              const projectTasks = state.tasks.filter((t) => t.projectId === project.id);
              const done = projectTasks.filter((t) => t.completed).length;
              const total = projectTasks.length;
              const percent = total === 0 ? 0 : Math.round((done / total) * 100);

              return (
                <Link
                  key={project.id}
                  href={`/app/${project.id}`}
                  data-testid={`project-card-${project.id}`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-md"
                >
                  <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">{project.description}</p>
                  )}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{done} of {total} tasks</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div
            data-testid="empty-state"
            className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
          >
            <p className="text-sm text-slate-500">No projects yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
