# UserSwarm — Pitch Script (Sponsor-tuned: **Orkes ▸ Arize ▸ Terac**)

> Engineered against the **AI Hackathon 2026** rubric (Application · Functionality/Quality ·
> Creativity · Technical Complexity · **Ethical Considerations** · **Brainstorming & Process**)
> **and** weighted toward the sponsor tracks in priority order: **Orkes first, then Arize, then
> Terac.** Format: science-fair table, **~3 min pitch + 2 min Q&A**, judged ≥2×.
>
> **Spine of the story:** *Orkes Conductor is what makes a swarm of AI users actually work* —
> it's the durable runtime that coordinates persona-generation, a parallel fan-out of browser
> testers, aggregation, and evals as one observable, fault-tolerant workflow. Arize proves the
> output is trustworthy; Terac calibrates it against humans.

---

## 0. One-liner (memorize this)

**"UserSwarm releases a swarm of distinct AI users on your product and watches where they hit
friction in a real browser — all coordinated as one durable **Orkes** workflow, scored live in
**Arize**, and calibrated against human labels from **Terac** so the feedback is provably
trustworthy."**

Orkes-forward variant (lead with this at the Orkes table):
> **"We turned 'a swarm of AI users testing your product' from a script into a real orchestrated
> system — Orkes Conductor runs the whole multi-agent workflow durably and observably, so it
> survives failures, fans out testers in parallel, and you can watch every node execute."**

---

## 1. The 3-minute pitch (timed)

Have the app open at `http://localhost:3000` with a finished Nimbus run ready, **Overview tab
showing the Workflow Status timeline**.

### [0:00–0:30] Hook + problem
> "Every team ships UX they think is fine. Real user testing catches the friction — but it's slow
> and expensive. AI can give instant feedback, but two problems: why would you trust it, and how
> do you run a whole *swarm* of AI users reliably instead of a flaky script? UserSwarm solves
> both — and the reliability half is pure Orkes."

### [0:30–1:00] What it does
> "You give it a URL, what the product is, and who it's for. It generates a **swarm of distinct
> personas** — different patience, tech-savviness, disposition — and each one drives a **real
> headless browser** like an actual user. No test scripts."

### [1:00–1:50] Demo — LEAD WITH ORKES (point at the Workflow Status timeline)
> "This is the workflow, and it's a real **Orkes Conductor** orchestration — not a for-loop.
> See these engine badges? **Persona generation and aggregation run as durable Orkes agents**;
> the browser testers fan out in **parallel**, each in its own isolated session. Orkes
> coordinates the whole DAG — persona-gen → parallel testers → aggregate → evals — as one
> observable workflow. If a node fails, it surfaces as a real workflow error instead of silently
> faking a result. That's what makes 'a swarm' actually dependable."

Then the results (Results tab):
> "Each AI user took ~30 real browser actions — replayable screenshots. They *disagree* like real
> users: this impatient one abandoned, this careful one pushed through, each with a
> voice-of-customer quote."

### [1:50–2:30] Trust layer — Arize then Terac
> "Top-right, these chips are live, not mocked — Claude, **Orkes**, **Arize**. And here's the
> trust part: **Arize traces every run and every LLM call**, and scores each report for
> **hallucination risk** and **evidence grounding** — eval-driven, not vibes. Then **Terac**
> human labels calibrate whether the AI agrees with real people — 87% agreement here. So you get
> a *trust score* on the feedback, not just more AI opinions."

### [2:30–3:00] Payoff + close
> "And it closes the loop: feed the human labels and failed evals back, improve the agent, rerun,
> and Arize shows a measurable before/after. Fast like AI, reliable because of Orkes, trustworthy
> because of Arize and Terac — and honest that it complements real research, not replaces it.
> That's UserSwarm."

---

## 2. Sponsor track strategy (priority: **Orkes ▸ Arize ▸ Terac**)

### 🥇 ORKES — make this the centerpiece
**What they're judging:** meaningful use of Conductor for **durable, observable, multi-agent
orchestration** — not a thin API call.

**Land these lines:**
- "The entire swarm is an **Orkes Conductor workflow**: persona-gen → **parallel** UX-tester
  fan-out → aggregation → evals, as one DAG."
- "Reasoning agents run on the **Orkes durable runtime** (`AGENTSPAN_SERVER_URL`), so execution
  is **durable and observable** — every node's status streams into our timeline live."
- "We made a **deliberate orchestration boundary**: tool-less reasoning agents run on Orkes
  workers; the live-browser testers run in-process because a Playwright session can't be shared
  across workers. We can defend that trade-off."
- "**No silent fallback** — if Orkes can't complete a node, the run raises a real error. We chose
  correctness/observability over hiding failures." *(This is a strong Orkes-philosophy point.)*

**Show:** the **Workflow Status timeline** with the **Orkes engine badges**, and call out the
parallel tester fan-out.

**Orkes Q&A:**
- *"How are you using Conductor specifically?"* → "Each reasoning agent is an Orkes agent/worker;
  the run is a workflow with a parallel fan-out stage and a join before aggregation. Status is
  observable per node."
- *"What happens on failure?"* → "It surfaces as a workflow error, not a fake success — durability
  and honesty over silent degradation."
- *"Why Orkes and not just asyncio?"* → "Durability and observability. A swarm that re-runs on
  every deploy needs retriable, inspectable execution — that's orchestration, not a loop."

