# JobPilot — Apply Assistant (Chrome extension)

The high-signal "apply" client for JobPilot. It autofills job applications from your
résumé-derived profile and drafts résumé-grounded answers to open-ended questions —
but **you always review and submit yourself.** No mass auto-apply, no spam, no
banned accounts. (The research is clear: spray-and-pray gets you detected and
ghosted; tailored, high-signal applications convert.)

The backend already exists (`jobpilot-backend/blueprints/apply.py`); this is its client.

## What it does — "Fill, Review, One Tap"
- **Autofill** name / email / phone / location / LinkedIn / GitHub / portfolio /
  current company on Workday, Greenhouse, Lever, Ashby, SmartRecruiters, Workable
  (and iCIMS) forms — only into empty fields, never overwriting what you've typed.
- **Review Card**: after autofill, an isolated (shadow-DOM) overlay lists every
  field it filled, the value, and a per-field confidence — green (deterministic),
  amber (guessed / AI-matched, verify), red (do it yourself). Every value is
  inline-editable and keyboard-navigable.
- **Draft an answer**: résumé-grounded variants (via `/api/apply/answer`) for
  open-ended questions — from the panel (focus a box → *Draft*) or from the Review
  Card's per-question *Draft* button.
- **Never auto-submits, never spray-and-pray.** No Submit click, no CAPTCHA bypass;
  a client-side rate limit (40/hr, 150/day, with jitter) keeps behavior human.

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

## Install (unpacked)
1. Edit `config.js` → set `API_BASE` (and `WEB_APP_ORIGIN`) for your environment.
   - For **prod**, also add your API origin to `host_permissions` and your web-app
     origin to the second `content_scripts.matches` block in `manifest.json`.
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** →
   select this `extension/` folder.
3. Sign in to the JobPilot web app in the same browser. The token **auto-syncs**
   (via `tokensync.js`); or paste it manually in the extension popup.

## How auth works
The extension uses the **same JWT** the web app issues. `tokensync.js` reads it from
the web app's `localStorage['auth_token']` and stores it in `chrome.storage.local`;
the service worker sends it as a `Bearer` token. Nothing is sent anywhere except your
own JobPilot backend.

## Files
- `manifest.json` — MV3 manifest (permissions, content-script matches + load order)
- `config.js` — your API base + web-app origin + LLM-disambiguation toggle (edit this)
- `background.js` — service worker: token storage + API proxy (`/apply/profile`,
  `/apply/answer`, gated `field-map`); validates every message envelope
- `content.js` / `content.css` — on-page panel + autofill orchestrator
- `adapters/*.js` — per-ATS field maps (`greenhouse`, `lever`, `ashby`, `workday`,
  `workable`, `smartrecruiters`, `generic`) + `index.js` registry
- `lib/resolver.js` — field-resolution engine (deterministic → semantic → LLM)
- `lib/reviewcard.js` — the shadow-DOM Review Card overlay
- `lib/redact.js` — PII redaction (only used on the opt-in LLM path)
- `lib/ratelimit.js` — client-side fill cap + humanizing jitter
- `tokensync.js` — auto-syncs the JWT from the web app
- `popup.html` / `popup.js` — status, profile sync, manual token

> Content scripts are declared in load order (config → libs → adapters → resolver →
> review card → content). They can't be ES modules, so each file attaches to the
> isolated-world global (`self.JP*` / `self.__JP_ADAPTERS`) — the same pattern as
> `config.js`. None of this is visible to the host page's `window`.

## Notes
- No icons are bundled (Chrome uses a default) — drop `icon16/48/128.png` + an `icons`
  key in the manifest if you want branding.
- Add more ATS: drop an `adapters/<ats>.js` (implement `match/fields/essayQuestions`,
  push onto `self.__JP_ADAPTERS`), then extend `host_permissions`,
  `content_scripts.matches`, and the `content_scripts.js` load list. No adapter is
  strictly required — the generic semantic matcher handles unknown ATS.
- Answer generation is metered by your plan's daily AI quota (server-side) and is free
  within it — safety and quality, never paywalled spam.
