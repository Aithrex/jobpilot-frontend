# Focused workspace and reliable tracking

Decision date: **2026-10-25 (America/Phoenix)**. Owner-requested product cleanup. The primary path is **For you -> tailor/apply -> Application tracker**.

## Refined execution brief

Make For you the primary discovery destination. Resolve conflicting counts and Home recommendations using one selected population. Hide duplicate or deferred features. Make Gmail connection, status evidence, rejection review and follow-ups visible in the tracker. Preserve records, manual application confirmation, resume integrity and shared ingestion. Execute investigate -> regression -> implement -> verify -> review loops, then merge verified changes to main.

## Hidden features and dependencies

| Surface | Why hidden | Retained dependencies | Old route | Return criteria |
| --- | --- | --- | --- | --- |
| Career Portals | Duplicated For you and exposed sourcing terminology | Workday/career-page/MNC ingestion and APIs, discovery, shared titles, adapters, scoring and saved/applied records | `/app/jobs/portals` -> `/app/jobs/for-you` | A demonstrated distinct user task and coherent counts; provider names alone do not justify a workspace |
| Auto Apply | Paused automation still appeared in Home, cards, approval links and settings, implying readiness | Engine source, ledger/history, manual Apply/confirmation, tailoring and backend controls | `/app/apply/auto-apply` -> tracker; `/app/settings/autonomy` -> integrations | Verified end-to-end submissions, recoverable failures, explicit consent and a separate readiness review |
| Six Seconds | Secondary analysis distracted from resume preparation | Component/API source and historical analysis | `/app/resume/six-seconds` -> library | Validated demand, actionable results and a clear place in the resume workflow |
| Voice analysis | Additional terminology and navigation without a necessary daily task | Component/API source and historical analysis | `/app/resume/voice` -> library | Clear purpose, reliable output and demonstrated benefit alongside tailoring |

Removal covers navigation, command search, mobile menus, Home, shared job-card actions, resume rail, legacy widgets, billing promotions and direct routes. Old approval tokens no longer open a submission dialog. Backend workers and account preferences are not changed by UI hiding; existing production pause controls remain authoritative. No production records or ingestion configuration were edited.

## Why the numbers differed

Date chips counted raw jobs by age; cards also filtered experience, query, score, sponsorship, hidden jobs and application status. Experience facets used the entire loaded inventory. Home applied only experience. Thus one input could show 19 in a chip, 3 cards and hundreds in an experience menu.

`src/lib/forYouSelection.ts` defines one population. Cards and Home consume its ordered results. Date facets apply every filter except date; experience facets apply every filter except selected experience, including the selected date. Unknown dates use the same rule everywhere. Shared saved-job status and hidden state keep counts current after apply/hide. Pagination distinguishes the current page from the total. Home previews the first five results of the same selection.

Home's former “Applications sent” included saved roles and drafts. It now says “Tracked roles”. “Open roles” uses the tracker's non-closed scope. Interview rates require a submitted-stage denominator; unavailable data is not zero.

## Tracker improvements

- Gmail connection, sync status and review are on the primary tracker, including empty/loading states.
- Summary counts describe all records; filtered scope counts and CSV export describe the current view.
- Rejections have a direct filter. Notes, next actions, follow-up dates and stage editing remain available.
- Email review shows company/role candidates and matching evidence. Ambiguity requires a role selection; status confidence alone cannot establish identity.
- Slim records are paginated rather than silently capped at 1,000. Failed loads are surfaced.
- CSV export escapes delimiters and neutralizes spreadsheet formula prefixes.

Gmail requires the existing server OAuth switch, credentials and user consent. Disabled configuration shows an explicit unavailable state. This change does not access the owner's mailbox or enable production OAuth. First sync examines the last 60 days, all folders except promotions/social, in bounded resumable batches. It matches recorded applications; it does not invent applications from unrelated mail or claim a complete historical import.

## Remaining opportunities

Manual application entry and a review queue for importing previously untracked applications would help migrations. They need a dedicated creation/identity contract; company-only email is insufficient evidence. Calendar-backed interviews and durable outcome history are useful next steps. This cleanup implements the immediate essentials without inventing events or statuses.

## Restoration and verification

