# Frontend views → endpoints

What each screen/component renders and the **backend endpoints it requires**.
Use this to know exactly which API surface a view depends on before changing it.

Legend: **🔒** auth required · **⏳** async job (poll `GET /resume/job/{id}`).
Full endpoint details are in the [API reference](api-reference.md).

```
Public                      Workspace (/app, gated by AuthGate)
──────                      ───────────────────────────────────
Landing                     Dashboard   ← default tab
Login                       Tailor · Batch Tailor
Register                    My Resumes · Tailored Resumes · Applications
Reset Password              Interview Prep · Visa Timeline · Career Copilot
Privacy                     Job Opportunities · Beta Lab · Profile
Gmail Callback              (+ header: Daily usage, Feedback)
```

---

## Public

### Landing — `src/pages/Landing.tsx` (`/`)
Static marketing page. No direct API calls.
On mount, the global `AuthProvider` runs auth bootstrap (see below) to decide the
CTA (`Get started` vs `Open workspace`).

| Endpoint | Why |
| --- | --- |
| `GET /auth/verify` 🔒 · `GET /auth/profile` 🔒 | Via `AuthProvider` if a token exists |

### Login — `src/pages/Login.tsx` (`/login`)

| Endpoint | Why |
| --- | --- |
| `POST /auth/login` | Sign in |
| `GET /auth/profile` 🔒 | Hydrate the user after login |
| `POST /auth/request-password-reset` | "Forgot password?" dialog |

### Register — `src/pages/Register.tsx` (`/register`)

| Endpoint | Why |
| --- | --- |
| `POST /auth/register` | Create the account |
| `POST /auth/login` + `GET /auth/profile` 🔒 | Auto sign-in after signup |

### Reset Password — `src/pages/ResetPassword.tsx` (`/reset-password`)

| Endpoint | Why |
| --- | --- |
| `POST /auth/reset-password` | Set a new password from the emailed token |

### Gmail Callback — `src/pages/GmailCallback.tsx` (`/oauth/gmail/callback`)

| Endpoint | Why |
| --- | --- |
| `POST /resume/gmail/callback` 🔒 | Complete the Gmail OAuth link, then redirect into the app |

### Privacy — `src/pages/ApplyPilotPrivacy.tsx`
Static. No API calls.

---

## Auth bootstrap (global)

Runs once on app load via `AuthProvider` (`src/contexts/AuthContext.tsx`).

| Endpoint | Why |
| --- | --- |
| `GET /auth/verify` 🔒 | Is the stored token still valid? |
| `GET /auth/profile` 🔒 | Load the current user |

A `401` on any request clears the token and emits `auth:session-expired`.

---

## Workspace shell — `src/pages/ResumeParser.tsx` (`/app`)

### AuthGate (sign-in wall) — `src/components/AuthGate.tsx`
Shown when logged out; renders the email → login/register flow plus a live
market feed.

| Endpoint | Why |
| --- | --- |
| `POST /auth/check-email` | Branch to login vs register |
| `POST /auth/login` · `POST /auth/register` | Authenticate |
| `POST /auth/request-password-reset` | Forgot-password dialog |
| `GET /tech-chronicle` | Live "Tech Chronicle" side panel |

### Header — daily usage & feedback
| Component | Endpoint | Why |
| --- | --- | --- |
| `quota/DailyUsageBadge` | `GET /resume/usage/today` 🔒 | Remaining daily tailor quota |
| `feedback/FeedbackWidget` | `POST /resume/feedback/submit` 🔒 · `GET /resume/feedback/mine` 🔒 | In-app feedback + quota-bump requests |
| `quota/QuotaLimitDialog` | (renders the `usage` payload from a `429`) | Quota-exceeded prompt |

Visitor telemetry (`useVisitorTracking("resume-parser")`) also fires
`POST /info` and `/session/*` — optional, non-blocking.

---

## Workspace tabs

### Dashboard — `components/resume/DashboardTab.tsx` · tab `dashboard` (default)
Overview: stats, daily brief, quick actions, pipeline, live market trends.

| Endpoint | Why |
| --- | --- |
| `GET /resume/streak` 🔒 | Streak, totals, today's count |
| `GET /resume/tailoring-records` 🔒 | Application pipeline + tailored count |
| `GET /resume/beta/morning-brief` 🔒 | Daily brief panel |
| `GET /tech-chronicle` | Market trends panel |
| (navigation only) | Quick-action buttons switch tabs in-app |

