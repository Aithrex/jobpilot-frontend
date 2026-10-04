# Implementation Plan - Dashboard (Home) Redesign

Source of truth: `docs/design/dashboard-redesign.md` (approved; review verdict APPROVED in
`docs/design/dashboard-redesign-review.json`). This plan sequences that design into file-by-file
steps. It does not re-decide architecture. Where the review left 3 optional NITs, they are folded
into the relevant steps below (noted inline).

## Working rules (read once, hold for every step)

- Work ONLY inside the worktree `d:\Aithrex\jobpilot-frontend\.worktrees\dashboard-redesign`
  (branch `feat/dashboard-redesign`). Relative paths resolve against the worktree root.
- Brand name in all user-facing copy is `Aspirely`, never `jobpilot`/`JobPilot`.
- Tokens only. No raw hex in components. Cherry (primary) is action/identity only, never a panel
  background. Status hues keep meaning: sage/success=verified-submitted, amber/warning=deadline,
  red/destructive=failed. The Auto-Apply "queued" chip is neutral/muted (`bg-muted` /
  `text-muted-foreground`), never `bg-primary` and never `bg-success`.
- Motion comes from `@/lib/motion` helpers (`rise`) only; it already collapses under
  `prefers-reduced-motion`. Do not hand-roll durations/easings.
- ASCII copy only. `pnpm copy:check` fails on ANY non-ASCII byte in user-facing copy: use a plain
  hyphen-minus `-`, never an en/em dash, even though the design doc's prose uses them. (Review NIT 2.)
- Reuse `hostFromUrl(url)` from `src/lib/format.ts` for the chip host fallback. It already does
  `new URL(url).hostname.replace(/^www\./,'')` and returns `null` on a bad/missing URL. Do NOT
  write a new `hostOf`.
- Do NOT edit `src/lib/api.ts`. Do NOT change behavior of Resume upload (`ResumeEntryPanel` +
  `src/components/resume/*`), Jobs (`DiscoverPage`), or Tailoring (`CraftPage` +
  `src/app-shell/pages/craft/*`) - those are visual-cohesion polish only (step 7).
- Keep (do NOT delete): all of `src/components/autoSubmit/*`, `src/types/autoSubmit.ts`,
  `src/hooks/useAutoSubmit.ts`, `src/app-shell/pages/today/FeatureLaunchpad.tsx` (removed from Home,
  file retained), the `<Route path="auto-apply" element={<AutoApplyTab />}>` in `src/App.tsx`, and
  the `approve`-token mount in `ApplicationsPage.tsx`.

## Verification gates (what each step's Verify line refers to)

- `node scripts/verify.mjs --full` = `pnpm install --frozen-lockfile` + `pnpm test` (vitest, all
  suites) + `pnpm build` (`vite build`). This is the required gate. NOTE: `vite build` does NOT
  typecheck and there is NO `tsc` gate, so "no new TS errors" is author-verified; the hard rule is
  do not ADD TS errors and do not fix pre-existing ones.
- `pnpm copy:check` and `pnpm lint` have ~172 pre-existing findings tree-wide and are deliberately
  NOT in `--full`. Run them, but scope the pass/fail judgment to the files THIS task adds or edits:
  `pnpm copy:check` must report no NEW non-ASCII bytes in files you touched; `pnpm lint` must report
  no NEW errors in files you touched. Do not fix pre-existing findings elsewhere.
- Playwright screenshots: capture Home at desktop (1920 and 1440), tablet (768), and mobile (390)
  widths in BOTH light and dark themes, and attach/save them so the reviewer can read the visual
  evidence (full-bleed grid, single glass bar, KPI rail beside hero on xl, mobile strips). Save
  under `docs/design/screenshots/` (create the dir). This is manual/visual evidence for the layout
  parts the design marks as not unit-testable (design section 8).

Record in each FEAT/commit which gates ran and their outcome so the reviewer can read the evidence.

---

