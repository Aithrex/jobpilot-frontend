# JobPilot Frontend

Vite 5 + React 18 + TypeScript SPA — the client for the **Aspirely** AI career platform (`jobpilot` is the repo/internal name; *Aspirely* is the shipped brand — use it in all user-facing copy). The backend is a **separate repo** (`jobpilot-backend`); this app talks to it only through `src/lib/api.ts`.

## Commands (run from this directory)
- `pnpm install` — install deps (pnpm 8.10)
- `pnpm dev` — dev server (Vite, port 5173; proxies `/api` → localhost:5000)
- `pnpm build` — **production build = `vite build` ONLY (SWC/esbuild, NO `tsc` gate)**
- `pnpm test` — Vitest (jsdom + RTL + jest-dom). `pnpm test:watch` to iterate. Single file: `pnpm test src/path/to.test.tsx`
- `pnpm lint` — ESLint 9 (flat config) · `pnpm format` — Prettier
- `pnpm copy:check` — ASCII copy sweep (guards smart quotes / non-ASCII in UI copy)
- `node scripts/verify.mjs --fast` — Vitest only (change-focused)
- `node scripts/verify.mjs --full` — **CI-equivalent**: frozen install + test + production build. Same command as `.github/workflows/tests.yml` and the optional pre-push hook. `pnpm copy:check` / `pnpm lint` remain recommended local checks (the tree has pre-existing findings).
- `node scripts/install-pre-push-hook.mjs` — repository-local pre-push hook (does not change global Git config). CI remains authoritative.

## Hard invariants (breaking these breaks login or the build)
1. **`vite build` only — never add a `tsc` gate.** The repo HAS known pre-existing TS errors. **Don't fix them; just don't add new ones.**
2. **Never an auth-401 path.** Any 401 ⇒ forced logout (`auth:session-expired`). Auth failures are **400/409/403/429**; auth payloads are **flat**; reset uses **`new_password`**.
3. **All backend calls go through `apiService`** (`src/lib/api.ts`, ~3.6k lines) — never raw `fetch` in components. Token = `Bearer` from localStorage `auth_token`.
4. **Long LLM work is async:** kick off → `{job_id}` → poll `apiService.pollJob` / `/api/resume/job/<id>` with loading/poll UI. Never block.
5. **Gating is mandatory:** handle 403 `upgrade_required` & 429/quota via `useEntitlements` + `LockBadge`/`QuotaMeter`/`UpgradeModalProvider`/`QuotaLimitDialog`. Don't double-count tailor quota.
6. **Navigation has ONE source of truth — `src/app-shell/nav.config.ts`.** Adding a destination is **2 edits**: a `NavSection` in `nav.config.ts` + a nested `<Route>` (with `lazy()` import) under the right parent in `src/App.tsx`. `Sidebar`, `TopBar`, `MobileNav`, `MoreSheet`, `DestinationNav` and the ⌘K `CommandPalette` **import `nav.config.ts` directly**; `SubNav` is presentational and is handed its sections by the destination page. So one `NavSection` entry lights the feature up in the sidebar, mobile nav, More sheet and palette at once — never hard-code a nav entry anywhere else, or the feature becomes reachable only by landing on its parent page.
7. **`VITE_*` env vars are compiled into the public bundle** — **no secrets** there (only publishable values like the Datadog *client* token). New `/api/<prefix>` needs a matching Terraform edge route (backend repo) or it 404s in prod.

## Routing / shell model
The authenticated product is a **route tree mounted at `/app`** (`SHELL_BASENAME`), not a tab monolith. Five primary destinations — **home · jobs · resume · apply · grow** — plus `settings`, each a layout page with nested sections:

```
/app/home                      TodayPage (daily briefing + launchpad)
/app/jobs/{for-you,portals}    DiscoverPage
/app/resume/{tailor,batch,library,tailored,six-seconds,voice}   CraftPage
/app/apply/{tracker,auto-apply,inbox,pipeline}                  ApplicationsPage
/app/grow/{learning,interview,copilot,network,events}           GrowPage
/app/settings/{profile,visa,mailbox,employer-logins,integrations,autonomy,billing,notifications,beta}
```

`AppShell` gates on `AuthContext` (loader while verifying → `/login` with `state.from` for deep-link bounce-back). `WorkspaceProviders` (upgrade modal + feedback + combined-jobs) is a **pathless layout route around the workspace only** — do not hoist it to the App root, it drags billing/jobs code into the eager landing chunk. `/` is the public landing and runs the full **guest flow** (upload → up to 5 matches → one tailored résumé → signup gate).

