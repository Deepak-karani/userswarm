import { Persona } from "@/lib/api";

export default function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-fg font-semibold">
          {persona.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">{persona.name}</h4>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{persona.description}</p>
      {persona.traits?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {persona.traits.map((t, i) => (
            <span
              key={i}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {persona.goals?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Goals
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-slate-600">
            {persona.goals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
