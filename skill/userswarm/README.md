# UserSwarm (local skill)

Test your local web app with AI user personas, right inside Claude Code. UserSwarm
generates 3-5 realistic personas, drives your running app in a real browser as each
one attempting a task you specify, and writes a `userswarm-report.md` with friction
points, severity, recommendations, and screenshots.

This is the **local** product. There's also a hosted **website** version that adds
human label validation (Terac), eval-based proof of improvement (Arize), and a team
dashboard, orchestrated with Orkes/Agentspan. The local skill needs none of that —
Claude Code is the agent.

## Install

Copy this folder into a project's skills directory:

```bash
# per-project
mkdir -p .claude/skills && cp -R userswarm .claude/skills/userswarm

# or global (all your projects)
mkdir -p ~/.claude/skills && cp -R userswarm ~/.claude/skills/userswarm
```

One-time browser dependency:

```bash
pip install playwright && python -m playwright install chromium
```

## Use

1. Start your app (e.g. `npm run dev` on `http://localhost:3000`).
2. In Claude Code, run **`/userswarm`** (or "user test my app").
3. Answer the prompts: URL, what the product is, who the audience is, the task to test,
   and what success looks like.
4. Claude spins up personas, drives your app, and writes `userswarm-report.md`.

## What it does NOT do

- It does not change your app code — it produces a report.
- It does not submit irreversible actions (purchases, deletes, sends). For booking or
  checkout flows it stops at the final confirmation screen.

## Files
- `SKILL.md` — the skill definition Claude Code reads.
- `browser.py` — a persistent-browser CLI (Playwright over CDP) that Claude drives.
- Runtime state lives in `.userswarm/` in your project (gitignore it).
