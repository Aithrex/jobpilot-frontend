# Dashboard Redesign - Design Review (second pass)

Reviewer: design-review subagent (fresh read, no authoring context)
Target doc: `docs/design/dashboard-redesign.md` (revised, carries "Status: Revised after design review")
Worktree reviewed against: `d:\Aithrex\jobpilot-frontend\.worktrees\dashboard-redesign`

## Method

I read the design doc end to end, then independently verified every load-bearing claim against the worktree source: `index.css` width/glass recipes, `AppShell.tsx` overflow, `TodayPage.tsx`, `KpiCards.tsx`, `nav.config.ts`, `App.tsx`, `ApplicationsPage.tsx`, `HeroPanel.tsx`, `primitives.tsx`, the `useAutoSubmit` hook, `types/autoSubmit.ts`, `package.json` scripts, and the test files the doc cites. The doc is a revision that claims to have addressed a prior review's 2 HIGH / 4 MEDIUM / 5 NIT findings; I re-verified those resolutions against source rather than trusting the "Responses to design review" section.

The verdict is mechanical: count HIGH + MEDIUM. This pass found **0 HIGH, 0 MEDIUM, 3 NIT**, so the gate is **APPROVED**. The NITs are recorded below but do not block.

---

## Findings

### 1. [NIT] Removing `FeatureLaunchpad` from the main return leaves a now-unused mock in `today-first-run.test.tsx`

Section 9 says to "remove the `FeatureLaunchpad` render from `TodayPage` and its import" but keep the component file. Verified in `src/app-shell/pages/__tests__/today-first-run.test.tsx`: it `vi.mock(...)`s `FeatureLaunchpad` as `<div data-testid="launchpad" />` (lines 41-44) but never queries `launchpad` nor asserts on it. After the render is removed, that `vi.mock` is dead but harmless - the test still passes because the main-return path it exercises asserts only on Refresh / Continue-setup / the "this home fills in" copy. The doc is correct that no assertion breaks.

Concrete fix (optional, housekeeping): when the implementer removes the render + import from `TodayPage`, also delete the now-orphaned `vi.mock('@/app-shell/pages/today/FeatureLaunchpad', ...)` block from `today-first-run.test.tsx` so a reader is not misled into thinking the launchpad is still mounted. Not required for correctness.

### 2. [NIT] `scripts/ascii-copy-sweep.mjs` existence is assumed by the named `copy:check` gate but not verified in the doc

Section 8 names `pnpm copy:check` as a hard gate for the new ASCII copy. Verified `package.json` defines `"copy:check": "node scripts/ascii-copy-sweep.mjs --check"`, so the gate exists. The doc never states what the sweep rejects (any non-ASCII byte), which matters because the doc itself uses en/em-dash glyphs throughout its prose. The replacement strings the doc specifies for copy (`"Tracker, inbox, and daily pipeline"`, `"Set how far Auto-Apply will go once it is back on"`, `"PAUSED - PREVIEW"`, the paused-line sentences) are all ASCII and will pass.

Concrete fix (optional): add one line to section 8 stating the sweep's rule explicitly - "`copy:check` fails on any non-ASCII byte in user-facing copy; use a hyphen-minus `-`, never an en/em dash" - so the implementer who copies strings out of the doc's dash-heavy prose does not paste a Unicode dash into a component. The spec strings themselves are already safe.

### 3. [NIT] `firstRunHome` early return keeps `FeatureLaunchpad`-free structure, so the "remove import" step needs a note that the early return never referenced it

Section 3.3 and section 9 are correct that only the main (non-first-run) return renders `FeatureLaunchpad`; the `firstRunHome` early return (verified in `TodayPage.tsx` lines 235-255) only renders header + `ResumeEntryPanel` + `ContinueWorkspaceSetup`. So removing the top-level `import { FeatureLaunchpad }` is safe for both returns. The doc does not spell this out, which could make an implementer hesitate ("does the early return use it?").

Concrete fix (optional): one clause in section 9 - "the `firstRunHome` early return does not render `FeatureLaunchpad`, so dropping the import affects only the main return." Purely clarifying.

---

## Hard-constraint checklist (task's required review focus)

Each required check, with the verdict and the source evidence I confirmed.

### Width strategy - PASS
- `.page-full` exists in `index.css` (lines ~1413-1437): `width:100%; padding-inline:1rem; max-width:120rem; margin-inline:auto`, with `1.5rem`/`2rem` inline padding at `sm`/`lg`. The doc quotes this accurately.
- The doc changes ONLY `TodayPage`'s two outer `div`s from `page-measure` to `page-full`. Verified both returns currently use `page-measure` (lines 236, 257). No edit to the `.page-measure`/`.page-full` recipes themselves, so no other page's measure moves.
- No regression: verified `GrowPage` and `SettingsPage` use `page-measure`; `DiscoverPage`, `ApplicationsPage`, `CraftPage` use `page-full`. The doc's claim matches source exactly, so it is a proven in-repo recipe, not an invention.
- Overflow clipping accounted for: `AppShell.tsx` line 85 is `<main ... className="flex-1 overflow-x-hidden ...">`, and the shell comment itself explains negative-margin/`100vw` children get clipped. The doc explicitly forbids `100vw`/negative margins and relies on `margin-inline:auto` + padding, which cannot produce the clip. Correct.
- The `.page-full.studio-canvas` trap is real and correctly flagged: verified `index.css` has `.page-full.studio-canvas { box-shadow: 0 0 0 100vmax hsl(var(--background)); }` and that `CraftPage` uses `surface-studio studio-canvas page-full`. The doc's instruction to use `page-full` ALONE on Home (no `studio-canvas`/`surface-studio`) is accurate and prevents an unwanted full-viewport box-shadow.

