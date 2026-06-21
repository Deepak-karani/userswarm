"use client";

import { useState, type FormEvent } from "react";
import { useStore, type TeamMember } from "@/lib/store";

const ROLES: TeamMember["role"][] = ["Admin", "Member", "Viewer"];

export default function TeamPage() {
  const { state, hydrated, addTeamMember, removeTeamMember, updateMemberRole } = useStore();
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamMember["role"]>("Member");
  const [error, setError] = useState<string | null>(null);

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email."); return; }
    setError(null);
    addTeamMember(name.trim(), email.trim(), role);
    setName("");
    setEmail("");
    setRole("Member");
    setShowInvite(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" data-testid="team-heading">
            Team
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage who has access to your workspace.
          </p>
        </div>
        <button
          type="button"
          data-testid="invite-button"
          onClick={() => setShowInvite(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          + Invite member
        </button>
      </div>

      {showInvite && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6" data-testid="invite-form">
          <h2 className="text-lg font-semibold text-slate-900">Invite a team member</h2>
          <form onSubmit={handleInvite} noValidate className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="member-name" className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  id="member-name"
                  type="text"
                  data-testid="member-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label htmlFor="member-email" className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  id="member-email"
                  type="email"
                  data-testid="member-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
            <div>
              <label htmlFor="member-role" className="block text-sm font-medium text-slate-700">Role</label>
              <select
                id="member-role"
                data-testid="member-role-select"
                value={role}
                onChange={(e) => setRole(e.target.value as TeamMember["role"])}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            {error && <p data-testid="invite-error" className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                data-testid="invite-submit"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Send invite
              </button>
              <button
                type="button"
                onClick={() => { setShowInvite(false); setError(null); }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {hydrated && (
        <div className="mt-8">
          {state.user && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {state.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{state.user.name} (you)</p>
                    <p className="text-xs text-slate-500">{state.user.email}</p>
                  </div>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">Owner</span>
              </div>

              {state.team.map((member) => (
                <div key={member.id} data-testid={`team-member-${member.id}`} className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value as TeamMember["role"])}
                      data-testid={`role-select-${member.id}`}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTeamMember(member.id)}
                      data-testid={`remove-member-${member.id}`}
                      className="rounded-lg px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {state.team.length === 0 && (
            <p className="mt-4 text-center text-sm text-slate-500" data-testid="team-empty">
              No team members yet. Invite someone to collaborate.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
