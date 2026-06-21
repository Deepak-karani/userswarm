# Nimbus

A fictional, lightweight project-management SaaS demo. Nimbus is a **test target
for automated UX-testing agents** (e.g. Playwright-driven): the flow is fully
completable and deterministic, but it contains intentional, plausible UX friction.

> Looking for the list of seeded UX issues? See [`GROUND_TRUTH.md`](./GROUND_TRUTH.md).

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- 100% client-side — no backend, no real auth, no external API calls
- State persisted via React Context + `localStorage` (key `nimbus_state_v1`)

## Flow

1. `/` — Landing: hero, primary CTA "Get started free", secondary "Sign in".
2. `/signup` — Name, Email, Password with client-side validation only.
3. `/onboarding` — Single step asking for a workspace name.
4. `/app` — Dashboard: empty state → create a project → project list.
5. `/app/[projectId]` — Project detail: add tasks (title + due date + priority),
   mark tasks complete, and see a "X of Y complete" counter.

Each page is also directly reachable by URL.

### Intended agent task

> "Create a project called 'Launch Plan', add three tasks, set one to high
> priority, and mark one complete."

**Success:** the `Launch Plan` project shows **3 tasks**, with **one marked
complete** (strikethrough + "Done", and the counter reads "1 of 3 complete") and
**one set to High priority**.

A shorter smoke-test task also still applies: "Sign up and create your first
project named 'Launch Plan'."

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Deploy

Deploys to [Vercel](https://vercel.com) with zero configuration — import the repo
and deploy. No environment variables required.

## Automation notes

- Deterministic: no randomness, no artificial loading delays. All interactive
  elements exist in the DOM immediately.
- Every interactive element has a stable `data-testid`.
- To reset the flow, clear `localStorage` (or remove the `nimbus_state_v1` key).
