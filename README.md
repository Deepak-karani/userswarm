# UserSwarm

**AI user-testing agents for builders, validated by real human feedback.**

A builder enters a product URL + a task. UserSwarm fans out AI **personas** that
drive the product with a browser agent, produce strict-JSON **UX reports**, then:

- **Orkes / Agentspan** orchestrates the durable multi-agent workflow,
- **Terac** collects human preference labels that calibrate the agent,
- **Arize** traces every run and evaluates report quality,

…and the agent is **improved from those labels and rerun** to prove measurable
before/after gains.

> AI user agents give instant UX feedback; Terac human labels calibrate whether
> that feedback is trustworthy; Arize proves improvement; Orkes/Agentspan
> coordinates the workflow. *Not a replacement for real user research — a way to
> make synthetic user testing trustworthy.*

---

## Mock-first, real-ready

Every sponsor integration has a **real** code path and a **mock** code path behind
one interface. Mock mode auto-enables when a credential/server is missing, so the
**entire demo runs fully offline with zero env vars**. Add a key to flip that
integration live. Persistence uses **Supabase/Postgres** via `DATABASE_URL`, with a
**SQLite fallback** when it's unset.

| Integration | Live path | Mock path (default) |
| ----------- | --------- | ------------------- |
| Anthropic LLM | `anthropic` SDK, claude-sonnet-4-6 / claude-opus-4-8 | Canned plausible JSON |
| Agentspan | Agentspan SDK against `AGENTSPAN_SERVER_URL` | In-process DAG runner (same nodes, still visible) |
| Arize | `arize-otel` + OpenInference spans + evals | Spans/evals logged locally + to console |
| Terac | Terac API annotation jobs | Synthetic human labels |

---

## Quick start (offline, no keys needed)

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium          # optional; static fallback works without it
uvicorn app.main:app --reload        # http://localhost:8000  (GET / shows mock/live modes)
```

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev                          # http://localhost:3000
```

Open **http://localhost:3000** and submit a run.

---

## Demo script (≈3 min)

1. **Submit** on `/`: a real public URL (e.g. `https://example.com`), product
   description, target audience, a task, and success criteria. → redirects to the run page.
2. **`/runs/[id]`** — watch the **Agentspan workflow timeline** advance:
   `PersonaGenerator → UXTester ×N → Aggregator → Evals`. See 3–5 personas, each
   tester's **real browser step log** (open_url / get_page_state / click / scroll) with
   screenshots, friction points, severity, recommendations, **Arize eval scores**, and
   the **Terac human-agreement** score.
3. **Annotate** → `/annotate/[id]`: act as a Terac human labeller; answer the six
   questions (usefulness, specificity, hallucination, task understanding, real-user
   agreement, A/B). Submit → the human-agreement eval updates.
4. **Run Improvement** — the `ImproverAgent` turns labels + failing evals into an
   improved prompt and reruns the workflow as an `improved` variant.
5. **Compare** → `/runs/[id]/compare`: **base vs improved** table — usefulness,
   evidence coverage, hallucination risk, human agreement, actionability pass rate,
   task-success rate, with deltas.

To show **live** mode: set `ANTHROPIC_API_KEY` (and optionally `AGENTSPAN_SERVER_URL`,
`ARIZE_API_KEY`+`ARIZE_SPACE_ID`, `TERAC_API_KEY`), restart, and rerun — real Claude
output and real spans, with mock fallback intact for any still-missing credential.

---

## Going live per sponsor

- **Agentspan / Orkes:** `pip install agentspan` → `agentspan server start` (UI at
  `http://localhost:6767`) → set `AGENTSPAN_SERVER_URL`. The same DAG nodes register/run
  on Agentspan; the dashboard timeline reflects them.
- **Arize:** set `ARIZE_API_KEY` + `ARIZE_SPACE_ID` (install `arize-otel` +
  `openinference-instrumentation`). Every run, persona-gen, UX agent, browser tool call,
  aggregation, improved-prompt gen, and rerun is traced; six evals are logged.
- **Terac:** set `TERAC_API_KEY`. Real annotation jobs are created from agent reports;
  the `terac.py` adapter has `# TODO` markers for the exact endpoint/payload — drop them in.
  The `/annotate` route already writes **real** human labels regardless of mode.

---

## Architecture

```
backend/   FastAPI · SQLAlchemy (Postgres|SQLite) · Anthropic · Playwright
  app/agents/         PersonaGenerator · UXTester · ReportCritic · Aggregator · Improver
  app/browser/        Playwright tools + safety guard (no destructive clicks; 8–12 action cap)
  app/orchestration/  WorkflowRunner (InProcess | Agentspan) + event persistence
  app/integrations/   arize.py · terac.py  (real + mock)
  app/evals/          code + LLM-judge evals, human agreement, improvement score
  app/routers/        /runs · /annotate · /runs/{id}/compare
frontend/  Next.js 14 (App Router) + TS + Tailwind
  app/                / · /runs/[id] · /runs/[id]/compare · /annotate/[id]
```

### Evals
`has_task_success` · `has_evidence` (code) · `actionability` · `hallucination_risk`
(LLM judge) · `human_agreement` (Terac) · `improvement_score` (base vs improved).

### Browser safety
Each agent is capped at 8–12 actions; purchase / payment / delete / send / invite /
destructive clicks are blocked; login-required pages with no credentials stop and
report; if automation is blocked the agent falls back to static page review.

---

## API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/runs` | Start a workflow → `{id}` |
| GET | `/runs/{id}` | Full run: status, personas, reports+steps, events, evals, aggregate |
| GET | `/runs` | Recent runs |
| POST | `/runs/{id}/improve` | Improve from labels + rerun → improved `{id}` |
| GET | `/annotate/{id}` | Payload for the Terac annotation UI |
| POST | `/annotate/{id}` | Store a human label |
| GET | `/runs/{id}/compare` | Base vs improved metrics + deltas |

Env vars: see `.env.example`.
