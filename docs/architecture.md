# Architecture

A tour of how the JobPilot frontend is structured and how data flows.

## Stack

| Concern | Choice |
| --- | --- |
| Build / dev | Vite 5 + `@vitejs/plugin-react-swc` |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
| Routing | React Router v6 |
| Server state | TanStack Query (where used) + the `api.ts` service layer |
| Forms / validation | react-hook-form + zod |
| Animation | framer-motion |
| Notifications | sonner (toasts) |

## High-level shape

```
Public                         Authenticated
──────                         ─────────────
/                Landing
/login           Login   ┐
/register        Register┘──▶  /app   Workspace (ResumeParser)
                               │      └─ AuthGate (sign-in wall)
                               │      └─ Sidebar + feature tabs
/reset-password  Reset         /admin  Admin Portal
/applypilot/privacy  Privacy    /oauth/gmail/callback  Gmail link
```

The app is **product-first**: unauthenticated visitors get a marketing landing
and a clean auth flow; authenticated users live inside a single sidebar
workspace.

## Provider tree (`src/App.tsx`)

```
<ErrorBoundary>
  <QueryClientProvider>            # TanStack Query
    <ThemeProvider>                # light/dark, persisted
      <AuthProvider>               # JWT auth + current user
        <UnderTheHoodProvider>     # lightweight context (telemetry)
          <TooltipProvider>
            <FeedbackProvider>     # in-app feedback widget + quota bump
              <AppContent/>        # <BrowserRouter> + <Routes>
```

- **`AuthProvider`** (`src/contexts/AuthContext.tsx`) verifies the stored token on
  mount (`GET /auth/verify` → `GET /auth/profile`), exposes
  `login / register / logout / updateProfile`, and `isAuthenticated`.
- **`FeedbackProvider`** powers the floating feedback widget and the "request more
  quota" flow surfaced from the workspace.

## The workspace is one module

`src/pages/ResumeParser.tsx` (~300 KB) is the entire authenticated product. It:

- Renders the **sidebar** (`NAV_ITEMS` / `NAV_SECTIONS` / `NavTab`) and the top bar.
- Owns cross-tab state and a **keep-alive** strategy (heavy tabs like Tailor and
  Jobs stay mounted once visited so in-flight async work isn't dropped).
- Is wrapped in **`AuthGate`** (`src/components/AuthGate.tsx`), which renders an
  inline sign-in wall when logged out and the workspace when authenticated.
- Mirrors the active tab in the URL via `?tab=` so refresh/share/back work.

Feature tabs are split out as lazy-loaded components (mostly under
`src/components/resume/` and `src/components/job-search/`):

| Tab key | Component | Section |
| --- | --- | --- |
| `dashboard` | `resume/DashboardTab.tsx` | Overview |
| `tailor` | in-file `TailorTab` | Create |
| `batch` | `resume/BatchTailor.tsx` | Create |
| `my-resumes` | in-file `MyResumesTab` → `resume/ResumeDashboard.tsx` | Library |
| `tailored` | in-file `TailoredResumesTab` | Library |
| `applications` | `resume/ApplicationsTab.tsx` | Library |
| `interview` | `resume/InterviewPrepTab.tsx` | Career |
| `visa` | `visa/VisaTimelineTab.tsx` | Career |
| `copilot` | `resume/CareerCopilotTab.tsx` | Career |
| `jobs` | `resume/JobOpportunitiesTab.tsx` | Career |
| `beta` | `beta/BetaLabTab.tsx` | Experimental |
| `profile` | in-file `ProfileTab` | Account |

See [frontend-views.md](frontend-views.md) for the endpoints each tab calls.

## Data layer (`src/lib/api.ts`)

All backend access goes through a single `ApiService` instance (`apiService`).

- **Base URL:** `VITE_API_URL` locally, same-origin `/api` in the browser on prod.
- **Auth:** bearer token from `localStorage.auth_token`, attached automatically.
  A `401` triggers logout + an `auth:session-expired` event.
- **Timeouts:** per-request `AbortController` (default 15 s; AI calls pass longer
  budgets, e.g. 30–120 s).
- **Async jobs:** AI endpoints return `{ job_id }`; `api.ts` polls
  `GET /resume/job/{job_id}` (2 s interval, retries on transient errors) and
  resolves with the final result — callers just `await`.
- **Errors:** every method returns `{ data? , error? , status?, errorPayload? }`
  so callers can branch without try/catch. `429 daily_quota_exceeded` carries a
  `usage` payload used to open the quota dialog.

## Design system

- Tokens live in `src/index.css` as CSS variables (`:root` / `.dark`) and are
  exposed to Tailwind in `tailwind.config.ts`.
- Brand palette: indigo `--primary`, slate neutrals, an indigo→sky brand gradient
  (`--brand-from` / `--brand-to`), plus `--success` / `--warning`.
- Helpers: `.brand-gradient`, `.gradient-text`, `.panel`. Typography is Inter +
  Plus Jakarta Sans (display).
- **Prefer tokens** (`bg-primary`, `text-muted-foreground`, `.brand-gradient`)
  over hard-coded colors so light/dark and future re-themes stay consistent.

## Build & deploy notes

- `pnpm build` (SWC) does not typecheck — see
  [getting-started.md](getting-started.md#typechecking).
- Routes are lazy-loaded; the public landing stays light while the workspace and
  admin chunks load on demand.
- In production the SPA must fall back to `index.html` for client-side routing.
