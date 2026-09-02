# API reference

Every backend endpoint the frontend calls, grouped by domain. All paths are
relative to the API base (`VITE_API_URL`, default `http://localhost:5000/api`).

- **🔒** = requires a bearer token (`Authorization: Bearer <jwt>`).
- **⏳** = async job pattern — returns `{ job_id }`, then the client polls
  `GET /resume/job/{job_id}` until `status: completed` (handled inside `api.ts`).
- The **Method** column shows `api.ts → methodName()` so you can jump from a
  screen to the code.

> Source of truth: [`src/lib/api.ts`](../src/lib/api.ts). If you add/rename an
> endpoint, update that file **and** this doc.

---

## 1. Auth — `/auth`

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | | Create account | `register()` |
| POST | `/auth/login` | | Sign in, returns `access_token` | `login()` |
| GET | `/auth/profile` | 🔒 | Current user profile | `getProfile()` |
| PUT | `/auth/profile` | 🔒 | Update name/role/sector | `updateProfile()` |
| GET | `/auth/verify` | 🔒 | Validate the stored token | `verifyToken()` |
| POST | `/auth/check-email` | | Does this email exist? (drives login vs register) | `checkEmail()` |
| POST | `/auth/check-user` | | Lookup by device fingerprint | `checkUser()` |
| POST | `/auth/validate-password` | | Pre-validate a password | `validatePassword()` |
| POST | `/auth/request-password-reset` | | Email a reset link | `requestPasswordReset()` |
| POST | `/auth/reset-password` | | Reset password with token | `resetPassword()` |

---

## 2. Resume & tailoring — `/resume`

The core of the product. Most AI calls are **⏳ async jobs**.

### Parse & status

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/status` | 🔒 | Whether a parsed resume exists | `getResumeStatus()` |
| POST | `/resume/upload` ⏳ | 🔒 | Upload + parse a resume file | `uploadResumeForParser()` |
| GET | `/resume/job/{job_id}` | 🔒 | Poll any async resume job | `pollJob()` (internal) |

### Tailor

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| POST | `/resume/extract-jd` ⏳ | 🔒 | Analyze a job description | `extractJD()` |
| POST | `/resume/tailor` ⏳ | 🔒 | Tailor resume to a JD analysis | `tailorResumeForParser()` |
| POST | `/resume/tailor-with-jd` ⏳ | 🔒 | Combined extract + tailor (preferred) | `tailorResumeWithJDText()` |
| POST | `/resume/regenerate` ⏳ | 🔒 | Regenerate with user feedback | `regenerateResume()` |
| POST | `/resume/rewrite-bullet` | 🔒 | Rewrite a single bullet | `rewriteBullet()` |
| POST | `/resume/ats-scores` ⏳ | 🔒 | ATS compatibility scoring | `fetchATSScores()` |
| POST | `/resume/cover-letter` ⏳ | 🔒 | Generate a cover letter | `generateCoverLetter()` |
| POST | `/resume/cover-letter/download` | 🔒 | Cover letter → PDF | `downloadCoverLetterPDF()` |
| POST | `/resume/batch-tailor` | 🔒 | Queue many JDs at once | `batchTailor()` |

### Resume files & downloads

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/versions` | 🔒 | List base resumes | `listBaseResumes()` |
| GET | `/resume/generated` | 🔒 | List generated resumes (legacy) | `listGeneratedResumes()` |
| PUT | `/resume/active` | 🔒 | Set the active base resume | `setActiveResume()` |
| DELETE | `/resume/file/{s3_key}` | 🔒 | Delete a resume file | `deleteResume()` |
| GET | `/resume/download-file/{s3_key}` | 🔒 | Download a stored resume | `downloadResumeFile()` |
| POST | `/resume/download` | 🔒 | Render tailored resume → PDF/DOCX | `downloadTailoredResume()` |