### Pain-point mapping - PASS
Section 4 has a keep/cut/merge decision for every one of the eight named panels, each tied to a concrete manual-apply pain:
- HeroPanel - KEEP (promote), TopMatchesPanel - KEEP, ResumeEntryPanel - KEEP (reposition), ApplicationTrend - KEEP, ConversionFunnel - KEEP, RecentActivityPanel - KEEP, KpiRow - KEEP (re-orient), FeatureLaunchpad - CUT from Home (file retained).
- The CUT is justified against the brief's own standard (discoverability already covered by palette + More sheet + nav), and the merge question is explicitly addressed and rejected with a reason. Complete and internally consistent.

### Auto-Apply demotion - PASS
- Desktop glass bar + mobile Instagram strip specified concretely in 5.4/5.5, as one component emitting one labeled `<section aria-label="Auto-Apply preview (paused)">` with inner `hidden md:flex` / `md:hidden` layouts - no double-announce.
- Single nav source of truth honored: remove `auto-apply` from `APPLY_SECTIONS` (verified it currently lives there in `nav.config.ts`), which cascades to palette/search/More sheet since all derive from `ALL_DESTINATIONS`. The two consequential copy edits (Apply `NAV_ITEMS` hint, Settings `autonomy` hint) are both verified stale in source and given exact ASCII replacements.
- Route kept reachable: verified `App.tsx` line 193 `<Route path="auto-apply" element={<AutoApplyTab />}>` and the `index` redirect to `tracker` (line 192). The doc keeps both. The emailed approve-token path is verified in `ApplicationsPage.tsx` to mount `ApproveLinkConfirm` on the `approve` query param independent of the SubNav items, so the demotion cannot break approvals.
- Auto-Apply code preserved: `src/components/autoSubmit/*`, `useAutoSubmit`, `types/autoSubmit.ts` all left intact per section 5.1 and the "Keep" list in section 9.
- Preview/paused (not live-submitting) labeling: section 5.4/5.6 lead with "Paused"/"Preview", the only control is navigation, and the queued chip is explicitly neutral/muted (never cherry=active, never sage=verified). The state table correctly ties the skeleton to `available === undefined` / `settingsLoading` (not `pendingLoading`), which I verified is right: in `useAutoSubmit`, `pendingQuery` is `enabled: available === true`, so `pendingLoading` never fires during the real first load - keying the skeleton off it would have shown a false "paused" flash. The doc gets this subtlety correct.
- Defensive chip derivation verified against the type: `AutoSubmitApprovalView` marks `company`/`role`/`title` as `?: string | null` and exposes `url`/`application_url`/`apply_url`, so the `label = role ?? title ?? hostOf(apply_url ?? application_url ?? url) ?? 'Queued role'` fallback is implementable exactly as written.

### Design-system fidelity - PASS
- Semantic tokens only, no raw hex: section 6.2 enumerates the token set; `.glass-pane` verified in `index.css` with both the `@supports not (backdrop-filter)` opaque fallback and the `prefers-reduced-transparency: reduce` fallback. "Cherry is action not background" is stated as a component-layer invariant with a grep-checkable rule.
- Glass budget: section 1 audits Home content glass to exactly 1 pane (`AutoApplyPreviewBar`), shell chrome glass (`.glass-nav*`) counted separately as pre-existing. Verified `.glass-pane` and the `.glass-nav*` family are distinct recipes.
- No second brand color; light + dark + mobile all addressed; reduced-motion, focus-visible, ARIA landmarks, and no-color-alone all covered in 6.3.

### Resume / Jobs / Tailoring intact - PASS
Section 9 "Do NOT touch" lists `ResumeEntryPanel` behavior (upload stays via `apiService.uploadResumeForParser`), `DiscoverPage`/jobs, and `CraftPage`/tailoring as polish-only. The only Home-side change to `ResumeEntryPanel` is positional (prominent on first-run, quiet once a resume exists), with behavior unchanged. No data-layer edits (`src/lib/api.ts` untouched).

### KpiRow re-orientation feasibility - PASS
Verified `KpiCards.tsx` currently hardcodes `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4` in BOTH the loading-skeleton branch and the data branch. The doc's prop contract (section 4) threads one `wrap` class derived from `orientation` through both branches, defaulting to `'grid'` so the single existing caller (`TodayPage`) is behavior-identical unless it passes `orientation="rail"`. This is implementable exactly as specified and avoids the loading->loaded layout shift. The prior review's HIGH #1 is genuinely resolved.