### Tailor — in-file `TailorTab` · tab `tailor`
Single-JD optimization: paste/parse a JD, tailor, score, edit, download.

| Endpoint | Why |
| --- | --- |
| `GET /resume/status` 🔒 · `GET /resume/versions` 🔒 | Is a base resume present? |
| `POST /resume/tailor-with-jd` ⏳ 🔒 | Combined JD-analysis + tailoring (preferred) |
| `POST /resume/extract-jd` ⏳ · `POST /resume/tailor` ⏳ 🔒 | Fallback two-step path |
| `POST /resume/ats-scores` ⏳ 🔒 | ATS compatibility scoring |
| `POST /resume/regenerate` ⏳ 🔒 | Regenerate with feedback |
| `POST /resume/rewrite-bullet` 🔒 | Inline bullet rewrite (via `ResumeEditor`) |
| `POST /resume/cover-letter` ⏳ 🔒 · `POST /resume/cover-letter/download` 🔒 | Cover letter + PDF |
| `POST /resume/save-record` 🔒 · `POST /resume/tailoring-records/{id}/versions` 🔒 | Persist record + versions |
| `POST /resume/download` 🔒 | Export tailored resume (PDF/DOCX) |
| `GET /resume/usage/today` 🔒 | Quota check |

### Batch Tailor — `components/resume/BatchTailor.tsx` · tab `batch`
Tailor many JDs in one run.

| Endpoint | Why |
| --- | --- |
| `POST /resume/batch-tailor` ⏳ 🔒 | Queue the batch |
| `GET /resume/job/{id}` 🔒 | Poll each job |
| `POST /resume/cover-letter` ⏳ · `POST /resume/download` 🔒 | Per-item cover letters + exports |
| `POST /resume/feedback/submit` 🔒 | Quota-bump flow |

### My Resumes — in-file `MyResumesTab` → `components/resume/ResumeDashboard.tsx` · tab `my-resumes`
Manage base resumes.

| Endpoint | Why |
| --- | --- |
| `GET /resume/versions` 🔒 · `GET /resume/status` 🔒 | List base resumes / parse status |
| `POST /resume/upload` ⏳ 🔒 | Upload + parse a new resume |
| `PUT /resume/active` 🔒 | Set the active base resume |
| `GET /resume/download-file/{key}` 🔒 · `DELETE /resume/file/{key}` 🔒 | Download / delete |

### Tailored Resumes — in-file `TailoredResumesTab` · tab `tailored`
Versioned tailored outputs.

| Endpoint | Why |
| --- | --- |
| `GET /resume/tailoring-records` 🔒 · `GET /resume/tailoring-records/{id}` 🔒 | List + open records |
| `PUT /resume/tailoring-records/{id}/current-version` 🔒 | Switch current version |
| `POST /resume/download` 🔒 | Re-export a version |
| `DELETE /resume/tailoring-records/{id}` 🔒 | Delete |

### Applications — `components/resume/ApplicationsTab.tsx` · tab `applications`
Pipeline tracker + Gmail auto-status.

| Endpoint | Why |
| --- | --- |
| `GET /resume/tailoring-records` 🔒 | The application list |
| `PATCH /resume/tailoring-records/{id}/application` 🔒 | Update status / dates / notes |
| `GET /resume/streak` 🔒 | Streak widget |
| `GET /resume/gmail/status` 🔒 · `POST /resume/gmail/sync` ⏳ 🔒 | Gmail connection + inbox sync |
| `GET /resume/gmail/suggestions` 🔒 · `…/apply` · `…/dismiss` 🔒 | Review suggested status changes |
| `GET /resume/career-copilot/intelligence/stale` 🔒 · `…/followup` 🔒 | Stale-app nudges + follow-up drafts |

### Interview Prep — `components/resume/InterviewPrepTab.tsx` · tab `interview`
Practice questions, AI coach, mock interview.

| Endpoint | Why |
| --- | --- |
| `GET /resume/tailoring-records` 🔒 | Pick the role to prep for |
| `POST /resume/tailoring-records/{id}/interview-prep` 🔒 | Generate a prep pack |
| `POST /resume/tailoring-records/{id}/practice-question` 🔒 | Draw a practice question |
| `GET/POST /resume/tailoring-records/{id}/chat` 🔒 | Coach chat |
| `POST /resume/tailoring-records/{id}/mock-evaluate` 🔒 | Score a mock answer |

