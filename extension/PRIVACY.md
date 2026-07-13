# Privacy Policy — Aspirely Apply Assistant

_Last updated: 2026-07-12_

Aspirely Apply Assistant ("the extension") helps you fill job-application forms and draft
résumé-grounded answers to application questions. This policy explains what data it handles
and where that data goes.

## What the extension stores

The extension stores the following **locally in your browser** (`chrome.storage.local`):

- **Your application profile** — name, contact details, links, skills, education, work
  experience, and the work-authorization answers you declared in your Aspirely account.
- **Your sign-in token** — a session token (JWT) issued by your Aspirely account, synced
  automatically from the Aspirely web app when you sign in there. It is stored only on your device.
- **Settings** — your Flow Mode preferences (auto-fill / auto-continue), the auto-submit
  device switch, and client-side rate-limit counters.

This data stays on your device. It is not sold, shared, or transmitted to any third party.

## What the extension sends, and to whom

The extension communicates only with **the Aspirely backend** (the API that powers your
Aspirely account). It sends data only for these purposes:

- **Profile sync:** the extension requests your résumé-derived profile from your Aspirely
  account to seed the local profile.
- **Answer drafting:** when you use "Draft an answer", the question text is sent to the
  backend, which uses an AI model to draft answers grounded in your résumé. Drafts are
  returned to your browser; you edit before using them.
- **Opt-in auto-submit (off by default):** if — and only if — you opted in inside the
  Aspirely app AND enabled the device switch, the extension checks your approved-applications
  list and reports back after submitting an application you approved.

The extension does **not** send page contents, keystrokes, or browsing activity anywhere.
(An optional AI field-matching mode exists in the code but ships disabled; if ever enabled it
sends only a PII-redacted field label.)

## What the extension does NOT do

- It does not track your browsing across sites.
- It does not collect analytics or telemetry.
- It only runs on known job-application domains (see host permissions) plus the Aspirely app
  (for token sync).
- It never solves or bypasses CAPTCHAs.
- It never submits an application unless you explicitly approved that specific application in
  the Aspirely app and enabled auto-submit on the device — and even then only after a visible,
  cancellable countdown. Auto-continue only ever clicks a step's own Next/Continue button,
  never Submit.
- It fills only empty fields — it never overwrites what you typed.
- It never auto-answers demographic/EEO, salary, or date-of-birth questions. Work-authorization
  prompts are answered only from the visa status you explicitly declared in your account, and
  are flagged for your review.

## Permissions

- **storage** — to save your profile, token, and settings locally.
- **host access to the Aspirely backend** (`aspirely.me`) — to sync your profile and draft
  answers.
- Form filling itself uses content scripts that run **only** on the supported job-application
  domains listed in the extension manifest (and on the Aspirely app, to sync your sign-in).

## Your control

- Flow Mode (auto-fill / auto-continue) can be turned off any time in the popup; every
  automatic action has a visible status card with Pause and Cancel.
- You can disconnect at any time from the popup, which clears your session token.
- Uninstalling the extension removes all locally-stored data.

## AI processing

Drafted answers are produced by an AI model (Anthropic Claude, via the Aspirely backend) using
your résumé data. Aspirely never fabricates facts that aren't in your résumé, and you should
review every draft before submitting — you are responsible for the content you submit on
applications.

## Contact

Questions about this policy: harshith@aithrex.tech
