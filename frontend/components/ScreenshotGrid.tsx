import { StepLogItem, staticUrl } from "@/lib/api";

export default function ScreenshotGrid({ steps }: { steps: StepLogItem[] }) {
  const shots = (steps || [])
    .map((s) => ({ url: staticUrl(s.screenshot_path), step: s }))
    .filter((s) => s.url);

  if (!shots.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {shots.map((s, i) => (
        <a
          key={i}
          href={s.url!}
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden rounded-lg border border-ink-line bg-ink-900/60 transition hover:border-cool/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cool/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.url!}
            alt={`Step ${s.step.index} screenshot`}
            className="h-32 w-full object-cover object-top transition group-hover:opacity-90"
          />
          <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fog-faint">
            #{s.step.index} {s.step.tool}
          </div>
        </a>
      ))}
    </div>
  );
}
