# JobPilot — Frontend

> Your copilot for the whole job hunt: tailor your resume, search jobs,
> autofill applications, and prep for interviews — in one place.
> Part of the [Aithrex](https://aithrex.tech) suite.

Initial copy of the portfolio frontend, carried over **whole** so the resume
parser experience runs unchanged in its new home. The resume feature
(`src/pages/ResumeParser.tsx` + `src/components/resume/*`) transitively depends
on the shared UI kit, `AuthContext`, hooks, and the monolithic `src/lib/api.ts`,
so the entire Vite app was copied rather than risk a broken partial extraction.

> **Status:** faithful copy. The portfolio repo still hosts the original. Once
> this stabilizes we'll prune the non-resume pages/components (see below) and
> retire the copy in portfolio.

## Run locally

```bash
pnpm install          # or npm install
cp .env.example .env.local   # already targets http://localhost:5000/api
pnpm dev              # http://localhost:5173
```

The resume parser is at route **`/resume-parser`**. It expects the
`jobpilot-backend` running on `localhost:5000` and a valid login (auth is
still served by the shared portfolio auth service — same JWT).

## Auth

Login flow points at the shared portfolio auth endpoints; the JWT it stores is
the same one the resume backend validates. No auth changes were made.

## Pruning plan (later, once stable)

This copy still contains portfolio-only surface area that can be removed:

- Non-resume pages in `src/pages/` (e.g. `CloudLab`, case studies, `GlobeView`,
  infra dashboards, visitor showcase).
- `src/lib/api.ts` is a ~3k-line monolith — trim to the resume/jobs/apply
  methods actually called by the resume components.
- Make `/resume-parser` (or `/`) the default route and drop unused routes from
  `src/App.tsx`.
- Remove now-unused components under `src/components/` and unused deps.

## Production config

`.env.production` was intentionally blanked — set `VITE_API_URL` and create a
fresh Datadog RUM app for Aithrex before deploying. Do not point it at the
portfolio domain.