Restore a feature only after its return criteria are met. Re-add navigation, route, cards and settings together with regression coverage. Never delete backend sourcing services based on a removed screen name.

Release checks: frontend `node scripts/verify.mjs --full`; backend Python 3.12 `python scripts/verify.py --full` with mongomock; independent review; responsive light/dark inspection using mocked data. See the pull requests for exact results.

## Live verification follow-up: Home application history

Verified on **2026-10-25 (America/Phoenix)** after the initial cleanup merge. Home's application chart still consumed `/resume/streak`, whose historical backfill counts tailoring-record creation dates. The tracker instead uses the recorded application date. Home's recent table consumed `/jobs/saved` sorted by the original save time, so neither surface represented the application history shown in the tracker.

Home now loads the same fully paginated slim records as the tracker once for its timeline, today's recorded applications, and Recent applications table. The stored `application.applied_date` takes precedence; legacy `applied_at` timestamps use the shared timezone helper. Creation and update times never stand in for submission dates. Submissions remain in history after rejection, an offer, or moving a role back to Saved. Saved roles and drafts without an application date do not count as submissions. Missing or invalid dates on submitted-stage records are reported as excluded from the timeline, and a failed page load shows retry states instead of zero.

The recent table is now explicitly application history, ordered by application day and labelled Applied, with a link to the complete tracker. No production data or cached streak records are rewritten. Existing streak consumers elsewhere retain their behavior.

Regression verification: reproduced the chart/source and failed-history bugs before implementation; the focused Home suite passes 16 tests covering date boundaries, older records applied to recently, civil dates, legacy UTC timestamps/statuses, progressed/closed records, undated drafts, invalid dates, failed loads and first-run behavior. Touched-file ESLint reports zero errors and the existing TodayPage Fast Refresh warning. Full-suite/build and live-browser verification are recorded with the follow-up pull request.

## Live verification follow-up: Gmail review clarity

The first authorized live batch completed on **2026-10-25 (America/Phoenix)**. A completed batch with more mail remaining deliberately does not advance the full-scan watermark. The connection now says First scan partially complete instead of last sync never, and labels its counters Last batch. Duplicate company/role choices display recorded application dates, falling back to creation dates and a short application reference only when labels remain identical. These are display changes; selecting an application still requires explicit review.

Offline verification: 733 tests passed, one existing todo, production build passed. The owner limited live processing to one batch; subsequent checks use the existing scan results and do not trigger another scan.

## Gmail follow-up: low-cost outcome review

On **2026-10-25 (America/Phoenix)** the owner authorized finishing the remaining Gmail scan in batches, keeping costs low and reviewing source email evidence in this session. This supersedes the earlier one-batch limit. Rules-first processing preserves unclear outcomes in the review queue instead of inventing a status or silently discarding the email. A nullable suggested outcome requires an explicit application and outcome selection before Update status is enabled. Emails for roles without a matching tracked application remain visible with an explanation and no update action. Existing known-outcome suggestions retain their fixed status and application-selection safeguards. The last-batch summary identifies how many suggestions need outcome review.

The existing apply endpoint accepts an optional `status` only for suggestions requiring outcome review; the backend remains responsible for owned-record checks, allowed outcomes, chronology and application identity. No browser credentials, raw source emails or real inbox content are stored in fixtures.

The review endpoint now supplies a complete validated total and offset pagination. The shared frontend API loads every page sequentially before presenting the queue, so the tracker and Settings do not silently stop at 100 suggestions. A failed, repeated, empty continuation or changed-total page produces a visible retry instead of an incomplete success. Legacy single-page responses remain supported during deployment.

## Live verification follow-up: experience count breakdown

On **2026-10-25 (America/Phoenix)**, the three-day view showed 207 roles while the selected level rows showed 44 Entry and 103 Mid. The remaining 60 roles had no stated experience level and were already included by design. The old footer made that contribution easy to miss.

The toolbar and experience menu now show the complete equation, and No level stated has its own always-included row. Every figure comes from the existing shared selection and updates with the active date and other filters. No filtering, ingestion, deduplication, match scores, ranking, or pagination logic changed. A regression verifies all 207 matching roles remain present and ordered, including all 60 unspecified-level roles, then checks date-window and all-level changes.
