"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const router = useRouter();
  const { state, hydrated, setUser, setWorkspaceName, reset } = useStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [workspaceSaved, setWorkspaceSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [inited, setInited] = useState(false);

  if (hydrated && !inited) {
    setName(state.user?.name ?? "");
    setEmail(state.user?.email ?? "");
    setWorkspace(state.workspaceName ?? "");
    setInited(true);
  }

  function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setUser({ name: name.trim(), email: email.trim() });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  function handleWorkspaceSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace.trim()) return;
    setWorkspaceName(workspace.trim());
    setWorkspaceSaved(true);
    setTimeout(() => setWorkspaceSaved(false), 2000);
  }

  function handleReset() {
    reset();
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="settings-heading">
        Settings
      </h1>
      <p className="mt-1 text-sm text-slate-500">Manage your profile and workspace.</p>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6" data-testid="profile-section">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <form onSubmit={handleProfileSave} className="mt-4 space-y-4">
          <div>
            <label htmlFor="settings-name" className="block text-sm font-medium text-slate-700">Name</label>
            <input
              id="settings-name"
              type="text"
              data-testid="settings-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="block text-sm font-medium text-slate-700">Email</label>
            <input
              id="settings-email"
              type="email"
              data-testid="settings-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              data-testid="save-profile"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Save profile
            </button>
            {profileSaved && <span className="text-sm text-green-600" data-testid="profile-saved">Saved!</span>}
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6" data-testid="workspace-section">
        <h2 className="text-lg font-semibold text-slate-900">Workspace</h2>
        <form onSubmit={handleWorkspaceSave} className="mt-4 space-y-4">
          <div>
            <label htmlFor="settings-workspace" className="block text-sm font-medium text-slate-700">Workspace name</label>
            <input
              id="settings-workspace"
              type="text"
              data-testid="settings-workspace-input"
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              data-testid="save-workspace"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Save workspace
            </button>
            {workspaceSaved && <span className="text-sm text-green-600" data-testid="workspace-saved">Saved!</span>}
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-red-200 bg-white p-6" data-testid="danger-section">
        <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-600">
          Permanently delete all workspace data including projects, tasks, and team members.
        </p>
        {showReset ? (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              data-testid="confirm-reset"
              onClick={handleReset}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Yes, delete everything
            </button>
            <button
              type="button"
              onClick={() => setShowReset(false)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="reset-button"
            onClick={() => setShowReset(true)}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-red-300 px-5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            Reset workspace
          </button>
        )}
      </section>
    </div>
  );
}
