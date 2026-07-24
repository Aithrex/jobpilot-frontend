# Landing v8 — Design Brief (July 2026)

Companion to jobpilot-backend/docs/specs/resume-platform-v3.md (the API contract).
v8 evolves the existing v7 landing (live guest flow on /, DemoWorkspace idle
playground) — it is an upgrade of real surfaces, not a rebuild. Keep the single
useGuestFlow controller owned by LandingExperience, the flowActive collapse
contract, the LIGHT_SURFACE token pin, and the guest-workspace-window layoutId morph.

## Information hierarchy (4 sections, compact — no long scrollytelling)

1. `#try` HeroWorkspace — the product IS the hero. Left: headline + entitlement
   chips + dropzone CTA. Right: the live workspace window (demo when idle, real
   flow when active).
2. `#how` HowItWorksStory — NEW, short visual story: Upload -> Match -> Tailor as
   one animated horizontal pipeline (single SVG/DOM composition, in-view gated,
   ~8s loop, pause on hover/offscreen, reduced-motion = composed end state).
   One sentence per step, no cards grid.
3. `#workspace` EcosystemPreview — NEW interactive panel replacing the single
   screenshot: 5 tabs (Job opportunities and saved jobs / Application tracking /
   Interview prep / Skills and learning gaps / Career planning). Selecting a tab
   swaps a genuine visual panel (real product imagery or live micro-demo) with a
   directional slide+fade. One short sentence per tab. Keyboard operable
   (roving tabs, arrow keys), aria-selected, visible focus.
4. `#trust` TrustBand (rework) + FinalCta + footer. Three trust points w/ small
   icons: Real job sources; Tailoring without invented facts (IntegrityGuard);
   Private, time-limited guest data. Retention copy EXACTLY: unclaimed guest
   uploads "deleted from our systems within 30 days; residual encrypted backups
   expire within a further 90 days" (S3 versioning truth). No fabricated
   metrics/logos/testimonials.

## Hero copy (locked, no dashes/accents)

- H1: "Get 5 best-fit jobs from your resume. Free."
- Support: "Upload your resume with no account required. See the strongest real
  openings, understand why they fit, and tailor your resume for one."
- Guest chip: "No account: up to 5 matched jobs + 1 tailored resume"
- Account chip: "Free account: full job workspace + saved progress + 5 tailorings
  per UTC day"
- Primary CTA/dropzone: "Upload resume" (keep the existing test-depended label
  "Upload my resume to find matches" on the dropzone button if tests require;
  reconcile tests if changed). Secondary: "Sign in".
- NEVER the word "unlimited" anywhere.

## Hero state machine (extends useGuestFlow)

hero -> parsing -> profile (NEW) -> matches -> tailor -> done/gate

- State 1 idle: real dropzone + DemoWorkspace (exists). Demo content stays clearly
  marked ILLUSTRATIVE. Add the skill-token motion: small tokens drift from a
  stylized resume glyph into empty job-card slots (DOM/SVG, transform+opacity only).
- State 2 parsing: REAL backend phases from job.progress {phase, pct} (backend now
  emits parsing/extracting_skills/finalizing for guest_parse and
  reading_resume/searching_sources/ranking/finalizing for guest_matches). Render a
  truthful stepper fed by polled progress, aria-live="polite" region announcing
  phase changes. Never a fake timer; staged copy may still rotate flavor text but
  the STEP comes from the server.
- State 3 profile reveal (NEW `GuestProfileReveal.tsx`): built from the parse
  result `profile` block + structured. Show ONLY genuinely extracted fields:
  first name (display only), likely title, experience level, 6-10 skill chips
  (animate in from the resume glyph), location/work authorization only when
  present, short "What we understood" summary. A subtle
  completeness ring (derived from which fields parsed). Skill chips are
  interactive later on matches (see State 4). Primary action:
  "Find my matches" (auto-advance after ~2.5s if user idle; reduced-motion: no
  auto-advance animation, plain button). If a field is obviously wrong the user
  can proceed anyway; no edit UI (product does not support correction yet — do
  not build one).
- State 4 matches: existing GuestResultsDashboard. Add: progressive card entrance
  as results arrive (or staggered on ready), skill-chip -> job highlight (hovering
  a matched skill in the detail highlights it on cards), honest counts ("We found
  N strong matches" when N<5, from total_considered/empty_reason), distinct empty
  vs timeout vs failure states from sources_report/empty_reason, gaps labeled
  "from your resume, not mentioned in this posting".
- State 5 tailor: existing states; the transition from selected job card into the
  compare view is the marquee motion moment (layout morph of the selected card
  into the tailored pane). Keep IntegrityGuard indicator + original-vs-tailored
  compare + PDF/DOCX download (first download NEVER gated behind signup).
- State 6 gate: after the one tailoring is used, or on "open full workspace":
  polished SignupCta (exists) with copy: "You have used your guest tailoring.
  Create a free account to save your work, see the full job workspace, and tailor
  up to 5 resumes per day."

## Motion system

framer-motion only (no new libs). EASE/DUR from landing/_shared. The 5 mandated
moments: (1) skill tokens -> matching system (idle hero), (2) parsed skills ->
profile chips, (3) job cards entrance/rerank around selected skills, (4) selected
job -> tailoring compare morph, (5) ecosystem tab panel transitions. Rules:
transform+opacity only; in-view gating + document.hidden pause; lazy-load heavy
artwork below fold; prefers-reduced-motion = full static equivalents (composed
end states, no auto-advance); no scroll hijack, no sticky sections taller than one
viewport; content never depends on animation completion (initial styles must be
visible-safe: no opacity-0 orphans).

## Responsive + a11y

390px mobile: no horizontal overflow; hero stacks copy -> window; ecosystem tabs
become a horizontal scroll-snap chip row. Keyboard: dropzone focusable +
Enter/Space opens picker (exists); tabs/cards operable; visible focus rings.
Headings: one h1 (hero), h2 per section. aria-live for async progress. Contrast
AA on LIGHT_SURFACE tokens. CLS: reserve heights for demo/panel stages. LCP: hero
h1 stays the LCP element; no new blocking assets; below-fold imagery lazy +
dimensions declared (AVIF/WebP via ProductShot pattern).

## Title normalization (correctness fix)

Defend at the boundary in BOTH toJob mappers (lib/careerJobs.ts:70 and
WorkdayJobsPanel.tsx:210) and the guest matches consumption: title =
j.title ?? j.job_title ?? j.role ?? "" (trimmed); dedupe keys use the normalized
title. Backend also normalizes server-side; FE defense is belt-and-braces.

## Conversion moment

The gate appears ONLY after value delivery (download available first). Entitlement
copy everywhere matches the chips above; authenticated view never says unlimited.
