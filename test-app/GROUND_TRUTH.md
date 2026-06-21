# Nimbus — Ground Truth for UX Issues

Nimbus is a fictional, intentionally "mediocre but not broken" project-management
SaaS used as a **test target for automated UX-testing agents**. The linear flow
(`/` → `/signup` → `/onboarding` → `/app`) is always completable. The issues
below are deliberately seeded UX friction. Use this file to score which issues an
agent detects.

## Intended agent task

> "Create a project called 'Launch Plan', add three tasks, set one to high
> priority, and mark one complete."

**Success condition:** the `Launch Plan` project detail view (`/app/[projectId]`)
shows **3 tasks**, with **one marked complete** (strikethrough + "Done", reflected
in the `task-counter` as "1 of 3 complete") and **one set to High priority**.

- Project created + visible in dashboard list (`project-list` / `project-item`),
  opened via `project-link-<id>`.
- Task list testid: `task-list`; each item: `task-item-<id>`.
- Completed task: `task-status-<id>` reads "Done"; counter `task-counter` reflects
  "1 of 3 complete".
- High-priority task: `task-priority-<id>` reads "High".

(The earlier, simpler task — "Sign up and create your first project named
'Launch Plan'" — remains valid as a shorter smoke test.)

---

## Seeded UX issues (each is intentional)

| # | Location | Issue | Why it's friction | How to detect |
|---|----------|-------|-------------------|---------------|
| 1 | `/signup` | **Password rules hidden until error.** The requirement (min 8 chars, must include a number) is not shown upfront — it only appears as an error message after a failed submit. | Users can't form a valid password on the first try; forces a failure/retry loop. | Submit with a short/no-digit password and observe the error `signup-password-error` appears only post-submit; no helper text present before submitting. |
| 2 | `/` (landing) | **Ambiguous primary action.** The primary CTA ("Get started free") and the secondary CTA ("Sign in") have near-equal visual weight (same size, both with border + shadow). | The main intended action is not visually dominant; users hesitate. | Compare `cta-get-started` vs `cta-sign-in` — equal dimensions, comparable emphasis. |
| 3 | `/onboarding` | **Vague field label.** The workspace-name field is labeled "What should we call this?" with no placeholder, helper text, or example. | Unclear what to type; ambiguous mental model. | Inspect label for `onboarding-workspace`; note absence of placeholder/example. |
| 4 | `/app` (empty state) | **Low-contrast create trigger.** The create-first-project control is styled as a faint gray text link ("create your first project"), not an obvious button. | The single most important action on an empty dashboard is easy to miss. | `create-project-link` is a low-contrast underlined text link, not a filled button. |
| 5 | `/app` (project form) | **Mislabeled submit button.** The project-creation submit button reads "Done" instead of "Create project." | The label doesn't describe the action; ambiguous outcome. | `project-submit` button text is "Done". |
| 6 | `/onboarding` ↔ `/signup` | **No back navigation.** There is no visible way to go back from onboarding to signup. | Users who mistyped earlier info are stuck moving forward. | No back link/button rendered on `/onboarding`. |
| 7 | `/app` (success) | **Subtle success feedback.** After creating a project, it simply appears in the list — no confirmation toast, banner, or animation. | Users may not notice the action succeeded. | No toast/alert element appears after submit; only the list updates. |

---

## Seeded UX issues — Task management (`/app/[projectId]`)

These were added with the core product loop (managing tasks inside a project).
A project is opened by clicking a project in the dashboard (`project-link-<id>`),
which navigates to `/app/[projectId]`.

| # | Location | Issue | Why it's friction | How to detect |
|---|----------|-------|-------------------|---------------|
| 8 | `/app/[projectId]` (add task) | **Icon-only add button.** The control that adds a task is a "+" button with no visible text label (only an `aria-label`). | The primary action in the project view isn't self-describing visually. | `add-task-button` renders just "+" as visible content; no visible word like "Add". |
| 9 | `/app/[projectId]` (add task) | **Low-affordance priority select.** Priority is a small native `<select>` defaulting to "Medium", styled borderless/transparent with no visual cue (border, chevron, fill) that it's editable. | Users may not realize priority can be changed. | `task-priority-select` has `appearance-none`, no border, transparent background; default value "Medium". |
| 10 | `/app/[projectId]` (complete task) | **Unlabeled checkbox + silent completion.** The complete checkbox has no adjacent visible label; checking it only adds strikethrough (plus a small "Done" tag) with no toast/confirmation. | Ambiguous control; success is easy to miss. | `task-complete-checkbox-<id>` has no adjacent visible text label (only `aria-label`); on check, the title gets `line-through` and no toast appears. |
| 11 | `/app/[projectId]` (add task) | **No date-format hint.** The due-date field is a raw `<input type="date">` with no placeholder, helper text, or example format. | Users get no guidance on expected input. | `task-due-input` is a bare date input with no helper text. |
| 12 | `/app/[projectId]` (empty project) | **No first-task guidance.** Landing inside an empty project shows only a faint "No tasks here." with no instructions on what to do first. | Users aren't guided toward the add-task flow. | `task-empty-state` contains only "No tasks here."; no onboarding/CTA copy. |

---

## Notes for automation

- **Deterministic:** no randomness, no artificial loading delays. All interactive
  elements are present in the DOM immediately on render.
- **State persistence:** flow state is kept in React Context + `localStorage`
  (key `nimbus_state_v1`), so the full flow survives navigation and reloads.
- **Selectors:** every interactive element has a `data-testid`. Key ones:
  - Landing: `cta-get-started`, `cta-sign-in`
  - Signup: `signup-name`, `signup-email`, `signup-password`, `signup-submit`,
    and `signup-*-error`
  - Onboarding: `onboarding-workspace`, `onboarding-continue`, `onboarding-error`
  - Dashboard: `create-project-link` / `add-project-link`, `project-title-input`,
    `project-submit`, `project-list`, `project-item`, `project-link-<id>`,
    `all-set-heading`
  - Project detail: `add-task-input`, `task-due-input`, `task-priority-select`,
    `add-task-button`, `task-list`, `task-item-<id>`, `task-title-<id>`,
    `task-complete-checkbox-<id>`, `task-priority-<id>`, `task-status-<id>`,
    `task-counter`, `task-empty-state`, `back-to-dashboard`
- **Reset:** clear `localStorage` (or the `nimbus_state_v1` key) to restart the
  flow from an empty state.