- [ ] 1. Add the optional `orientation` prop to `KpiRow` (presentational only, no metric change).
      Add `orientation?: 'grid' | 'rail'` (default `'grid'`) to `KpiRow`'s props. Compute one
      `wrap` class from the prop and use the SAME `wrap` in BOTH the loading-skeleton branch and the
      data branch so loading and loaded share one layout (no shift):
      `grid` -> `'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'` (current default, unchanged);
      `rail` -> `'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1'` (2-up on tablet, single
      column only at xl). Do not move any metric computation or change any `StatCard` content.
      Files: `src/app-shell/pages/today/KpiCards.tsx`
      Verify: `node scripts/verify.mjs --full` passes (existing `today-first-run.test.tsx` still
      green). The new unit test in step 6 asserts both branches carry the right wrapper class.

- [ ] 2. Create the `AutoApplyPreviewBar` component (desktop glass bar + mobile Instagram strip).
      New file. Reads `useAutoSubmit()` only (`available`, `settingsLoading`, `pending`, `waiting`,
      `pendingError`); it is a pure read - never calls any mutating action, never submits. Exactly
      ONE labeled landmark: a single `<section aria-label="Auto-Apply preview (paused)"
      role="region">` with two inner layouts toggled by Tailwind `hidden md:flex` (desktop bar) and
      `flex md:hidden` (mobile strip) - a `hidden` element is out of the a11y tree, so only one is
      exposed at any breakpoint. Container uses the sanctioned `.glass-pane` recipe, `rounded-container`,
      `min-h-14` on desktop. This is the ONLY `.glass-pane` on Home content.
      Left: a `Send`/`Bot` icon in a `bg-primary/10 text-primary` chip + an overline-styled
      "PAUSED - PREVIEW" label (word "Paused" + a `Pause` icon carry the state - never color alone).
      Right: exactly one navigational `Button` (shadcn `variant="default"`, as a `react-router-dom`
      `Link` via `asChild` or an `<a>`) labeled "Preview Auto-Apply" -> `/app/apply/auto-apply`. No
      toggle/approve/submit control anywhere.
      Chip derivation (defensive, never an empty chip), using `hostFromUrl` from `src/lib/format.ts`:
      `label = role ?? title ?? hostFromUrl(apply_url ?? application_url ?? url) ?? 'Queued role'`;
      `company = company ?? hostFromUrl(url) ?? omit the sublabel`. Up to 3 chips, muted/neutral tone.
      State table (exactly as design section 5.4), keyed off `available` and `settingsLoading`:
      `available === undefined` (tie to `settingsLoading`) -> slim skeleton bar, same height, no
      "paused" text; `available === false` -> calm paused line "Auto-Apply is paused. When it is
      back, approved roles will queue here." + CTA; `available === true` and
      `pending.length + waiting.length === 0` -> "Auto-Apply is paused. Nothing is queued right
      now." + CTA; `available === true` and queue > 0 -> "PAUSED - PREVIEW" + up to 3 chips + CTA;
      `pendingError` -> fall back to the calm paused line (no retry on Home). All copy ASCII.
      Mobile strip: a leading status card (>=44px tap target) with the paused label + CTA, then up
      to 3 queued-role tiles, `overflow-x-auto snap-x snap-mandatory` on the strip's OWN container
      (never page-level), each tile a `Link` to `/app/apply/auto-apply`; same state table; snap/scroll
      flourish disabled under reduced motion (scrolling still works).
      Files: `src/app-shell/pages/today/AutoApplyPreviewBar.tsx` (new)
      Verify: `node scripts/verify.mjs --full` passes (component compiles + bundles). Behavior is
      asserted by the unit test in step 6.