**Legacy URLs redirect, don't re-add them:** the classic `?tab=` workspace (`ResumeParser.tsx`) and the `/next/*` strangler are both **retired** — `ClassicWorkspaceRedirect` / `LegacyNextRedirect` map old links onto `/app/*`.

## Stack
React 18.3 · Vite 5.4 (`plugin-react-swc`) · TS 5.5 (`strict`, `noImplicitAny:false`) · Tailwind 3.4 + **shadcn/ui** (Radix, pink base) · framer-motion 12 · **@tanstack/react-query 5.56** (configured but underused — prefer adopting for new data) · react-router-dom 6.26 · react-hook-form 7.53 + zod 3.23 · sonner · next-themes · lucide-react · cmdk (palette) · recharts · Vitest 2 + RTL + jsdom. Path alias `@/` → `src/`.

## Key files
- `src/main.tsx` (entry) · `src/App.tsx` (**the route table** — every destination is registered here, lazy + Suspense)
- **`src/app-shell/`** — the shell: `nav.config.ts` (IA source of truth), `AppShell.tsx`, `TopBar`/`Sidebar`/`MobileNav`/`SubNav`/`MoreSheet`/`CommandPalette`, `pages/*` (destination layouts), `settings/*`
- **`src/lib/api.ts`** — the API layer (singleton `apiService`, fetch, token, 401-handling, `pollJob`)
- `src/contexts/AuthContext.tsx` — auth state
- `src/components/` — feature tabs mounted as sections (`resume/`, `job-search/`, `autoSubmit/`, `hub/`, `mailbox/`, `billing/`, `visa/`, `beta/`, `onboarding/`, `guest/`, `landing/`)
- `src/pages/AdminPortal.tsx` — the remaining large page (~2k lines) → edit surgically
- `src/components/ui/*` (shadcn primitives — don't hand-roll) · `src/hooks/*` (`useJobSearch`, `useEntitlements`, `useDailyUsage`) · `src/lib/utils.ts` (`cn()`) · `src/types/*`
- `extension/` — the browser extension (Workday/Ashby/Greenhouse form-fill; own `manifest.json` + `package.sh`)

## Conventions
PascalCase component files; typed props interface; `@/` imports; `cn()` for conditional classes; compose shadcn `ui/*`; `sonner` for transient feedback. **Design tokens** in `src/index.css` (semantic HSL, light + dark) — never raw hex. Verify visual changes in **both themes + mobile**. Handle loading/empty/error for every async surface. Keep UI copy ASCII (`pnpm copy:check`).

## The unified tech feed (flagged)

Mounted at `/portals` (`src/components/resume/CareerPortalsTab.tsx`) behind a
flag, replacing the three legacy panels when on. **Off by default.**

- flag: `localStorage['aspirely.techFeed.enabled']` beats build-time
  `VITE_TECH_FEED`; `?techfeed=1` / `?techfeed=0` writes the localStorage key,
  so a staged rollout is a LINK, not a rebuild (`src/lib/techFeedFlag.ts`).
- components: `src/components/job-search/tech-feed/*` — `TechFeedPanel`,
  `TechFeedFilters` (occupation filters are the primary rail; employer-category
  filters live in the advanced group — the two axes are deliberately separate),
  `TechFeedFacets`, `TechFeedJobCard`, `NotInterestedMenu`.
- state: filters are URL-owned (`src/lib/techFeedUrlState.ts`, `|` separated —
  not `,`, because "Austin, TX").
- **`src/lib/techFeedJobAdapter.ts` is the ONE bridge** from `TechFeedJob` to
  the legacy `Job` the five flows take. It must never invent a value: an
  unpublished salary, an unknown work mode and an undated posting are OMITTED,
  not defaulted, so the tracker receives "we do not know".
- the five flows are the EXISTING ones — `useJobSearch().saveJob/unsaveJob/
  quickApply/beginApplyWithTailor/autoApply` plus `ApplyConfirmDialog` — wired
  through, never reimplemented.
- suppression is CROSS-DEVICE via `POST/DELETE/GET /api/jobs/tech-feed/feedback`
  (`src/lib/techFeedNotInterested.ts`); localStorage is an optimistic cache
  that reconciles from the server on mount. Only `not_interested`,
  `irrelevant_role` and `duplicate` hide a job — `wrong_company`, `stale_job`
  and `incorrect_metadata` are DATA-QUALITY REPORTS and the copy must not
  promise the job will disappear.
- **the company filter takes NAMES, not ids**
  (`tech-feed/CompanyAutocomplete.tsx` -> `GET /api/jobs/tech-feed/companies`).
  It used to be a free-text chips input whose values were whichever slug the
  catalog handed the UI: a user typing "Stripe" had no way to reach
  `emp_fd96667721fe`, and a saved filter rendered as hex forever. Ids handed
  in on mount are resolved back to names (`?ids=`), which also follows an
  acquisition. A LEGACY value (a bare ATS tenant) is kept and flagged, never
  dropped - silently widening a filter is the failure mode a filter must not
  have. The Workday catalog fan-out that used to back the suggestion chips is
  gone with it.
- **company categories come from the canonical facet with counts**
  (`CompanyCategoryPicker.tsx`). The old chips input accepted any string;
  anything outside the registry vocabulary matched nothing, silently, and
  rendered as an applied filter. `other` is shown LAST and labelled "Not yet
  categorised" rather than hidden, or the counts stop adding up.
- **"Technology companies only" is a POSITIVE filter and says what it costs.**
  It keeps the employers the registry holds technology evidence for - the same
  rule that builds the coverage denominator - so the toggle and the coverage
  report admit the same set by construction. The server reports
  `employer_scope_dropped_non_tech` and `employer_scope_dropped_unclassified`
  separately, and the second is offered back as a one-click broadening,
  because "they are not a technology company" and "we do not know whether they
  are" are different answers and only one of them is our gap.
- **saved searches are SERVER-owned with a local mirror**
  (`useSavedTechFeedSearches`, `/api/jobs/tech-feed/saved-searches`).
  localStorage alone is a cache with no origin: clearing site data, a private
  window or a new laptop lost every saved search silently. The client renders
  local first, reconciles once on mount, writes through, and marks a write
  that did not land `pendingSync`. Reconcile NEVER deletes - a search this
  browser lacks is one saved on another device.
- **telemetry carries no identity by construction**
  (`src/lib/techFeedTelemetry.ts` -> `POST /api/jobs/tech-feed/telemetry`).
  Filter KEYS, bucketed result counts and vendor slugs; never a filter value,
  a query string or a job id. Batched on a 4s window and flushed on
  `pagehide`; every path is `void`-returning, because telemetry that can fail
  a user action is worse than no telemetry.
  `search` carries the filters a search RAN with; `filter_applied` carries
  only the keys the user just turned ON, and the first observation of a
  filter set is skipped because it IS the URL/saved-search restore, not a
  choice. Counting adoption off `search` counts every restore as an adoption.
- the health banner renders the MEASURED coverage - the technology-employer
  denominator, what share is covered, career sources covered, ownership-
  verified-but-unvalidated sources, Tier-A, by cohort and category - and
  ALWAYS with its age. The numbers come from a stored snapshot
  (`coverage_snapshots`), so a figure with no age could be a week old and look
  current; `available: false` renders as "unknown", which is not zero.
- the card reads `eligibility` / `ineligible_reasons` / `role_alignment` /
  `hard_requirements` (`src/lib/techFeedEligibility.ts`). An `ineligible` card
  shows NO score and NO band; a hard requirement ("requires an active security
  clearance") renders as a requirement to check, never as a penalty.

## Deploy
Prod runs on the Oracle box behind Cloudflare, same-origin with `/api`. CI (`.github/workflows/deploy.yml`) builds after tests pass and publishes `dist/` to the `deploy/web` branch; the box copies new assets first and swaps `index.html` last, so there is no downtime. Runbook: `infra/compose/README.md` in `jobpilot-backend`. The `Dockerfile` and `nginx/default.conf` here are not used in production.

## Docs
**Start at [`docs/README.md`](docs/README.md)** — getting started, architecture,
the API reference, view→endpoint map, and `design/` (the live token
[system map](docs/design/system-map.md), token decisions, the landing brief,
and `design/archive/` for superseded direction docs kept only for history).
`extension/`, `infra/` and `public/media/` keep their own READMEs beside the
code they describe.

## Agents & skills
`.claude/agents/` holds a scoped subagent suite (`orchestrator`, `frontend-engineer`, `uiux-designer`, `security-engineer`, `performance-engineer`, `staff-engineer`, `qa-test-engineer`, `devops-engineer`). Start with **`orchestrator`** for fuzzy asks; see `.claude/agents/README.md`. `.claude/skills/` adds `page-cro`, `react-state-management`, `typescript-advanced-types`.

## Agent verification (required)

While implementing: `node scripts/verify.mjs --fast`.
Before declaring ready: `node scripts/verify.mjs --full` when frontend
files or shared contracts changed. Fix regressions this change caused.
A later edit that affects checked behavior invalidates an earlier green
run — rerun. Report exact commands and results. Never claim “all tests
pass” from a subset. Never skip, weaken, or suppress checks to obtain a
green result. See [`docs/verification.md`](docs/verification.md).
