"use client";

import { useState } from "react";
import { Persona } from "@/lib/api";

export default function PersonaCard({ persona }: { persona: Persona }) {
  const [open, setOpen] = useState(false);
  const hasMore = (persona.traits?.length || 0) + (persona.goals?.length || 0) > 0;
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-800/50 p-5 transition hover:border-cool/40">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cool/15 font-display font-semibold text-cool ring-1 ring-cool/30">
          {persona.name?.[0]?.toUpperCase() || "?"}
        </div>
        <h4 className="font-display font-semibold leading-tight text-fog">
          {persona.name}
        </h4>
      </div>

      {/* one-liner description of the persona type */}
      <p className={`mt-3 text-sm text-fog-muted ${open ? "" : "line-clamp-2"}`}>
        {persona.description}
      </p>

      {/* full info — revealed on demand */}
      {open && (
        <>
          {persona.traits?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {persona.traits.map((t, i) => (
                <span
                  key={i}
                  className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fog-muted ring-1 ring-inset ring-ink-line"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
          {persona.goals?.length > 0 && (
            <div className="mt-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-faint">
                Goals
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-fog-muted marker:text-cool">
                {persona.goals.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {hasMore && (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-cool transition hover:text-cool/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
        >
          {open ? "Less ▾" : "Full info ▸"}
        </button>
      )}
    </div>
  );
}