### DOM recompose / landmark map feasibility - PASS
Verified the current `TodayPage` nests `HeroPanel` + `KpiRow` as siblings inside one `<motion.section aria-label="Today's status">`. The doc's recompose correctly pulls `KpiRow` into its own `<section aria-label="Where you stand">` in the right column and retires the combined `"Today's status"` label, replacing it with `"What needs you"` + `"Where you stand"`. The grid classes (`grid grid-cols-1 gap-6 xl:grid-cols-3`, `xl:col-span-2`, `xl:col-span-1`) and the reassigned `rise(order)` stagger are concrete and match the existing `rise`/`riseIn` helper usage. The prior review's HIGH #2 is genuinely resolved.

### Build gate honesty - PASS
Verified `package.json`: `"build": "vite build"` (no `tsc`), `"test": "vitest run"`, `"copy:check": "node scripts/ascii-copy-sweep.mjs --check"`. The doc's section 8 states this accurately - there is no typecheck gate, so "no new TS errors" is author-verified, not CI-enforced. Honest and correct.

---

## Verified Assumptions

These doc claims were checked against source and are TRUE:

1. `.page-full` recipe (120rem cap, auto margins, no negative margins) exists in `index.css` as quoted.
2. `.page-full.studio-canvas` paints a `100vmax` box-shadow; `CraftPage` uses `surface-studio studio-canvas page-full`. The warning to keep Home on `page-full` alone is justified.
3. `AppShell` `<main>` is `overflow-x-hidden` (line 85); the shell's own comment documents the clipping behavior the doc relies on.
4. `TodayPage` currently uses `page-measure` on both the first-run and main returns; only `HeroPanel`+`KpiRow` share the one `"Today's status"` section.
5. `KpiCards.tsx` hardcodes the 4-up grid in two separate branches (skeleton + data).
6. `nav.config.ts` has the `auto-apply` entry in `APPLY_SECTIONS`, the stale Apply `NAV_ITEMS` hint `"Tracker, Auto-Apply, and inbox"`, and the stale `autonomy` hint `"How far Auto-Apply may go without you"` with `keywords: "auto apply autopilot threshold approval"`. All three edit targets exist exactly as described.
7. `ALL_DESTINATIONS` is derived from `NAV_SECTIONS`, so removing the `APPLY_SECTIONS` entry removes it from palette/search/More sheet consistently.
8. `App.tsx` keeps the `auto-apply` route and an `index` redirect to `tracker`.
9. `ApplicationsPage.tsx` mounts `ApproveLinkConfirm` on the `approve` query param independent of the SubNav tab strip.
10. `useAutoSubmit` exposes `available` (`undefined` until settings resolve, `false` when flag off), `pending`, `waiting`, `pendingLoading`, `pendingError`, `settingsLoading`, `refetchPending`; `pendingQuery` is `enabled: available === true` and the paused-skeleton-vs-paused-line distinction the doc draws is correct.
11. `AutoSubmitApprovalView` marks `company`/`role`/`title` as `?: string | null` and exposes `url`/`application_url`/`apply_url`, so the defensive chip fallback is implementable verbatim.
12. `.glass-pane` has both an opaque `@supports` fallback and a `prefers-reduced-transparency` fallback; `.glass-nav*` is a separate chrome recipe.
13. `HeroPanel` carries `max-w-2xl` on its text blocks; `PanelEmpty` carries `max-w-sm` - so the "reading measure preserved per panel" claim is true.
14. `package.json` scripts are exactly `build=vite build` (no tsc), `test=vitest run`, `copy:check` present.
15. `today-first-run.test.tsx` mocks `FeatureLaunchpad` as a stub but asserts nothing on it; no test file asserts "Auto-Apply" in the Apply SubNav tab strip (the only matches are in `autoSubmit/__tests__`, `landing/__tests__`, and `job-search/**`, all unrelated to the Apply nav strip). The doc's grep claim in 5.2 is accurate.

## Unverified / Wrong Assumptions

No doc claim was found to be wrong. The following are UNVERIFIED (out of practical reach for a static review) and are flagged as the doc's own stated open assumptions, not defects:

1. Visual/breakpoint correctness of the two-column command center, glass rendering, light/dark parity, and `prefers-reduced-motion` behavior - the doc itself routes these to manual visual verification (section 8), which is the right tool. Not independently confirmable here.
2. That the recovered-width arithmetic (768px at >=1920px, ~160px at 1440px) renders as described - the recipe is correct; the pixel outcome depends on runtime viewport and was not rendered.
3. `scripts/ascii-copy-sweep.mjs` exists (the `package.json` script references it); I confirmed the script entry but did not open the sweep implementation to confirm its exact reject rule. The specified replacement strings are ASCII regardless.

---

## Verdict

0 HIGH, 0 MEDIUM, 3 NIT -> **APPROVED**.

The revision genuinely resolved the prior pass's two HIGH findings (KpiRow prop contract across both branches; concrete DOM recompose + landmark map) and the MEDIUM findings (chip fallback, `available === undefined` state, exact hint strings, stale-hint + test grep). Every load-bearing technical claim I spot-checked against source held. The three NITs are documentation/housekeeping polish and do not block implementation.
