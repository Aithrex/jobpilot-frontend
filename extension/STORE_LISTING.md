# Chrome Web Store Listing — Aspirely Apply Assistant

Copy/paste source for the store listing fields. Update before each major submission.
(Adapted from the ApplyPilot listing draft.)

## Name
Aspirely — Apply Assistant

## Summary (≤132 chars)
Auto-fills job applications as you open them — Workday, Greenhouse, Lever & more — with résumé-grounded answers. You stay in control.

## Category
Productivity

## Language
English

## Detailed description
Stop retyping the same details on every job application.

Aspirely fills applications the moment you open them: name, contact, links, education,
experience, skills — even Workday's dropdowns and type-to-search lists. On multi-step
forms it moves to the next step for you once everything only-you-can-answer is done,
after a countdown you can cancel. A calm status card shows exactly what was filled,
what still needs you, and lets you pause any time.

For open-ended questions — "Why this company?", "Tell us about a project" — click Draft
and get answers grounded in YOUR real résumé, aligned to the job. You edit and choose;
nothing is ever invented.

Key features
• Hands-free autofill on Workday, Greenhouse, Lever, Ashby, SmartRecruiters, Workable —
  plus a smart fallback for other ATS forms.
• Deep Workday support: dropdowns, skills & school search lists, per-row education and
  experience fields.
• Auto-continue on multi-step forms — clicks the site's own Next when a step is complete;
  NEVER clicks Submit. The final submit is always your click.
• Review Card: every filled value listed with a confidence badge, inline-editable.
• Résumé-grounded AI answers for essay questions — no clichés, no fabricated facts.
• Integrity by design: fills only empty fields, never answers EEO/demographic or salary
  questions for you, never touches CAPTCHAs, client-side rate limits keep behavior human.
• Private by design: your profile lives in your browser; nothing tracked or sold.

How it works
1. Sign in to your Aspirely account — the extension connects automatically.
2. Open a job application. Watch it fill.
3. Answer the few things only you can, review, and submit.

See the privacy policy for exactly what is stored and sent.

## Privacy policy URL
https://aspirely.me/extension-privacy.html
(the page lives at `jobpilot-frontend/public/extension-privacy.html` — deployed with the SPA)

## Screenshots (1280×800, PNG)
1. An application mid-autofill with the status HUD visible.
2. The Review Card with confidence badges.
3. The popup with Flow Mode toggles.
4. A drafted answer on an essay question.

## Privacy practices tab (dashboard answers)
- Single purpose: "Automatically fills job-application forms from the user's own
  résumé profile and drafts answers to application questions."
- Data collected: "Personally identifiable information (name, email, phone — the user's
  own profile, stored locally)". Not sold; not used for unrelated purposes; not for
  creditworthiness.
- Permissions justification (request ONLY these — the store auto-rejects
  requested-but-unused permissions; ApplyPilot was rejected for `scripting`):
  - storage: keep the user's own profile/settings on-device
  - host permission `https://aspirely.me/*`: call the user's own Aspirely API
    (profile sync, answer drafting) from the service worker
  - content scripts (declared matches, not permissions): read & fill the
    application form on the supported ATS domains; sync the sign-in token on
    the Aspirely app
