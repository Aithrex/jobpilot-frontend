# JobPilot — Apply Assistant (Chrome extension)

The high-signal "apply" client for JobPilot. It autofills job applications from your
résumé-derived profile and drafts résumé-grounded answers to open-ended questions —
but **you always review and submit yourself.** No mass auto-apply, no spam, no
banned accounts. (The research is clear: spray-and-pray gets you detected and
ghosted; tailored, high-signal applications convert.)

The backend already exists (`jobpilot-backend/blueprints/apply.py`); this is its client.

## What it does
- **Autofill** name / email / phone / location / LinkedIn / GitHub / portfolio on
  Workday, Greenhouse, Lever, iCIMS, Ashby, and SmartRecruiters forms — only into
  empty fields, never overwriting what you've typed.
- **Draft an answer**: focus an open-ended question box, click *Draft answer*, and get
  résumé-grounded variants (via `/api/apply/answer`) to pick from and edit.
- **You submit.** The extension never clicks Submit.

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
- `manifest.json` — MV3 manifest (permissions, content-script matches)
- `config.js` — your API base + web-app origin (edit this)
- `background.js` — service worker: token storage + API proxy (`/apply/profile`, `/apply/answer`)
- `content.js` / `content.css` — the on-page panel: autofill + draft-answer
- `tokensync.js` — auto-syncs the JWT from the web app
- `popup.html` / `popup.js` — status, profile sync, manual token

## Notes
- No icons are bundled (Chrome uses a default) — drop `icon16/48/128.png` + an `icons`
  key in the manifest if you want branding.
- Add more ATS domains by extending both `host_permissions` and `content_scripts.matches`.
- Answer generation is metered by your plan's daily AI quota (server-side) and is free
  within it — safety and quality, never paywalled spam.