### Visa Timeline — `components/visa/VisaTimelineTab.tsx` · tab `visa`
F-1 / OPT / H-1B clocks.

| Endpoint | Why |
| --- | --- |
| `GET/PUT /resume/visa/profile` 🔒 | Read/save visa profile |
| `GET /resume/visa/timeline` 🔒 | Computed milestones + recommendation |

### Career Copilot — `components/resume/CareerCopilotTab.tsx` · tab `copilot`
Agentic RAG copilot + sub-workspaces. Uses the full
`/resume/career-copilot/*` surface — see
[API reference §3](api-reference.md#3-career-copilot--resumecareer-copilot).

| Group | Key endpoints |
| --- | --- |
| Chat / state | `GET /…/state` 🔒 · `POST /…/chat` 🔒 · `POST /…/behavior` 🔒 |
| Playground | `…/playground/start` · `/advance` · `/reset` · `/quiz` · `/evaluate` 🔒 |
| Outreach | `…/outreach/campaigns` · `/create` · `/generate-sequence` · `/{id}/step` 🔒 |
| Intelligence | `…/intelligence/funnel` · `/rejection-insights` · `/reframe` · `/weekly-digest` 🔒 |
| Momentum | `…/momentum` · `…/momentum/activity` 🔒 |
| Network | `…/network/contacts` · `/generate-intro` · `/insights` 🔒 |
| Offers | `…/offers` · `/compare` · `/negotiate` 🔒 |
| Memory / timeline | `…/memory` · `…/timeline` 🔒 |

### Job Opportunities — `components/resume/JobOpportunitiesTab.tsx` + `components/job-search/*` · tab `jobs`
Search, pipeline, save, and analyze roles.

| Endpoint | Why |
| --- | --- |
| `GET /jobs/search` ⏳ 🔒 · `POST /jobs/batch-search` ⏳ 🔒 | Search / batch search |
| `POST /jobs/pipeline` ⏳ 🔒 · `GET /jobs/pipeline/suggest-filters` 🔒 | Daily pipeline + smart filters |
| `POST /jobs/pipeline/match-scores` 🔒 | Score rows vs resume |
| `GET/POST /jobs/pipeline/presets` 🔒 · `DELETE …/{name}` 🔒 | Saved presets |
| `POST /jobs/fetch-jd` 🔒 · `POST /jobs/analyze` 🔒 | Scrape + analyze a JD |
| `POST /jobs/draft-outreach` 🔒 | Recruiter outreach drafts |
| `GET/POST /jobs/saved` 🔒 · `PUT/DELETE /jobs/saved/{id}` 🔒 | Saved jobs |
| `GET/PUT /jobs/filters` 🔒 | Persisted filters |
| `GET/PUT/DELETE /jobs/apify-key` 🔒 | User's Apify key |

### Beta Lab — `components/beta/BetaLabTab.tsx` · tab `beta`

| Endpoint | Why |
| --- | --- |
| `GET /resume/beta/morning-brief` 🔒 | Daily brief |
| `POST /resume/beta/similar-roles` 🔒 | Similar-roles finder |
| `GET /resume/beta/ab-telemetry` 🔒 | Callback-rate telemetry |

### Profile — in-file `ProfileTab` · tab `profile`

| Endpoint | Why |
| --- | --- |
| `GET/PUT /auth/profile` 🔒 | View/edit identity (name, role, sector) |
| `GET /resume/usage/today` 🔒 | Usage summary |
| `GET /resume/feedback/mine` 🔒 · `POST /resume/feedback/submit` 🔒 | Feedback history |

---

## Admin Portal — `src/pages/AdminPortal.tsx` (`/admin`) 🔒 super-admin
Internal ops console. Uses the full `/admin/*` surface — see
[API reference §7](api-reference.md#7-admin--admin--super-admin). Sub-panels:

| Panel | Key endpoints |
| --- | --- |
| Overview | `GET /admin/stats` · `GET /admin/activity` |
| Users / Quotas | `GET /admin/users` · `GET /admin/user/{email}` · `PATCH /admin/user/{email}/quota` |
| Resumes / Tailoring / Apps | `GET /admin/resumes` · `/admin/tailoring[/{id}]` · `/admin/applications` · `/admin/interview-prep` · `/admin/resume-url` |
| Feedback | `GET/PATCH /admin/feedback[/{id}]` |
| Environments | `GET /admin/environments` · `POST /admin/environments/{slug}/teardown` |
