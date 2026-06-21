"use client";

import { useEffect, useState } from "react";
import { StepLogItem, staticUrl } from "@/lib/api";

// F2: scrub through a persona's run as a sequence of real screenshots.
export default function SessionReplay({ steps }: { steps: StepLogItem[] }) {
  const shots = (steps || []).filter((s) => s.screenshot_path);
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  if (!shots.length) return null;
  const idx = Math.min(i, shots.length - 1);
  const cur = shots[idx];
  const src = staticUrl(cur.screenshot_path) || "";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-muted">
          Session replay
        </p>
        <button
          type="button"
          onClick={() => setFull(true)}
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-cool transition hover:text-cool/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
        >
          ⤢ Fullscreen
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-ink-line bg-ink-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`step ${cur.index}`}
          onClick={() => setFull(true)}
          className="block w-full cursor-zoom-in"
        />
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

      {full && (
        <Lightbox
          shots={shots}
          index={idx}
          onIndex={setI}
          onClose={() => setFull(false)}
        />
      )}
    </div>
  );
}

// Full-screen viewer: large screenshot + prev/next + scrubber.
// Closes on Esc / backdrop click / ✕; arrow keys step through.
function Lightbox({
  shots,
  index,
  onIndex,
  onClose,
}: {
  shots: StepLogItem[];
  index: number;
  onIndex: (n: number) => void;
  onClose: () => void;
}) {
  const cur = shots[Math.min(index, shots.length - 1)];
  const src = staticUrl(cur.screenshot_path) || "";
  const go = (n: number) => onIndex(Math.max(0, Math.min(shots.length - 1, n)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    // Lock background scroll while the overlay is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-ink-900/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Screenshot fullscreen viewer"
    >
      {/* top bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between px-5 py-3"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-cool">
          {cur.tool}{" "}
          <span className="text-fog-faint">
            · step {cur.index} · {Math.min(index, shots.length - 1) + 1}/{shots.length}
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fullscreen"
          className="rounded-md px-2 py-1 font-mono text-sm text-fog-muted transition hover:bg-white/10 hover:text-fog focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
        >
          ✕ Esc
        </button>
      </div>

      {/* image + side nav */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-1 items-center justify-center gap-3 px-4 pb-3"
      >
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index <= 0}
          aria-label="Previous screenshot"
          className="shrink-0 rounded-full border border-ink-line bg-ink-800/70 px-3 py-3 text-fog transition hover:border-cool/40 disabled:opacity-30"
        >
          ‹
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`step ${cur.index}`}
          className="max-h-full max-w-full rounded-lg border border-ink-line object-contain"
        />
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index >= shots.length - 1}
          aria-label="Next screenshot"
          className="shrink-0 rounded-full border border-ink-line bg-ink-800/70 px-3 py-3 text-fog transition hover:border-cool/40 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* scrubber */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mb-5 flex w-full max-w-3xl items-center gap-3 px-6"
      >
        <input
          type="range"
          min={0}
          max={shots.length - 1}
          value={Math.min(index, shots.length - 1)}
          onChange={(e) => go(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer accent-heat-ember"
          aria-label="Replay position"
        />
        <span className="font-mono text-[10px] tabular-nums text-fog-muted">
          {Math.min(index, shots.length - 1) + 1}/{shots.length}
        </span>
      </div>
    </div>
  );
}
