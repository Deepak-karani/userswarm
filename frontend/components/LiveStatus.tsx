"use client";

import { useEffect, useState } from "react";
import { getModes, Modes } from "@/lib/api";

// Header chip strip that proves the sponsor integrations are running LIVE
// (not mock). Polls the backend `/` modes endpoint. A "live" chip glows cool;
// a "mock"/offline chip stays muted. If the backend is unreachable it shows a
// single "offline" chip so a broken stack is obvious at a glance.
const LABELS: { key: keyof Modes; name: string }[] = [
  { key: "llm", name: "Claude" },
  { key: "agentspan", name: "Orkes" },
  { key: "arize", name: "Arize" },
  { key: "terac", name: "Terac" },
];

function Chip({ name, state }: { name: string; state: string }) {
  const live = state === "live";
  return (
    <span
      title={`${name}: ${state}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
        live
          ? "border-cool/40 bg-cool/10 text-cool"
          : "border-ink-line bg-ink-900/50 text-fog-faint"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          live ? "bg-cool shadow-[0_0_8px_1px_rgba(91,167,230,0.7)]" : "bg-fog-faint"
        }`}
      />
      {name}
    </span>
  );
}

export default function LiveStatus() {
  const [modes, setModes] = useState<Modes | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    const tick = () =>
      getModes()
        .then((d) => {
          if (!alive) return;
          setModes(d.modes);
          setOffline(false);
        })
        .catch(() => {
          if (!alive) return;
          setOffline(true);
        });
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (offline) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-heat-high/40 bg-heat-high/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-heat-high">
        <span className="h-1.5 w-1.5 rounded-full bg-heat-high" />
        backend offline
      </span>
    );
  }

  if (!modes) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-faint">
        checking…
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {LABELS.map((l) => (
        <Chip key={l.key} name={l.name} state={String(modes[l.key])} />
      ))}
    </div>
  );
}
