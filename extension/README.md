# Aspirely — Apply Assistant (Chrome extension)

The high-signal "apply" client for Aspirely. It autofills job applications from your
résumé-derived profile and drafts résumé-grounded answers to open-ended questions —
but **you always review and submit yourself.** No mass auto-apply, no spam, no
banned accounts. (The research is clear: spray-and-pray gets you detected and
ghosted; tailored, high-signal applications convert.)

This is a plain **MV3 extension** — vanilla JS/CSS, **no build step, no bundler, no
dependencies**. The folder loads as-is. The backend already exists
(`jobpilot-backend/blueprints/apply.py`); this is its client.

## What it does — "Fill, Review, One Tap"
- **Autofill** name / email / phone / location / LinkedIn / GitHub / portfolio /
  current company on Workday, Greenhouse, Lever, Ashby, SmartRecruiters, and
  Workable forms — only into empty fields, never overwriting what you've typed.
  Other ATSes (e.g. iCIMS) are handled best-effort by the generic semantic
  matcher, so expect more amber-confidence fields there.
- **Review Card**: after autofill, an isolated (closed shadow-DOM) overlay lists
  every field it filled, the value, and a per-field confidence — green
  (deterministic), amber (guessed / AI-matched, verify), red (do it yourself).
  Every value is inline-editable and keyboard-navigable.
- **Draft an answer**: résumé-grounded variants (via `/api/apply/answer`, the same
  backend answer generator the app uses) for open-ended prompts like "why this
  company", "what makes you interesting", or relevant-work questions — from the
  panel (focus a box → *Draft*) or from the Review Card's per-question *Draft*
  button. Answers reuse your parsed résumé; you edit before submitting.
- **Default: never auto-submits, never spray-and-pray.** No Submit click, no CAPTCHA
  bypass; a client-side rate limit (40/hr, 150/day, with jitter) keeps behavior human.

## Opt-in auto-submit (off by default)
The default and the fallback everywhere is the Review Card — *you* click Submit. As a
strict, per-application exception, the extension can click the site's **own** Submit
button, but **only** when all three gates pass:
1. **Opt-in** — the server settings endpoint reports you opted in, **and** the local
   toggle in the popup ("Allow auto-submit on this device") is on. That toggle defaults
   **off** and is an always-available **kill switch**: turning it off disables
   auto-submit here regardless of server state.
2. **Approval** — the server's pending list has an `approved`, `eligible`, unexpired
   record whose URL matches this exact page (host + path). The backend only lists
   applications past their undo window (records still waiting arrive in `waiting`, not
   `pending`); the extension re-checks the URL match, the `eligible` flag, and expiry.
3. **No CAPTCHA** — the page has no bot-check widget. CAPTCHA is **detect-only**; we
   never solve or bypass it. If one is present (or appears mid-countdown), we fall back
   to the Review Card and surface it.

When eligible, a prominent **countdown** (5s) with a big **Cancel** button appears; the
site's Submit is clicked only if the countdown finishes uncancelled. Cancel (button,
Escape, or clicking the backdrop) returns to the Review Card. After a successful click
the extension reports to the backend (`mark-submitted`); it **never clicks twice**
(in-memory guard + a persisted done-marker written *before* the click). Applications
with unanswered open-ended questions are never auto-submitted.

Backend contract (authenticated, same `Bearer` token as the rest of the extension):
`GET /api/apply/auto-submit/settings` (opt-in flag; 404 / non-`{enabled:true}` ⇒ review-only),
`GET /api/apply/auto-submit/pending` → `{ pending:[…], waiting:[…] }`, each item with
`application_id`, `url`, `status`, `eligible`,
`POST /api/apply/auto-submit/mark-submitted` (`{ application_id, url, ats, status }`).
When the master flag is off every endpoint 404s and the extension behaves as
review-only — no error, no spinner.

## How autofill resolves a field (in order)
1. **Deterministic** — the active ATS adapter's `selector → canonical` map
   (`adapters/<ats>.js`; registry `adapters/index.js` picks the adapter by URL +
   DOM signature, falling back to a generic semantic matcher).
2. **Semantic** — label / aria-label / placeholder / name / id matching.
3. **LLM disambiguation** — last resort only, **off by default**. Requires
   `LLM_FIELD_DISAMBIGUATION` in `config.js` **and** a backend field-map endpoint
   (not shipped — coordinate the contract with the backend first). The page snippet
   is **PII-redacted** (`lib/redact.js`) before anything leaves the browser.