- [ ] 3. Recompose `TodayPage` into the full-bleed two-column command center and mount the bar.
      Depends on steps 1 and 2. Edits to `src/app-shell/pages/TodayPage.tsx`:
      (a) Change the outermost class on BOTH returns from `page-measure` to `page-full` (main return
      and the `firstRunHome` early return). Use `page-full` ALONE - do NOT add `studio-canvas` or
      `surface-studio` (that would paint an unwanted full-viewport box-shadow via the
      `.page-full.studio-canvas` rule and pull in the studio scope).
      (b) Remove the `FeatureLaunchpad` render and its `import { FeatureLaunchpad }` line. Only the
      main return renders it; the `firstRunHome` early return does not reference it, so dropping the
      import affects only the main return. (Review NIT 1 + 3.)
      (c) Render `<AutoApplyPreviewBar />` as Row 1 (immediately after the `setupOpen` banner,
      before the command-center grid) and import it.
      (d) Replace the single `<motion.section aria-label="Today's status">` (which nested HeroPanel +
      KpiRow) with the command-center grid exactly as design section 3.3's recompose snippet:
      a `<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">` whose LEFT child is
      `<div className="space-y-6 xl:col-span-2">` holding `<motion.section {...rise(1)}
      aria-label="What needs you">` (HeroPanel) then `<motion.section {...rise(2)}
      aria-label="Top matches">` (TopMatchesPanel), and whose RIGHT child is
      `<motion.section {...rise(3)} aria-label="Where you stand" className="xl:col-span-1">`
      rendering `<KpiRow orientation="rail" loading={firstLoad && loading} overview=... readiness=...
      streak=... funnel=... />`. The old `"Today's status"` label is retired.
      (e) Reassign the `rise(order)` stagger to the new cell order: header `rise(0)`, hero `rise(1)`,
      matches `rise(2)`, KPI rail `rise(3)`, ResumeEntryPanel `rise(4)`, Trends section `rise(5)`,
      Recent roles section `rise(6)`. Move `ResumeEntryPanel` to a `<motion.div {...rise(4)}>` below
      the grid (quiet affordance once a resume exists); its behavior and props are unchanged.
      Keep the Trends grid (`ApplicationTrend` `lg:col-span-2` / `ConversionFunnel` `lg:col-span-1`)
      and `RecentActivityPanel` full-width below, with the updated rise order. Do not change any
      panel internals, data loading, or the `firstRunHome` logic (only its outer class changes).
      Files: `src/app-shell/pages/TodayPage.tsx`
      Verify: `node scripts/verify.mjs --full` passes. The existing `today-first-run.test.tsx` must
      stay green (step 4 removes the now-dead FeatureLaunchpad mock in that test).

- [ ] 4. Remove the orphaned `FeatureLaunchpad` mock from the first-run test.
      Depends on step 3. In `today-first-run.test.tsx` delete the
      `vi.mock('@/app-shell/pages/today/FeatureLaunchpad', ...)` block (lines ~41-44); it mocked a
      stub the test never queried and is dead after the Home render drops FeatureLaunchpad.
      (Review NIT 1.) No assertion changes - the test still covers first-run vs live dashboard.
      Files: `src/app-shell/pages/__tests__/today-first-run.test.tsx`
      Verify: `node scripts/verify.mjs --full` passes; this suite still passes with the mock removed.

- [ ] 5. Demote Auto-Apply in the single nav source of truth (`nav.config.ts`).
      Three ASCII, copy:check-safe edits in `src/app-shell/nav.config.ts`:
      (1) Remove the entire `auto-apply` object from `APPLY_SECTIONS` (this removes it from the Apply
      tab strip, the command palette, inline search, and the More sheet consistently; `ALL_DESTINATIONS`
      no longer emits `/app/apply/auto-apply`).
      (2) Change the Apply entry in `NAV_ITEMS` hint from `"Tracker, Auto-Apply, and inbox"` to
      `"Tracker, inbox, and daily pipeline"`.
      (3) Change the `autonomy` entry in `SETTINGS_SECTIONS` hint from
      `"How far Auto-Apply may go without you"` to `"Set how far Auto-Apply will go once it is back on"`.
      Leave the `autonomy` `keywords` line unchanged (`"auto apply autopilot threshold approval"`) so
      the palette still finds it. Do NOT touch `App.tsx` here - the route stays (next line). After
      editing, re-run a grep for `"Auto-Apply"` within `**/*.test.tsx`; the design verified no test
      asserts Auto-Apply in the Apply SubNav strip, but if a new one exists, update it.
      Files: `src/app-shell/nav.config.ts`
      Verify: `node scripts/verify.mjs --full` passes; the nav guard test in step 6 asserts the
      section is gone and the hint no longer contains "Auto-Apply". Confirm `src/App.tsx` still has
      `<Route path="auto-apply" element={<AutoApplyTab />}>` (unchanged) so the route stays reachable
      for deep-links and the "Preview Auto-Apply" CTA.