### Tailoring records, versions & applications

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| POST | `/resume/save-record` | 🔒 | Save a tailoring record | `saveTailoringRecord()` |
| GET | `/resume/tailoring-records` | 🔒 | List records (powers Applications/Library/Dashboard) | `listTailoringRecords()` |
| GET | `/resume/tailoring-records/{id}` | 🔒 | One record | `getTailoringRecord()` |
| DELETE | `/resume/tailoring-records/{id}` | 🔒 | Delete a record | `deleteTailoringRecord()` |
| POST | `/resume/tailoring-records/{id}/versions` | 🔒 | Save a resume version | `saveResumeVersion()` |
| PUT | `/resume/tailoring-records/{id}/current-version` | 🔒 | Set current version | `setCurrentResumeVersion()` |
| PATCH | `/resume/tailoring-records/{id}/application` | 🔒 | Update application status/notes/dates | `updateApplication()` |

### Interview prep & practice

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| POST | `/resume/tailoring-records/{id}/interview-prep` | 🔒 | Generate a prep pack | `generateInterviewPrep()` |
| POST | `/resume/tailoring-records/{id}/practice-question` | 🔒 | Get a practice question | `getPracticeQuestion()` |
| GET/POST | `/resume/tailoring-records/{id}/chat` | 🔒 | Interview coach chat | `getCoachChat()` / `chatWithCoach()` / `resetCoachChat()` |
| POST | `/resume/tailoring-records/{id}/mock-evaluate` | 🔒 | Score a mock answer | `evaluateMockAnswer()` |

### Usage, streak & feedback

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/usage/today` | 🔒 | Daily tailor quota usage | `getDailyUsage()` |
| GET | `/resume/streak` | 🔒 | Application streak + heatmap | `getApplicationStreak()` |
| POST | `/resume/feedback/submit` | 🔒 | Submit feedback / quota bump | `submitFeedback()` |
| GET | `/resume/feedback/mine` | 🔒 | My feedback + admin replies | `getMyFeedback()` |

### Visa timeline — `/resume/visa`

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET/PUT | `/resume/visa/profile` | 🔒 | Visa profile | `getVisaProfile()` / `saveVisaProfile()` |
| GET | `/resume/visa/timeline` | 🔒 | F-1 / OPT / H-1B milestones | `getVisaTimeline()` |

### Beta lab — `/resume/beta`

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/beta/morning-brief` | 🔒 | Daily brief (also used by Dashboard) | `getMorningBrief()` |
| POST | `/resume/beta/similar-roles` | 🔒 | Find similar roles for a JD | `findSimilarRoles()` |
| GET | `/resume/beta/ab-telemetry` | 🔒 | A/B callback-rate telemetry | `getAbTelemetry()` |

---

## 3. Career Copilot — `/resume/career-copilot`

The agentic RAG copilot and its sub-workspaces.

### Core chat & playground

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/career-copilot/state` | 🔒 | Copilot state, prompts, tracks | `getCareerCopilotState()` |
| POST | `/resume/career-copilot/chat` | 🔒 | Multi-agent chat turn | `sendCareerCopilotMessage()` / `resetCareerCopilotChat()` |
| POST | `/resume/career-copilot/behavior` | 🔒 | Record tab/behavior signal | `recordCareerCopilotTab()` |
| POST | `/resume/career-copilot/playground/start` | 🔒 | Start a learning track | `startPlaygroundTrack()` |
| POST | `/resume/career-copilot/playground/advance` | 🔒 | Advance a track step | `advancePlaygroundStep()` |
| POST | `/resume/career-copilot/playground/reset` | 🔒 | Reset the track | `resetPlaygroundTrack()` |
| POST | `/resume/career-copilot/playground/quiz` | 🔒 | Generate a quiz | `generatePlaygroundQuiz()` |
| POST | `/resume/career-copilot/playground/evaluate` | 🔒 | Score a free-text answer | `evaluatePlaygroundAnswer()` |
| GET | `/resume/career-copilot/timeline` | 🔒 | Activity timeline | `getCopilotTimeline()` |
| GET/POST/DELETE | `/resume/career-copilot/memory[/{key}]` | 🔒 | Copilot memory notes | `getMemoryNotes()` / `saveMemoryNote()` / `deleteMemoryNote()` |

### Outreach campaigns

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/career-copilot/outreach/campaigns` | 🔒 | List campaigns | `getOutreachCampaigns()` |
| POST | `/resume/career-copilot/outreach/create` | 🔒 | Create a campaign | `createOutreachCampaign()` |
| POST | `/resume/career-copilot/outreach/generate-sequence` | 🔒 | Generate a sequence | `generateOutreachSequence()` |
| PATCH | `/resume/career-copilot/outreach/{id}/step` | 🔒 | Update a step | `updateOutreachStep()` |

