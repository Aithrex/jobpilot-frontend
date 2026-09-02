# JobPilot Frontend — Documentation

Developer documentation for the JobPilot web app. Start here.

## Contents

| Doc | Read it when you want to… |
| --- | --- |
| **[Getting started](getting-started.md)** | Run the app locally, configure env vars, troubleshoot |
| **[Architecture](architecture.md)** | Understand routing, providers, the workspace, and the design system |
| **[API reference](api-reference.md)** | Look up any backend endpoint the frontend calls (grouped by domain) |
| **[Frontend views → endpoints](frontend-views.md)** | See exactly which endpoints each screen/component requires |
| **[Job feed title filtering](job-feed-title-filtering.md)** | Understand why Sync title chips seed search but do not hard-filter results |
| **[Design system map](design/system-map.md)** | Look up a live token — this describes what is actually in `src/index.css` |
| **[Token decisions](design/token-decisions.md)** | Understand why a token has the value it has |
| **[Landing v8 brief](design/landing-v8-brief.md)** | Work on the public landing page |

Everything design-related now sits under **`design/`**, including
[`design/archive/`](design/archive/) for superseded direction documents kept
only for history. Read those for context, never to implement from — the map
above says which one is live.

## TL;DR

- **Stack:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui + React Router + TanStack Query.
- **Shape:** Product-first SPA. Public landing → auth → a sidebar **workspace** at `/app`.
- **Backend:** A single REST API under `/api`, consumed exclusively through
  [`src/lib/api.ts`](../src/lib/api.ts). Base URL comes from `VITE_API_URL`
  (defaults to `http://localhost:5000/api`).
- **Auth:** JWT bearer token stored in `localStorage` (`auth_token`), attached to
  every request by the API layer. A `401` clears the token and emits
  `auth:session-expired`.

## Conventions used in these docs

- Endpoint paths are written **relative to the API base** (`/api`). For example,
  `GET /auth/profile` is `GET {VITE_API_URL}/auth/profile`.
- Endpoints marked **🔒** require a valid bearer token.
- Long-running AI work uses an **async job pattern**: the call returns
  `{ job_id }` and the client polls `GET /resume/job/{job_id}` until
  `status: completed`. This is handled inside `api.ts` — callers just `await`.
