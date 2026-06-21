export default function PitchFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm leading-relaxed text-slate-500">
          <span className="font-medium text-slate-700">UserSwarm.</span> AI user
          agents give instant UX feedback; human labels calibrate whether that
          feedback is trustworthy; Arize proves improvement; Orkes/Agentspan
          coordinates the workflow.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Not a replacement for real user research — a fast, calibrated signal
          to act on between studies.
        </p>
      </div>
    </footer>
  );
}