### Intelligence

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/career-copilot/intelligence/stale` | 🔒 | Stale applications | `getStaleApplications()` |
| POST | `/resume/career-copilot/intelligence/followup` | 🔒 | Draft a follow-up | `generateIntelligenceFollowup()` |
| POST | `/resume/career-copilot/intelligence/followup/{id}/dismiss` | 🔒 | Dismiss a follow-up | `dismissIntelligenceFollowup()` |
| GET | `/resume/career-copilot/intelligence/funnel` | 🔒 | Funnel analytics | `getFunnelAnalytics()` |
| GET | `/resume/career-copilot/intelligence/rejection-insights` | 🔒 | Rejection patterns | `getRejectionInsights()` |
| POST | `/resume/career-copilot/intelligence/reframe` | 🔒 | Reframe a rejection | `reframeRejection()` |
| GET | `/resume/career-copilot/intelligence/weekly-digest` | 🔒 | Weekly digest | `getWeeklyDigest()` |

### Momentum, network & offers

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/career-copilot/momentum` | 🔒 | Momentum score + milestones | `getMomentumData()` |
| POST | `/resume/career-copilot/momentum/activity` | 🔒 | Record activity | `recordMomentumActivity()` |
| GET/POST | `/resume/career-copilot/network/contacts` | 🔒 | Networking CRM contacts | `getNetworkContacts()` / `addNetworkContact()` |
| PUT/DELETE | `/resume/career-copilot/network/contacts/{id}` | 🔒 | Update/remove contact | `updateNetworkContact()` / `deleteNetworkContact()` |
| POST | `/resume/career-copilot/network/generate-intro` | 🔒 | Draft an intro message | `generateNetworkIntro()` |
| GET | `/resume/career-copilot/network/insights` | 🔒 | Networking insights | `getNetworkingInsights()` |
| GET/POST | `/resume/career-copilot/offers` | 🔒 | Offer workspace | `getOffers()` / `addOffer()` |
| PUT/DELETE | `/resume/career-copilot/offers/{id}` | 🔒 | Update/remove offer | `updateOffer()` / `deleteOffer()` |
| GET | `/resume/career-copilot/offers/compare` | 🔒 | Compare offers | `compareOffers()` |
| POST | `/resume/career-copilot/offers/negotiate` | 🔒 | Negotiation script | `generateNegotiationScript()` |

---

