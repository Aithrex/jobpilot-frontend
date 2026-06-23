# JobPilot Frontend — Agent Architecture

Codebase-aware Claude Code subagents for `jobpilot-frontend` (Vite 5 · React 18 · TypeScript · shadcn/ui · Tailwind). Each agent encodes this repo's real stack and **hard invariants**, operates at a senior bar, and knows when to hand off. Use this set when you're working **inside the frontend repo**. (The platform-wide hub that spans both repos lives in `D:\Aithrex\.claude\agents\`.)

## The roster

| Agent | Role | Writes code? | Use for |
|---|---|---|---|
| **orchestrator** | Prompt-refiner & router | No (read-only) | Vague/multi-part requests — refines intent, routes to specialists |
| **frontend-engineer** | React/TS feature builder | ✅ | Components, hooks, `lib/api.ts`, routing, tabs, data wiring |
| **uiux-designer** | Product design + design system | ✅ | Visual design, layout, tokens, shadcn, a11y, motion, responsive |
| **security-engineer** | AppSec | ✅ (surgical) | Auth/token, XSS, dep CVEs, secret leakage, OAuth, CSP |
| **performance-engineer** | Speed / "time-efficiency" | ✅ (surgical) | Bundle, code-split, render perf, caching, React Query, CWV |
| **staff-engineer** | Architect & reviewer (SDE) | No (read-only) | Design decisions, code review, monolith breakup, tech-debt |
| **qa-test-engineer** | Test strategy & authoring | ✅ | Stand up testing, write unit/component/e2e, guard refactors |
| **devops-engineer** | Build / deploy / platform | ✅ | Dockerfile, nginx, Vite build/env, CI, prod `/api` edge routing |

> No `database-engineer` or `data-scientist` here — the frontend has neither a database nor LLM calls (those are backend concerns). Use the `jobpilot-backend` set or the parent hub for those.

## How to use

- **Auto-delegation**: just describe your task; Claude Code routes to the best-matching agent via each `description`.
- **Explicit**: "Use the **uiux-designer** to polish the dashboard empty state."
- **Recommended entry point for anything fuzzy**: start with **orchestrator** — it refines the ask and returns a step plan naming which specialists to run, with ready-to-paste sub-prompts.

## Typical flows

- **New feature**: `orchestrator` → `staff-engineer` (design) → `frontend-engineer` + `uiux-designer` (build) → `qa-test-engineer` (cover) → `security-engineer`/`performance-engineer` (review).
- **"Add a workspace tab"**: `frontend-engineer` (the 6-point edit) → `uiux-designer` (the tab UI) → `qa-test-engineer` (render test).
- **"It's slow / it's broken in prod"**: `performance-engineer` / `devops-engineer`.
- **Pre-merge review**: `staff-engineer` → `security-engineer` → `performance-engineer`.

## Conventions baked into every agent

- **Permissions**: builders (`frontend-engineer`, `uiux-designer`, `qa-test-engineer`, `devops-engineer`) and surgical fixers (`security`, `performance`) can edit; **`orchestrator` and `staff-engineer` are read-only** (they plan/route/review). Tune in each file's `tools:` line.
- **Model**: every agent is `model: inherit` (follows your session model). Override per-agent if you want, e.g. `opus` for `staff-engineer`/`orchestrator`, a cheaper tier for mechanical ones.
- **Invariants enforced everywhere** (violating these breaks login or prod):
  1. **Flat auth payloads**; auth *failures* are 400/409/403/429, **never 401** (any 401 ⇒ forced logout via `auth:session-expired`); reset field is `new_password`.
  2. **`vite build` only** — no `tsc` gate; don't add new TS errors (known pre-existing ones in InterviewPrepTab, DailyPipelinePanel, `api.ts` parsed_resume are off-limits to "fix").
  3. **Long LLM work is async** — kick off → `{job_id}` → poll `apiService.pollJob`/`/resume/job/<id>`.
  4. **Freemium gating** via `useEntitlements` + quota/upgrade UI; don't double-count tailor quota.
  5. **Adding a tab to `ResumeParser.tsx` = 6 synchronized edits** (+ `MobileBottomNav.tsx`).
  6. **New `/api/<prefix>`** needs an external (Terraform) edge route or it 404s in prod.

## Editing the agents
Each file is Markdown with YAML frontmatter (`name`, `description`, `tools`, `model`) + a system prompt. Edit freely; keep `description` trigger-rich (it drives routing) and keep the invariants accurate if the codebase changes.
