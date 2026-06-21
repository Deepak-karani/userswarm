---
name: userswarm
description: Test your local web app with AI user personas. Generates 3-5 realistic personas, drives your running app in a real browser as each one attempting a task you specify, and writes a UX report (friction points, severity, recommendations, screenshots) into your repo. Use when the user asks to "user test", "UX test this", "test my app as a user", "run userswarm", or invokes /userswarm.
---

# UserSwarm — local AI user testing

You run AI user personas against the builder's LOCAL running app and produce a UX
report. No backend, no signup, no extra API key — you (Claude Code) are the agent;
`browser.py` is just your hands on a real browser.

`<skill_dir>` below is the folder this SKILL.md lives in.

## Inputs (ask the user for anything missing)
- **URL** of the running app, e.g. `http://localhost:3000`
- **Product description** (one line)
- **Target audience**
- **Task** to test, e.g. "sign up and create a project"
- **Success criteria** (what counts as done)
- Optional: do-not-click rules, test login

## Setup (run once)
```bash
pip install playwright && python -m playwright install chromium   # if not already present
python <skill_dir>/browser.py start        # add --headed to watch the browser
```
`browser.py` keeps a persistent browser alive between commands and prints one JSON
observation per command: `{url,title,visible_text,buttons,inputs,errors,screenshot_path,note}`.

## Procedure
1. **Generate 3-5 distinct personas** for the audience — name, one-line description,
   traits, goals. Make them genuinely varied (e.g. impatient mobile-first user, skeptical
   power user comparing options, distracted first-timer). Do not run the same script five
   times; each persona should behave differently.

2. **For each persona, attempt the task in a fresh browser state (cap ~10 actions):**
   - `python <skill_dir>/browser.py open <url>` and read the JSON state.
   - Decide the next action AS THAT PERSONA toward the task, then run it:
     `browser.py click "<visible text>"`, `browser.py type "<label>" "<value>"`,
     `browser.py scroll down`, `browser.py state`. Re-read state after each action.
   - Pick the element that advances the TASK, not just the first button.
   - **Do NOT submit irreversible actions** (purchase, delete, send real messages). For
     booking/checkout flows, go up to the final confirmation screen and stop there —
     reaching the ready-to-submit state counts as success.
   - Stop when the task is done, the persona is genuinely stuck, or you hit ~10 actions.
   - Record: `task_success` (true only if the success criteria were literally met or the
     ready-to-submit confirmation was reached), a short step log, friction points each with
     **concrete on-page evidence**, severity (low/medium/high), recommendations, confidence (0-1).

3. `python <skill_dir>/browser.py stop`.

4. **Write `userswarm-report.md`** in the repo root:
   - The inputs (url, description, audience, task, success criteria).
   - Per persona: name, task_success, step log, friction points (with evidence),
     severity, recommendations, and links to screenshots under `.userswarm/screenshots/`.
   - An **aggregate**: a one-paragraph summary, the top friction points across personas
     ranked by severity, and the highest-impact fixes.

## Rules
- Cite concrete on-page evidence for every friction point. Never invent UI you did not observe.
- Be honest: if the app didn't load, the task was impossible, or a persona bailed, say so
  plainly — that is the valuable finding, not a failure.
- Keep each persona's run bounded (~10 actions) so the whole sweep stays fast.
- This produces a report only. Do not change the user's app code.