## 4. Jobs — `/jobs`

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/jobs/search` ⏳ | 🔒 | Search jobs (streams partials) | `searchJobs()` |
| POST | `/jobs/batch-search` ⏳ | 🔒 | Multi-query batch search | `batchSearchJobs()` |
| POST | `/jobs/pipeline` ⏳ | 🔒 | Run the daily pipeline | `runDailyPipeline()` |
| GET | `/jobs/pipeline/suggest-filters` | 🔒 | AI-suggested filters | `suggestPipelineFilters()` |
| POST | `/jobs/pipeline/match-scores` | 🔒 | Score rows vs resume skills | `pipelineMatchScores()` |
| GET/POST | `/jobs/pipeline/presets` | 🔒 | Saved pipeline presets | `listPipelinePresets()` / `savePipelinePreset()` |
| DELETE | `/jobs/pipeline/presets/{name}` | 🔒 | Delete a preset | `deletePipelinePreset()` |
| POST | `/jobs/fetch-jd` | 🔒 | Scrape a JD from a URL | `fetchJobDescription()` |
| POST | `/jobs/draft-outreach` | 🔒 | Draft recruiter outreach | `draftOutreach()` |
| POST | `/jobs/analyze` | 🔒 | Summarize / missing skills / cover letter | `analyzeJob()` |
| GET/PUT/DELETE | `/jobs/apify-key` | 🔒 | Manage the user's Apify key | `getApifyKey()` / `setApifyKey()` / `deleteApifyKey()` |
| POST/GET | `/jobs/resume` | 🔒 | Upload/get resume for job matching | `uploadResume()` / `getResume()` |
| POST | `/jobs/tailor-resume` | 🔒 | Quick tailor against a JD | `tailorResume()` |
| GET/POST | `/jobs/saved` | 🔒 | Saved jobs | `getSavedJobs()` / `saveJob()` |
| PUT/DELETE | `/jobs/saved/{id}` | 🔒 | Update/remove a saved job | `updateSavedJob()` / `deleteSavedJob()` |
| GET/PUT | `/jobs/filters` | 🔒 | Persisted search filters | `getJobFilters()` / `saveJobFilters()` |

### 4a. The unified tech feed — `/jobs/tech-feed`

Behind the `aspirely.techFeed.enabled` flag. Every route rides the existing
`ANY /api/jobs/{proxy+}` edge route, so none of them needs a Terraform change.

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| POST | `/jobs/tech-feed/search` | 🔒 | The bounded indexed search. 200 inline; 202 `{job_id}` only when the caller asks for `async` | `searchTechFeed()` |
| GET | `/jobs/tech-feed/taxonomy` | 🔒 | The filter tree. Static per deploy | `getTechFeedTaxonomy()` |
| GET | `/jobs/tech-feed/coverage` | 🔒 | Crawl health + the MEASURED coverage, with `measured_at` / `age_hours` / `stale` | `getTechFeedCoverage()` |
| GET | `/jobs/tech-feed/companies?q=` | 🔒 | Company autocomplete over the canonical employer registry. `?ids=a,b` resolves ids back to names | `searchTechFeedCompanies()` / `lookupTechFeedCompanies()` |
| GET | `/jobs/tech-feed/company-categories` | 🔒 | The canonical employer-category facet, with counts | `getTechFeedCompanyCategories()` |
| POST/DELETE/GET | `/jobs/tech-feed/feedback` | 🔒 | Cross-device "not interested" | `recordTechFeedFeedback()` / `undoTechFeedFeedback()` / `getTechFeedFeedback()` |
| GET/POST | `/jobs/tech-feed/saved-searches` | 🔒 | Server-owned saved searches, keyed on the CLIENT's id | `listTechFeedSavedSearches()` / `saveTechFeedSearch()` |
| DELETE | `/jobs/tech-feed/saved-searches/{id}` | 🔒 | Remove one | `deleteTechFeedSavedSearch()` |
| POST | `/jobs/tech-feed/saved-searches/reconcile` | 🔒 | Push this browser's list up, take the server's back. Never deletes | `reconcileTechFeedSavedSearches()` |
| POST | `/jobs/tech-feed/telemetry` | 🔒 | Non-PII product events. Filter KEYS and bucketed counts only; 204 on a dropped batch | `recordTechFeedTelemetry()` |

> **`company_ids` takes canonical `emp_<12 hex>` ids** from the autocomplete.
> A legacy value (a name slug or a bare ATS tenant) is still accepted on the
> wire and still matches, temporarily — but nothing should DISPLAY one.

---

## 5. Gmail integration — `/resume/gmail`

Auto-updates application status from the user's inbox.

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/resume/gmail/status` | 🔒 | Connection status | `getGmailStatus()` |
| GET | `/resume/gmail/auth-url` | 🔒 | Start OAuth | `getGmailAuthUrl()` |
| POST | `/resume/gmail/callback` | 🔒 | Finish OAuth link | `finishGmailLink()` |
| POST | `/resume/gmail/sync` ⏳ | 🔒 | Scan inbox for status updates | `syncGmail()` |
| GET | `/resume/gmail/suggestions` | 🔒 | Suggested status changes | `listGmailSuggestions()` |
| POST | `/resume/gmail/suggestions/{id}/apply` | 🔒 | Apply a suggestion | `applyGmailSuggestion()` |
| POST | `/resume/gmail/suggestions/{id}/dismiss` | 🔒 | Dismiss a suggestion | `dismissGmailSuggestion()` |
| POST | `/resume/gmail/disconnect` | 🔒 | Unlink Gmail | `disconnectGmail()` |

