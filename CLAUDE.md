# JobPilot Frontend

Vite 5 + React 18 + TypeScript SPA — the client for the **Aspirely** AI career platform (`jobpilot` is the repo/internal name; *Aspirely* is the shipped brand — use it in all user-facing copy). The backend is a **separate repo** (`jobpilot-backend`); this app talks to it only through `src/lib/api.ts`.

## Commands (run from this directory)
- `pnpm install` — install deps (pnpm 8.10)
- `pnpm dev` — dev server (Vite, port 5173; proxies `/api` → localhost:5000)
- `pnpm build` — **production build = `vite build` ONLY (SWC/esbuild, NO `tsc` gate)**
- `pnpm test` — Vitest (jsdom + RTL + jest-dom). `pnpm test:watch` to iterate. Single file: `pnpm test src/path/to.test.tsx`
- `pnpm lint` — ESLint 9 (flat config) · `pnpm format` — Prettier
- `pnpm copy:check` — ASCII copy sweep (guards smart quotes / non-ASCII in UI copy)

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

## Deploy
2-stage `Dockerfile` (Node 22 build → `nginx:alpine`). `nginx/default.conf` = SPA fallback (`try_files`) + security headers + gzip. Prod uses same-origin `/api` (CloudFront). CI: `.github/workflows/deploy.yml`.

## Agents & skills
`.claude/agents/` holds a scoped subagent suite (`orchestrator`, `frontend-engineer`, `uiux-designer`, `security-engineer`, `performance-engineer`, `staff-engineer`, `qa-test-engineer`, `devops-engineer`). Start with **`orchestrator`** for fuzzy asks; see `.claude/agents/README.md`. `.claude/skills/` adds `page-cro`, `react-state-management`, `typescript-advanced-types`.