Sensitive / EEO / work-authorization / salary / date-of-birth fields are **never**
auto-answered — they're surfaced in the Review Card for you to answer yourself.

## Install (unpacked — the normal path)
1. Edit `config.js` → set `API_BASE` (and `WEB_APP_ORIGIN`) for your environment.
   - Dev: `API_BASE: "http://localhost:5000/api"`, `WEB_APP_ORIGIN: "http://localhost:5173"`.
   - For **prod**, also add your API origin to `host_permissions` and your web-app
     origin to the second `content_scripts.matches` block in `manifest.json`.
2. Open Chrome → `chrome://extensions`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select this `extension/` folder.
5. The Aspirely icon appears in the toolbar (pin it for quick access).

## Connect your account
1. Click the Aspirely toolbar icon → the popup shows your connection status.
2. Click **Open Aspirely to sign in** and sign in to the web app in the same browser.
   The extension **auto-syncs** the JWT from the app's `localStorage['auth_token']`
   (via `tokensync.js`) — no copy/paste.
3. Back in the popup the status turns green ("Connected as …"). Click **Sync my
   profile** to pull your latest résumé-derived fields.
4. Fallback: if auto-sync isn't available, open **Advanced · connect manually** in the
   popup and paste your JWT.

Auth expiry is handled gracefully: any **401** clears the stored token in the service
worker (mirroring the app's forced-logout), so the popup simply shows "Not signed in"
and the on-page panel disables its actions — it never spins on a dead token. Re-open the
app to re-sync. If the backend is unreachable you get a plain "Can't reach Aspirely"
message, never a raw error.

## Packaging (optional)
The unpacked folder is directly installable, so packaging is only needed to share a
single file. It is **not** a build step.
- **macOS / Linux / Git Bash:** `cd extension && ./package.sh` →
  `dist/aspirely-extension-<version>.zip`.
- **Windows PowerShell:**
  `Compress-Archive -Path manifest.json,config.js,background.js,content.js,content.css,popup.html,popup.js,tokensync.js,adapters,lib -DestinationPath dist\aspirely-extension.zip`

## Files
- `manifest.json` — MV3 manifest (minimal permissions: `storage`, `activeTab`,
  `scripting`; per-ATS `host_permissions`; content-script matches + load order)
- `config.js` — your API base + web-app origin + LLM-disambiguation toggle (edit this)
- `background.js` — service worker: token storage + API proxy (`/apply/profile`,
  `/apply/answer`, gated `field-map`, `/apply/auto-submit/*`); validates every message
  envelope; drops the token on any 401
- `content.js` / `content.css` — on-page panel + autofill orchestrator (branches to
  auto-submit when eligible, else the Review Card)
- `adapters/*.js` — per-ATS field maps (`greenhouse`, `lever`, `ashby`, `workday`,
  `workable`, `smartrecruiters`, `generic`) + `index.js` registry
- `lib/resolver.js` — field-resolution engine (deterministic → semantic → LLM)
- `lib/reviewcard.js` — the shadow-DOM Review Card overlay
- `lib/autosubmit.js` — opt-in auto-submit: the three gates, submit-button finder,
  cancellable countdown overlay, and one-shot submit + report
- `lib/redact.js` — PII redaction (only used on the opt-in LLM path)
- `lib/ratelimit.js` — client-side fill cap + humanizing jitter
- `tokensync.js` — auto-syncs the JWT from the web app
- `popup.html` / `popup.js` — connection status, profile sync, kill switch, manual token
- `package.sh` — optional zip helper (no build system)

> Content scripts are declared in strict load order (config → libs → adapters →
> resolver → **review card → autosubmit** → content). They can't be ES modules, so each
> file attaches to the isolated-world global (`self.JP*` / `self.__JP_ADAPTERS`) — the
> same pattern as `config.js`. None of this is visible to the host page's `window`.

## Notes
- No icons are bundled (Chrome shows a default). To brand the toolbar, drop
  `icons/icon16.png`, `icon48.png`, `icon128.png` and add an `"icons"` key to the
  manifest.
- Add more ATS: drop an `adapters/<ats>.js` (implement `match/fields/essayQuestions`,
  push onto `self.__JP_ADAPTERS`), then extend `host_permissions`,
  `content_scripts.matches`, and the `content_scripts.js` load list. No adapter is
  strictly required — the generic semantic matcher handles unknown ATS.
- Answer generation is metered by your plan's daily AI quota (server-side) and is free
  within it — safety and quality, never paywalled spam.
