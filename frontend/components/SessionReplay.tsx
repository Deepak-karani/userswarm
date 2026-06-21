"use client";

import { useState } from "react";
import { StepLogItem, staticUrl } from "@/lib/api";

// F2: scrub through a persona's run as a sequence of real screenshots.
export default function SessionReplay({ steps }: { steps: StepLogItem[] }) {
  const shots = (steps || []).filter((s) => s.screenshot_path);
  const [i, setI] = useState(0);
  if (!shots.length) return null;
  const idx = Math.min(i, shots.length - 1);
  const cur = shots[idx];
  const src = staticUrl(cur.screenshot_path) || "";
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
        Session replay
      </p>
      <div className="overflow-hidden rounded-lg border border-ink-line bg-ink-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`step ${cur.index}`} className="block w-full" />
        <div className="flex items-center gap-3 border-t border-ink-line px-3 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-cool">
            {cur.tool}
          </span>
          <input
            type="range"
            min={0}
            max={shots.length - 1}
            value={idx}
            onChange={(e) => setI(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer accent-heat-ember"
            aria-label="Replay position"
          />
          <span className="font-mono text-[10px] tabular-nums text-fog-muted">
            {idx + 1}/{shots.length}
          </span>
        </div>
      </div>
    </div>
  );
}
