# Plan: Make the swarm replicate real users (revised after CEO review)

## Framing (revised)
Lead with **trustworthy, prioritized friction a founder can act on before launch.**
Realism is *supporting evidence* that the friction is believable, not the headline.
Founders buy "here's the painful moment and the fix," not "our agents fail like humans."

## Decision log (from /autoplan Phase 1 — premise gate)
- Resequence: **F2 first**, F1 second (reframed), F3 third.
- **F1 is deterministic, not stochastic.** No random give-up. Annotate "a low-patience
  user would abandon here because X" on a run that still completes the flow. Same insight,
  reproducible, no coverage loss. (Stochastic imperfection rejected: trust-eroding
  non-determinism reads worse in a demo than a clean annotation.)
- **Keep F3** despite the review's "cut it": the human-likeness score is the Terac + Arize
  prize story. Honesty rule: label it "mock-calibrated, real-ready" until real Terac labels
  exist. Real moat = the Terac calibration loop, so wire it real-ready, not faked-deeper.

## Build order

### F2 (first). Painful moment + voice-of-customer quotes + replay
- Each friction point carries a first-person quote ("I couldn't tell what 'Go' does").
- Stitch the per-step screenshots we already save into a scrubbable per-persona replay
  (client-side image sequence; no video encoding).
- Files: `backend/app/agents/ux_tester.py` (quote per friction in the report),
  `backend/app/schemas.py` (optional `quote` on friction), frontend
  `components/FrictionList.tsx`, new `components/SessionReplay.tsx`, `StepLog.tsx`.
- Risk: quotes must be grounded in observed UI (reuse the existing "cite on-page evidence"
  rule) or they become hallucinated flavor text.

### F1 (second). Deterministic human-failure annotations
- Persona traits become *behavioral lenses* the agent reasons through, not dice:
  patience, skim-vs-read, tech-savviness. Output: `would_abandon_here` markers +
  `confusion_events` (count), on a run that still attempts the whole flow.
- Files: `backend/app/agents/persona_generator.py` (structured traits),
  `backend/app/agents/ux_tester.py` (`_agentic_test`/`_synthesize_report` lens prompt),
  `backend/app/schemas.py` (annotation fields).
- Risk: keep it diagnostic. Never let a trait *change which actions run* (that reintroduces
  non-determinism); it only changes what gets *flagged*.

### F3 (third). Human-likeness score, real-ready (mock-labeled for now)
- From Terac labels: "do agents fail where humans fail." Surface as a score, trend via Arize.
- Files: `backend/app/evals/agreement.py`, `backend/app/evals/runner.py`,
  `backend/app/integrations/arize.py`, compare/run frontend.
- Honesty: UI badge "calibrated on N human labels (mock)" until real labels land. The
  `terac.py` real path already exists; the moat is making one real label loop work.

## Backlog (deferred, with rationale now)
- 5-second first-impression test (strong, bounded, reproducible — promote if F1 slips).
- Funnel drop-off + friction→conversion-impact estimate (the ROI-proof a founder pays for).
- CI / pre-deploy UX gate via the local `/userswarm` skill (the distribution/habit play).
- Device/context constraints (mobile, 3G, a11y); A/B variants; multi-session journeys;
  competitor benchmark.

## Confirmed premises
- Deliverable = painful moment + fix (P3). Build on existing pipeline (P4).
- Realism is supporting evidence, not the wedge (P1 revised). Calibration is real-ready,
  not claimed-real (P2 corrected).

## Open questions to resolve during build
- Replay: client image sequence (chosen, cheap) vs video (deferred).
- How many real Terac labels make the human-likeness score non-vanity? (gate F3's "real" badge).
