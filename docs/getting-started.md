# Getting started

How to run the JobPilot frontend locally and connect it to the backend.

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- **pnpm** 8+ (`npm i -g pnpm`) — npm also works
- The **`jobpilot-backend`** running locally on `http://localhost:5000`

## 1. Install

```bash
pnpm install
```

## 2. Configure the API URL

The repo ships with `.env.local`:

```bash
# .env.local
VITE_API_URL=http://localhost:5000/api
```

If it's missing, copy the example:

```bash
cp .env.example .env.local
```

How the base URL is resolved (`src/lib/api.ts → getApiBaseUrl()`):

| Context | API base used |
| --- | --- |
| Local dev (`localhost`) | `VITE_API_URL` (→ `http://localhost:5000/api`) |
| Browser on a non-localhost origin | **same-origin** `/api` (ignores build env) |

> Same-origin in production means one CDN/domain can serve both the SPA and the
> API, so the frontend never hard-codes the prod API host.

## 3. Run

```bash
pnpm dev          # → http://localhost:5173
```

A Vite proxy (`vite.config.ts`) also forwards any same-origin `/api/*` request to
`http://localhost:5000` as a safety net, so the app works even if `VITE_API_URL`
is unset or relative.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Recommended | API base URL for local dev (e.g. `http://localhost:5000/api`) |
| `VITE_DD_RUM_APPLICATION_ID` | Optional | Datadog Browser RUM app id (telemetry) |
| `VITE_DD_RUM_CLIENT_TOKEN` | Optional | Datadog Browser RUM client token |
| `VITE_DD_RUM_SITE` / `_ENV` / `_VERSION` | Optional | Datadog RUM config |

Leaving the Datadog vars unset disables RUM cleanly.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server with HMR on `:5173` |
| `pnpm build` | Production build to `dist/` (Vite + SWC — **does not typecheck**) |
| `pnpm preview` | Serve the built `dist/` locally |
| `pnpm lint` | ESLint over `src/` |

### Typechecking

`pnpm build` uses SWC and skips type errors. To typecheck explicitly:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

> Note: `src/pages/ResumeParser.tsx` currently has a handful of **pre-existing**
> type errors (e.g. loosely-typed `TailoringRecord`/`ResumeContact` fields). They
> do not block `pnpm build`. Gate CI on `pnpm build` + `pnpm lint`, not a clean `tsc`.

## First-run checklist / troubleshooting

| Symptom | Likely cause & fix |
| --- | --- |
| UI loads but login/data fails | Backend not running on `:5000`. Start `jobpilot-backend`. |
| `Network error` / CORS in console | Use `VITE_API_URL=http://localhost:5000/api`, or rely on the `/api` Vite proxy. |
| `Session expired` toast on load | Stale/invalid JWT in `localStorage` — sign in again (the app clears it automatically). |
| Fonts/styles look unthemed | First load fetches Google Fonts; check the CSP `font-src`/`style-src` in `index.html`. |
| Blank page after build | Check `VITE_API_URL` and that `dist/` is served from `/` (SPA fallback to `index.html`). |

## Where to go next

- [Architecture](architecture.md) — how the app is wired together
- [API reference](api-reference.md) — every endpoint the frontend uses
- [Frontend views → endpoints](frontend-views.md) — per-screen endpoint map
