export default function PitchFooter() {
  return (
    <footer className="mt-16 border-t border-ink-line">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm leading-relaxed text-fog-muted">
          <span className="font-display font-semibold text-fog">UserSwarm.</span>{" "}
          AI user agents give instant UX feedback; human labels calibrate whether
          that feedback is trustworthy; Arize proves improvement; Orkes/Agentspan
          coordinates the workflow.
        </p>
        <p className="mt-2 font-mono text-xs text-fog-faint">
          Not a replacement for real user research — a fast, calibrated signal to
          act on between studies.
        </p>
      </div>
    </footer>
  );
}
