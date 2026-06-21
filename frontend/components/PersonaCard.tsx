import { Persona } from "@/lib/api";

export default function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-800/50 p-5 transition hover:border-cool/40">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cool/15 font-display font-semibold text-cool ring-1 ring-cool/30">
          {persona.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <h4 className="font-display font-semibold text-fog">{persona.name}</h4>
        </div>
      </div>
      <p className="mt-3 text-sm text-fog-muted">{persona.description}</p>
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
    </div>
  );
}