### 🥈 ARIZE — the trust/observability proof
**What they're judging:** real **tracing + evals** driving the product, not a logging afterthought.

**Land these lines:**
- "**Arize traces every run and auto-instruments every Anthropic call** via OpenInference — full
  LLM observability out of the box."
- "We run **LLM-judge evals** (actionability, hallucination risk, evidence grounding) plus a
  **human-agreement** eval, logged to Arize as scored spans."
- "Evals aren't decoration — they **gate the improve-and-rerun loop** and prove measurable
  before/after gains."

**Show:** the **Arize evals** grid (scores + explanations) and the trust chips.

**Arize Q&A:** *"What do you trace?"* → "Every workflow span and every LLM request, with eval
scores as span attributes, exported over OTLP to Arize AX."

### 🥉 TERAC — human-in-the-loop calibration
**What they're judging:** real **human feedback** improving/validating the AI.

**Land these lines:**
- "**Terac collects human labels** on the AI reports — useful-to-builder, specific-vs-vague,
  hallucinated, would-a-real-user-agree."
- "Those labels power our **human-agreement eval** — the number that tells you whether to trust
  the swarm — and feed the **improve** step."

**Honesty note:** in the demo, Terac runs on **synthetic labels** (no live key), so present it as
*"the human-calibration layer, wired and computing agreement — swap in a Terac key and it's live."*
Don't claim it's live when the chip says mock.

---

## 3. Rubric map — one line per official category

| Category | What to say / show |
|---|---|
| **Application** | "Any team with a web product — pre-launch UX QA in minutes, not a week of recruiting." |
| **Functionality/Quality** | Live run end-to-end, no crashes; live/mock chips prove real integrations; clean results UI. |
| **Creativity** | "Everyone builds AI that *generates*. We built an **orchestrated, human-calibrated** swarm — the novelty is reliability + trust, not the agents." |
| **Technical Complexity** | "Multi-agent DAG on the **Orkes durable runtime**, real Playwright automation with safety guardrails, **LLM-judge + human-agreement evals**, live OpenTelemetry tracing into Arize." |
| **Ethical Considerations** | §4 — privacy + honesty + auditability. |
| **Brainstorming & Process** | §5 — beats the "AI wrapper" critique. |

---

## 4. Ethical Considerations (NEW category)

- **Privacy by construction.** Tests *your own* product with *synthetic* personas — no scraping
  real users, no PII.
- **Honesty about limits.** The product says it: *"not a replacement for real user research."*
- **Trust, not blind automation.** Hallucination-risk + evidence-grounding evals (Arize) flag
  ungrounded claims; Terac human calibration checks the AI against people before you act.
- **Safety guardrails.** Agents honor **do-not-click rules** (no delete-account / submit-payment
  on live sites).
- **Transparency/auditability.** Every action is an **Orkes workflow node + Arize span +
  screenshot** — fully auditable, not a black box.

---

## 5. Brainstorming & Process (NEW category — strongest differentiator)

> Judges said it: *"not 100% vibe-coded apps or AI wrappers — show thought process and iteration."*

- **The core insight.** Not "make AI testers" — instead: *AI UX feedback is cheap but
  untrustworthy and hard to run reliably — fix both.* Orkes answers reliability; Arize+Terac
  answer trust.
- **A deliberate architecture decision.** The Orkes/in-process boundary (reasoning on Orkes
  workers, live browser in-process) was a reasoned trade-off, not an accident.
- **Real iteration we can show.** We caught the system **lying to itself** — agents reporting
  "field is broken" when our tooling just couldn't find unlabeled fields, and parallel testers
  overwriting each other's screenshots. We **diagnosed it from the Arize traces**, hardened the
  browser tooling (fuzzy field-matching, destructive-click guards, surfacing typed values), and
  re-ran to verify the false friction disappeared. That loop *is* the iterative process.
- **The product embodies iteration.** Improve-and-rerun = observe → label → improve → re-measure.

---

## 6. General Q&A (the 2 minutes after)

**"Isn't this just an AI wrapper?"**
> "The agents are the easy part. The contribution is the system around them: **Orkes** makes the
> swarm a durable, observable workflow; **Arize** evals + **Terac** human labels make the output
> provably trustworthy; and an improve-and-rerun loop closes it."

**"Can you trust AI user feedback?"**
> "Not blindly — that's the point. We quantify it: 87% human agreement here, low-grounding reports
> flagged. You see the trust score, not just the opinion."

**"What's real vs mocked?"**
> "Claude, Orkes, and Arize are live — the chips poll the backend and would show 'mock' otherwise.
> Terac uses synthetic labels in the demo; it's wired to go live with a key."

**"What's next?"**
> "A `select_option` browser tool so agents complete every flow, a regression mode that re-runs the
> swarm on each deploy as an Orkes-scheduled workflow, and a CI gate that fails a PR when friction
> spikes."

---

## 7. Pre-judging checklist

- [ ] Backend (`:8000`), frontend (`:3000`), Nimbus test app (`:3100`) all running.
- [ ] A **finished** run open on the **Overview tab** (Workflow timeline visible) — don't demo cold.
- [ ] Header chips showing **Claude · Orkes · Arize** live.
- [ ] At the **Orkes** table: open with the Orkes-forward one-liner (§0) and point at the timeline first.
- [ ] Devpost submitted as draft **before 11 AM**; **Orkes, Arize, Terac** sponsor tracks all selected.
- [ ] Whole team at the table; judges come to you.