---

## 6. Market intelligence — `/tech-chronicle`

| Method | Endpoint | 🔒 | Purpose | `api.ts` |
| --- | --- | --- | --- | --- |
| GET | `/tech-chronicle?category=…` | | AI-curated tech & career feed (Dashboard, AuthGate) | `getTechChronicle()` |

---

## 7. Admin — `/admin` 🔒 (super-admin)

Used only by the Admin Portal.

| Method | Endpoint | Purpose | `api.ts` |
| --- | --- | --- | --- |
| GET | `/admin/stats` | Platform stats | `getAdminStats()` |
| GET | `/admin/users` | User list + quotas | `getAdminUsers()` |
| GET | `/admin/user/{email}` | User detail | `getAdminUserDetail()` |
| PATCH | `/admin/user/{email}/quota` | Set a user's daily limit | `updateAdminUserQuota()` |
| GET | `/admin/resumes` | All resumes | `getAdminResumes()` |
| GET | `/admin/tailoring[/{id}]` | Tailoring records | `getAdminTailoring()` / `getAdminTailoringDetail()` |
| GET | `/admin/applications` | All applications | `getAdminApplications()` |
| GET | `/admin/interview-prep` | All prep packs | `getAdminInterviewPrep()` |
| GET | `/admin/resume-url` | Signed resume URL | `getAdminResumeUrl()` |
| GET | `/admin/activity` | Recent activity feed | `getAdminActivity()` |
| GET/POST | `/admin/feedback[/{id}]` | Feedback queue | `getAdminFeedback()` / `updateAdminFeedback()` |
| GET | `/admin/environments` | Ephemeral preview envs | `listAdminEnvironments()` |
| POST | `/admin/environments/{slug}/teardown` | Tear down an env | `teardownAdminEnvironment()` |

---

## 8. Platform / telemetry (optional)

These predate the product split and are not central to the job-seeker flow. The
workspace still emits lightweight visitor/session telemetry; the rest are
diagnostic.

| Method | Endpoint | Purpose | `api.ts` |
| --- | --- | --- | --- |
| GET | `/health` | Health check | `healthCheck()` |
| POST | `/info`, `/info/register-visitor` | Visitor tracking | `storeVisitorInfo()` / `registerVisitor()` |
| GET | `/info/stats`, `/info/org-stats` | Visitor analytics | `getVisitorStats()` / `getOrgStats()` |
| POST/GET | `/session/*` | Session validation + page/section timing | `validateSession()` / `trackPageView()` / `trackSectionTime()` / … |
| POST/GET | `/geo/*` | IP geolocation | `lookupIP()` / `getMyIP()` / `getIPStats()` |
| POST/GET | `/contact[/messages]` | Contact form | `submitContact()` / `getContactMessages()` |
| POST/GET | `/chat`, `/chat/concierge`, `/chat/diary[/latest]` | Chatbot / concierge / build diary | `sendChatMessage()` / `sendConciergeTurn()` / `getCloudDiary()` |
| GET | `/trace`, `/trace/deep`, `/trace/pageload` | Request tracing | `traceRequest()` / … |
| POST/GET | `/infra/sandbox/*` | CI/CD sandbox demo | `deploySandboxMessage()` / … |

> The portfolio surfaces that drove most of section 8 were removed from routing.
> The methods remain in `api.ts` and can be pruned when convenient.
