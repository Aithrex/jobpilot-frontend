# JobPilot — Frontend

> Your job-hunt, turned into a productive workspace.
> Read the market, find opportunities fast, tailor your resume accurately to
> every job description, track applications, and prep for interviews — all in
> one focused workspace. Part of the [Aithrex](https://aithrex.tech) suite.

JobPilot is a **product-first** React app. The public landing page leads into a
clean sign-in, and the authenticated experience is a Linear/Notion-style sidebar
**workspace** (`/app`). The UI is built on Vite + React 18 + TypeScript +
Tailwind + shadcn/ui, and talks to the `jobpilot-backend` over a single,
well-organized API layer (`src/lib/api.ts`).

---

## Quick start (local)

```bash
# 1. Install dependencies
pnpm install                 # (npm install also works)

# 2. Point the app at your local backend
#    .env.local already ships with VITE_API_URL=http://localhost:5000/api
#    (copy .env.example if it's missing)

# 3. Start the dev server
pnpm dev                     # → http://localhost:5173
```

You also need the **backend running on `http://localhost:5000`**. The frontend
is wired to it via `VITE_API_URL`, and `vite.config.ts` proxies `/api` →
`localhost:5000` as a fallback. Until the backend is up, the UI loads and is
fully navigable, but data calls (login, jobs, tailoring) will fail.

See **[docs/getting-started.md](docs/getting-started.md)** for the full setup,
environment variables, and troubleshooting.

### Scripts

| Command        | What it does                                  |
| -------------- | --------------------------------------------- |
| `pnpm dev`     | Start the Vite dev server on `:5173`          |
| `pnpm build`   | Production build to `dist/` (SWC, no typecheck) |
| `pnpm preview` | Serve the production build locally            |
| `pnpm lint`    | ESLint over `src/`                            |

---

## Routes

| Path                     | View                | Auth | Purpose                                  |
| ------------------------ | ------------------- | ---- | ---------------------------------------- |
| `/`                      | Landing             | —    | Marketing / product pitch                |
| `/login`                 | Login               | —    | Sign in → `/app`                         |
| `/register`              | Register            | —    | Create account → `/app`                  |
| `/app`                   | Workspace           | ✅   | The product (sidebar + feature tabs)     |
| `/admin`                 | Admin Portal        | ✅   | Internal admin/ops                       |
| `/oauth/gmail/callback`  | Gmail OAuth         | ✅   | Gmail link completion                    |
| `/reset-password`        | Reset Password      | —    | Password reset via emailed token         |
| `/applypilot/privacy`    | Privacy             | —    | Static privacy page                      |

`/resume-parser` and `/home` redirect to `/app`; `/welcome` redirects to `/`.

---

## Documentation

Full docs live in **[`docs/`](docs/)**:

| Doc | What's inside |
| --- | --- |
| [Getting started](docs/getting-started.md) | Local setup, env vars, scripts, troubleshooting |
| [Architecture](docs/architecture.md) | Folder layout, providers, the workspace monolith, design system |
| [API reference](docs/api-reference.md) | Every backend endpoint the frontend calls, grouped by domain |
| [Frontend views → endpoints](docs/frontend-views.md) | **Per-view / per-component map of the exact endpoints each screen requires** |

---

## Project layout (top level)

```
src/
├─ App.tsx                  # Routing (product-first)
├─ main.tsx                 # Entry + theme bootstrap
├─ index.css                # Design tokens (JobPilot theme)
├─ pages/
│  ├─ Landing.tsx           # Public marketing page
│  ├─ Login.tsx / Register.tsx
│  ├─ ResumeParser.tsx      # The workspace (sidebar + all feature tabs)
│  ├─ AdminPortal.tsx, ResetPassword.tsx, GmailCallback.tsx, ApplyPilotPrivacy.tsx
│  └─ NotFound.tsx
├─ components/
│  ├─ auth/                 # AuthShell, ForgotPasswordDialog
│  ├─ resume/               # Workspace tabs (Dashboard, Applications, InterviewPrep, …)
│  ├─ job-search/           # Job discovery panels
│  ├─ quota/, feedback/     # Daily usage, feedback widget
│  └─ ui/                   # shadcn/ui primitives
├─ contexts/                # AuthContext, …
├─ hooks/                   # useJobSearch, useDailyUsage, …
├─ lib/api.ts               # The API layer (all backend endpoints)
└─ types/                   # Shared TypeScript types
```

---

## Production config

`.env.production` is intentionally minimal — set `VITE_API_URL` (and, optionally,
Datadog RUM keys) before deploying. In the browser on a non-localhost origin the
app calls **same-origin `/api`** regardless of build env, so a single CDN can
front both the SPA and the API.
