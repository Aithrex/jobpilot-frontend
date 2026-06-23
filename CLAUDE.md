# JobPilot Frontend

Vite 5 + React 18 + TypeScript SPA — the client for the JobPilot AI career platform. The backend is a **separate repo** (`jobpilot-backend`); this app talks to it only through `src/lib/api.ts`.

## Commands (run from this directory)
- `pnpm install` — install deps (pnpm 8.10)
- `pnpm dev` — dev server (Vite, port 5173; proxies `/api` → localhost:5000)
- `pnpm build` — **production build = `vite build` ONLY (SWC/esbuild, NO `tsc` gate)**
- `pnpm lint` — ESLint 9 (flat config)
- _No tests configured yet_ (Vitest + RTL + MSW recommended — see the `qa-test-engineer` agent).

## Hard invariants (breaking these breaks login or the build)
1. **`vite build` only — never add a `tsc` gate.** The repo HAS known pre-existing TS errors (`InterviewPrepTab`, `DailyPipelinePanel`, `api.ts` parsed_resume). **Don't fix them; just don't add new ones.**
2. **Never an auth-401 path.** Any 401 ⇒ forced logout (`auth:session-expired`). Auth failures are **400/409/403/429**; auth payloads are **flat**; reset uses **`new_password`**.
3. **All backend calls go through `apiService`** (`src/lib/api.ts`) — never raw `fetch` in components. Token = `Bearer` from localStorage `auth_token`.
4. **Long LLM work is async:** kick off → `{job_id}` → poll `apiService.pollJob` / `/api/resume/job/<id>` with loading/poll UI. Never block.
5. **Gating is mandatory:** handle 403 `upgrade_required` & 429/quota via `useEntitlements` + `LockBadge`/`QuotaMeter`/`UpgradeModalProvider`/`QuotaLimitDialog`. Don't double-count tailor quota.
6. **Adding a workspace tab to `src/pages/ResumeParser.tsx` = 6 synchronized edits:** NavTab union · `lazy()` import · NAV_ITEMS · NAV_SECTIONS · VALID_NAV_TABS · render switch — **plus** `components/layout/MobileBottomNav.tsx`. Growth features → the "Grow" section.
7. **`VITE_*` env vars are compiled into the public bundle** — **no secrets** there (only publishable values like the Datadog *client* token). New `/api/<prefix>` needs an external (Terraform) edge route or it 404s in prod.

## Stack
React 18.3 · Vite 5.4 (`plugin-react-swc`) · TS 5.5 (`strict`, `noImplicitAny:false`) · Tailwind 3.4 + **shadcn/ui** (Radix, pink base) · framer-motion 12 · **@tanstack/react-query 5.56** (configured but underused — prefer adopting for new data) · react-router-dom 6.26 · react-hook-form 7.53 + zod 3.23 · sonner · next-themes · lucide-react. Path alias `@/` → `src/`.

## Key files
- `src/main.tsx` (entry) · `src/App.tsx` (routes + providers, lazy + Suspense)
- **`src/lib/api.ts`** — the API layer (singleton `apiService`, fetch, token, 401-handling, `pollJob`)
- `src/contexts/AuthContext.tsx` — auth state
- `src/pages/ResumeParser.tsx` — workspace **MONOLITH** (~1000+ lines) · `src/components/AuthGate.tsx` — auth UI **MONOLITH** (~1400+ lines) → edit surgically
- `src/components/ui/*` (shadcn primitives — don't hand-roll) · `src/hooks/*` (`useJobSearch`, `useEntitlements`, `useDailyUsage`) · `src/lib/utils.ts` (`cn()`) · `src/types/*`

## Conventions
PascalCase component files; typed props interface; `@/` imports; `cn()` for conditional classes; compose shadcn `ui/*`; `sonner` for transient feedback. **Design tokens** in `src/index.css` (semantic HSL, light + dark) — never raw hex. Verify visual changes in **both themes + mobile**. Handle loading/empty/error for every async surface.

## Deploy
2-stage `Dockerfile` (Node 22 build → `nginx:alpine`). `nginx/default.conf` = SPA fallback (`try_files`) + security headers + gzip. Prod uses same-origin `/api` (CloudFront).

## Agents
`.claude/agents/` holds a scoped subagent suite (`orchestrator`, `frontend-engineer`, `uiux-designer`, `security-engineer`, `performance-engineer`, `staff-engineer`, `qa-test-engineer`, `devops-engineer`). Start with **`orchestrator`** for fuzzy asks; see `.claude/agents/README.md`.