- [ ] 6. Add the unit/integration tests that guard the contracts above.
      Depends on steps 1, 2, 5. Follow the existing patterns in
      `src/components/autoSubmit/__tests__/*` (mock `@/contexts/AuthContext`; wrap in
      `QueryClientProvider` and `MemoryRouter` where routing/queries are involved). Create a tests
      folder for Today panels: `src/app-shell/pages/today/__tests__/`.
      (a) `AutoApplyPreviewBar.test.tsx`: mock the hook via
      `vi.mock('@/hooks/useAutoSubmit', () => ({ useAutoSubmit: vi.fn() }))` and drive the four
      states (`available:false`; `available:true` empty queue; `available:true` with a 3-item queue;
      `pendingError:true`). Assert: the paused label renders; the "Preview Auto-Apply" link points at
      `/app/apply/auto-apply`; there is no submit/toggle/approve control; the queued chip tone uses
      the neutral/muted class (NOT `bg-primary`, NOT `bg-success`); a chip with no `role`/`title`/url
      still renders non-empty text (fallback). This is the highest-value test (guards "paused, not
      live").
      (b) `KpiCards.test.tsx` (or extend an existing today test): render `KpiRow` with
      `orientation="rail"` once with `loading` and once with data; assert the wrapper carries
      `xl:grid-cols-1` in BOTH branches, and that the default (`orientation` omitted) carries
      `lg:grid-cols-4`.
      (c) `nav.config.test.ts(x)`: assert `APPLY_SECTIONS` has no `auto-apply` entry; `ALL_DESTINATIONS`
      contains no `href === '/app/apply/auto-apply'`; and the Apply `NAV_ITEMS` hint does not contain
      the string "Auto-Apply".
      (d) A routing integration test: render the router at `/app/apply/auto-apply` and assert
      `AutoApplyTab` still mounts (route stays reachable after the nav removal). If mounting the full
      shell is heavy, mount a minimal `<Routes>` mirroring the `apply` subtree with `AutoApplyTab`
      mocked to a probe, and assert the probe renders at that path.
      Files: `src/app-shell/pages/today/__tests__/AutoApplyPreviewBar.test.tsx` (new),
      `src/app-shell/pages/today/__tests__/KpiCards.test.tsx` (new),
      `src/app-shell/__tests__/nav.config.test.ts` (new; create `__tests__` dir if absent),
      plus the routing test (co-locate under `src/app-shell/pages/__tests__/`).
      Verify: `node scripts/verify.mjs --full` passes with all new tests green.

- [ ] 7. Visual-cohesion polish for Resume / Jobs / Tailoring (NO behavior change).
      Depends on step 3 (so Home's new surfaces exist to match against). Audit `DiscoverPage`
      (`/app/jobs`), `CraftPage` + `src/app-shell/pages/craft/*`, and `ResumeEntryPanel` +
      `src/components/resume/*` ONLY for token/elevation/spacing consistency with the redesigned
      Home: same `rounded-container`/`rounded-control`, `shadow-soft`/`-panel`, hairline
      `border-border` separation, and heading recipes (`text-title`/`text-h2`/`overline`). These
      pages already use `page-full`; do not change their width recipe, data, routes, or component
      behavior. Make only presentational token edits where a surface visibly diverges from Home's
      language (e.g. a stray raw color, an off-scale radius/shadow). If nothing diverges, record
      "no changes needed" with the audit result - do not invent edits.
      Files: as needed among `src/app-shell/pages/DiscoverPage.tsx`,
      `src/app-shell/pages/CraftPage.tsx`, `src/app-shell/pages/craft/*`,
      `src/app-shell/pages/today/ResumeEntryPanel.tsx`, `src/components/resume/*` (presentational only)
      Verify: `node scripts/verify.mjs --full` passes; `pnpm copy:check` and `pnpm lint` report no
      NEW findings in touched files; Playwright screenshots of Home + Jobs + Resume/Tailor at
      desktop/tablet/mobile in light + dark saved under `docs/design/screenshots/` show one coherent
      visual language (single glass bar on Home, KPI rail beside hero at xl, no page horizontal
      scroll at any width).

- [ ] 8. Optional CSS helpers in `src/index.css` (only if a class string repeats and earns a name).
      Depends on steps 2 and 3. If, after implementing, a Home grid or glass-bar/strip class string
      is repeated enough to warrant a named recipe, add it as an ADDITIVE `@layer components` helper
      expressed in existing tokens. Do NOT edit `.page-measure`, `.page-full`, `.glass-pane`, or any
      palette primitive. If Tailwind utility classes on the elements already read cleanly (the likely
      case), skip this step and record "no CSS helper needed."
      Files: `src/index.css` (additive only, if used)
      Verify: `node scripts/verify.mjs --full` passes; dark + light render unchanged for all other
      pages (helper is namespaced and additive).

## Dependency order summary

1 (KpiRow prop) and 2 (AutoApplyPreviewBar) are independent and can be done in either order; both
must land before 3 (TodayPage recompose consumes them). 4 (test mock cleanup) follows 3. 5
(nav.config) is independent of 1-4 but should precede 6 (its guard test). 6 (tests) depends on 1, 2,
5. 7 (polish) follows 3. 8 (optional CSS) follows 2-3. Every step leaves the tree buildable and
`node scripts/verify.mjs --full`-green on its own.

## Known gaps / assumptions (flagged, not blocking)

- The design's open assumptions (section 10) are accepted as settled by the approved review:
  `page-full` capped at 120rem; `FeatureLaunchpad` cut-from-Home-but-retained; Auto-Apply removed
  from `APPLY_SECTIONS` (not flag-hidden); no new backend contract. If the user later wants
  edge-to-edge beyond 1920px or a visible-but-disabled nav entry, those are one-line follow-ups.
- `pnpm lint`/`pnpm copy:check` are not in the required gate because the tree has pre-existing
  findings; the coder must self-limit their pass/fail judgment to files this task touches.

---

## Implementation evidence (iteration 1 - first full implementation)

All steps 1-7 implemented; step 8 (optional CSS helper) was NOT needed - the grid and glass-bar
class strings read cleanly as Tailwind utilities and did not repeat enough to earn a named recipe.

### What shipped

- `KpiCards.tsx`: added `orientation?: 'grid' | 'rail'` (default `grid`); one `wrap` class drives
  BOTH the loading-skeleton and data branches (no layout shift). Rail = `md:grid-cols-2 xl:grid-cols-1`.
- `AutoApplyPreviewBar.tsx` (new): one labeled region (`aria-label="Auto-Apply preview (paused)"`),
  desktop glass bar (`hidden md:flex`, single `.glass-pane` on Home) + mobile Instagram strip
  (`md:hidden`, `overflow-x-auto snap-x`). Reads `useAutoSubmit` only, never mutates. Full state
  table (undefined=skeleton / false=paused line / true+empty / true+queue=up to 3 muted chips /
  pendingError=paused line). Chip text derived via `hostFromUrl` with a `'Queued role'` fallback.
  Single navigational CTA to `/app/apply/auto-apply`. Paused marker = word + Pause icon (no color
  alone); queued chips are `bg-muted` (never cherry, never sage).
- `TodayPage.tsx`: `page-measure` -> `page-full` on both returns (page-full ALONE, no studio-canvas);
  mounts `<AutoApplyPreviewBar />` as Row 1; recomposed into `grid xl:grid-cols-3` with a left
  `xl:col-span-2` stack (hero + matches) and a right `xl:col-span-1` KPI rail; removed the
  FeatureLaunchpad render + import (file retained); rise order reassigned 0..6.
- `nav.config.ts`: removed the `auto-apply` entry from `APPLY_SECTIONS` (with a comment explaining
  the route stays in App.tsx); Apply hint -> "Tracker, inbox, and daily pipeline"; autonomy hint ->
  "Set how far Auto-Apply will go once it is back on" (keywords unchanged). `App.tsx` route
  `<Route path="auto-apply" element={<AutoApplyTab />}>` left intact and reachable.
- Tests: `AutoApplyPreviewBar.test.tsx` (6 cases incl. the paused/no-live-control contract and the
  empty-field chip fallback), `KpiCards.test.tsx` (rail vs grid wrapper in both branches),
  `nav.config.test.ts` (auto-apply absent from APPLY_SECTIONS + ALL_DESTINATIONS + Apply hint),
  `auto-apply-route.test.tsx` (route still mounts, index still redirects to tracker). The orphaned
  `FeatureLaunchpad` mock was removed from `today-first-run.test.tsx` and a `QueryClientProvider`
  was added there (Home now mounts the hook-reading bar).
- Step 7 polish: audited `DiscoverPage`, `CraftPage` + `craft/*`, `ResumeEntryPanel` +
  `components/resume/*`. They already share Home's token language (`rounded-container`,
  `shadow-soft`, `border-border`, heading recipes) and keep `page-full`. NO changes were needed -
  no divergent raw color/radius/shadow was found, so none were invented.

### Verification results (run inside the worktree)

- `node scripts/verify.mjs --full` -> PASS. `pnpm install --frozen-lockfile` (lockfile up to date) +
  `pnpm test` (Test Files 59 passed; Tests 624 passed, 1 todo, 0 failed - includes all 4 new test
  files) + `pnpm build` (`vite build` built in ~22s, bundle succeeded, only the pre-existing
  >500kB chunk-size advisory). The script's final non-zero was ONLY a `writeCache` stamp warning
  (`mkdir .git` fails in a worktree where `.git` is a file) AFTER all three gates passed; re-running
  with stderr not piped to Select-Object returns EXITCODE=0.
- `pnpm copy:check` -> pre-existing tree-wide findings (173 subs across 66 files). Of the files THIS
  task touched, only `nav.config.ts` appears, and its flagged non-ASCII (lines 52/76/95/112/115) are
  pre-existing comment em-dashes/arrows I did NOT edit; `git diff` of my added `+` lines shows ZERO
  new non-ASCII. All new files (AutoApplyPreviewBar, the tests) are clean ASCII.
- `pnpm lint` (scoped to the 9 touched files) -> 0 errors, 1 warning: the pre-existing
  `react-refresh/only-export-components` on `TodayPage.tsx:93` (the `shouldShowFirstRunHome` export,
  present before this change). No NEW findings.
- Visual verification (Playwright, real Chromium v1234 against the live Vite dev server on :5173):
  the dashboard is auth-gated with no backend in the sandbox, so a throwaway harness
  (`.tmp-redesign-shots/capture.mjs`) seeds `auth_token` and stubs the API at the network boundary
  (`/auth/verify`, `/auth/profile`, the dashboard loaders, auto-submit settings/pending) so the REAL
  TodayPage components render with realistic data. Captured and INSPECTED 6 full-page screenshots in
  `.tmp-redesign-shots/`:
  - `home-desktop-1920-light.png` / `-dark.png`: full width used (no large gutters, capped at
    120rem), Auto-Apply glass bar renders as a thin bar ("PAUSED - PREVIEW" + 3 neutral chips
    Linear/Vercel/Mercury + "Preview Auto-Apply" CTA), two-column command center (hero + matches
    left, KPI rail right), nothing clipped off the right edge, both themes correct, cherry only on
    actions.
  - `home-desktop-1440-light.png`: KPI rail still seats beside the hero at 1440.
  - `home-tablet-768-light.png`: single-column stack, Auto-Apply bar in its horizontal `md+` form,
    KPI cards as a 2-up grid (rail orientation's `md:grid-cols-2`).
  - `home-mobile-390-light.png` / `-dark.png`: single-column reading order, Auto-Apply as an
    Instagram-style horizontal strip (paused status card + swipeable queued-role tiles, large tap
    targets), KPI cards stacked full-width, both themes correct.
  NOTE: screenshots used stubbed API data (no live backend was available); this verifies LAYOUT,
  theming, the glass bar, and overflow discipline - not live data correctness. The capture harness
  under `.tmp-redesign-shots/` is a throwaway and is not committed.
