# Home redesign into a full-bleed command center with Auto-Apply demoted to a paused preview

This change recomposes Home (`TodayPage`) from a centered `.page-measure` column into a full-bleed `.page-full` two-column command center: a left narrative stack (hero + top matches) with a KPI rail seated beside it on `xl`, trends and recent roles full-width below. The static `FeatureLaunchpad` product tour is cut from Home (file retained). Auto-Apply, which is on hold, is demoted from a live nav section to a single read-only `AutoApplyPreviewBar` - a thin horizontal glass bar on desktop and an Instagram-style swipe strip on mobile - that never submits and carries one navigational CTA to the still-reachable `/app/apply/auto-apply` route. The one nav edit removes Auto-Apply from `APPLY_SECTIONS` so it leaves the Apply strip, palette, search, and More sheet together, while `App.tsx` keeps the route for deep links and the preview CTA.

Watch for: nothing blocking. The implementation matches the approved design and plan on every hard constraint; the only observation is a cosmetic one - the new component's JSX section-divider comments use box-drawing characters (non-ASCII), which the `copy:check` sweep does not flag so the gate still passes (confirmed by reading the sweep script).

**Verdict**: APPROVED

## High-level view

Wasted space is fixed the way the design specified: Home's outermost class flips from `page-measure` to `page-full` on both the main and first-run returns, nothing else. `.page-full` caps at 120rem with `margin-inline:auto` and padding (never `100vw` or negative page margins), so the shell's `overflow-x-hidden` can't clip the right edge. The 1920 desktop screenshot shows full width used with the KPI rail beside the hero and no right-edge clipping; `GrowPage`/`SettingsPage` keep their `.page-measure` measure untouched.

Every surviving Home panel maps to a real manual-apply pain, and the one redundant surface - the static `FeatureLaunchpad` tour, which served discovery not applying - is cut from Home (import removed, file retained). The page now reads top-to-bottom as a command center: what needs me, what's strong, where I stand, what's changing, what I touched.

Auto-Apply is demoted, not deleted. `src/components/autoSubmit/*` is untouched, the `App.tsx` route still mounts `AutoApplyTab`, and the new `AutoApplyPreviewBar` is a pure read of `useAutoSubmit` with exactly one navigational control. The nav single-source-of-truth edit (remove the `APPLY_SECTIONS` entry, restate two stale hints) propagates to the strip, palette, search, and More sheet in one place, and the guard test asserts the destination is gone from `ALL_DESTINATIONS` while a separate routing test asserts the path still resolves.

Design-system fidelity holds: no raw hex in the changed components (grep clean), cherry stays on actions and accents (the glass bar's icon chip `bg-primary/10` and the CTA fill are the sanctioned uses), queued chips are neutral `bg-muted` so the paused surface never borrows the active or verified status hue, the paused state is carried by word plus `Pause` icon (no color-alone), and both themes plus mobile render correctly in the saved screenshots. Resume/Jobs/Tailoring were audited for token cohesion and left unchanged (no divergence found), so they are not regressed.

<details>
<summary>Issues (1)</summary>

1. **Box-drawing chars in component comments (non-blocking)** - `AutoApplyPreviewBar.tsx` uses `─` (U+2500) in two JSX divider comments; it is non-ASCII and contradicts the commit's "clean ASCII" claim, but the `copy:check` sweep does not scan for box-drawing characters so no gate fails. Optional: swap for ASCII dashes for consistency with the house rule's spirit.

</details>

<details>
<summary>Details</summary>

### Wasted space: `page-measure` to `page-full`, bounded so nothing clips

`TodayPage`'s outer class changes from `page-measure` to `page-full` on both the main return and the `firstRunHome` early return, and `page-full` is used alone (no `studio-canvas`, which would have painted a full-viewport box-shadow). `.page-full` caps at 120rem with `margin-inline:auto` plus inline padding, so it recovers width toward the center without ever emitting a `100vw` child or a negative page margin - the two things the shell's `overflow-x-hidden <main>` would silently clip. The 1920 dark screenshot confirms the payoff: full available width used, KPI rail seated beside the hero, charts as 2fr/1fr, recent roles full-width, nothing cut off the right edge. No other page's width recipe is touched, and `.page-measure`/`.page-full` themselves are not edited, so `GrowPage` and `SettingsPage` keep their centered measure.

The one place to watch for a right-edge clip is the mobile strip, which uses `-mx-4` to bleed to the viewport edge. It is paired with `overflow-x-auto` on that same container, so the overflow scrolls inside the strip rather than widening the page; the 390 mobile screenshot shows the strip bleeding correctly with no page-level horizontal scrollbar. (confirmed)

### Pain-point mapping: the tour is cut, survivors earn their place

`FeatureLaunchpad` is removed from Home - both the render and the import are gone, replaced by a comment explaining the file is retained for reuse. It solved discovery (already covered by the palette, More sheet, and primary nav), not an applying pain, so it was the right cut. Reading order is rewritten in the file header to the "9am question order": paused preview, what-needs-me (hero), what's-strong (matches), where-I-stand (KPI rail), what's-changing (trends), why (recent roles). The KPI rail moving beside the hero on `xl` is the single biggest spend of the recovered width - the scoreboard is now visible without scrolling past the hero. (confirmed)

### KPI rail: one wrapper across both branches, no layout shift

`KpiRow` gains `orientation?: 'grid' | 'rail'` (default `grid`). A single `wrap` class is derived from the prop and used in both the loading-skeleton branch and the data branch, so loading and loaded share one layout and there is no shift when data lands. `rail` is `md:grid-cols-2 xl:grid-cols-1` (2-up on tablet where the section is full width, single column only at `xl` where it is the narrow right column) - pure Tailwind, no JS width math. The `KpiCards.test.tsx` guard asserts both branches carry `xl:grid-cols-1` in rail and `lg:grid-cols-4` by default, and that the two branches' wrapper classes are identical. No metric computation moved. (confirmed)

### Auto-Apply: paused preview, structurally incapable of submitting

`AutoApplyPreviewBar` reads `useAutoSubmit` and destructures only `available`, `settingsLoading`, `pending`, `waiting`, `pendingError` - no mutating action is imported or called, so the component cannot submit, approve, or toggle. Its only control is `PreviewCta`, a `react-router-dom` `Link` to `/app/apply/auto-apply`. The paused state is carried by the word "Paused" plus a `Pause` icon, not color (satisfies no-color-alone), and the full state table is implemented: `available === undefined` or `settingsLoading` renders a slim skeleton with no paused claim; `available === false` or `pendingError` renders the calm paused fallback line; `available === true` with an empty queue renders the "nothing queued" line; `available === true` with a queue renders up to 3 chips.

```
useAutoSubmit() --(read only)--> AutoApplyPreviewBar
   available/settingsLoading/pending/waiting/pendingError
         |
         v
   one <section aria-label="Auto-Apply preview (paused)" role="region">
         |-- hidden md:flex   -> desktop glass bar (the single .glass-pane on Home)
         `-- flex md:hidden    -> mobile snap strip
                                   |
                                   `-- only control: Link -> /app/apply/auto-apply
```

The two inner layouts are toggled by `hidden md:flex` / `md:hidden`, so exactly one is in the a11y tree at any width and the region is announced once. Chip text is derived defensively via `toChip` - `role ?? title ?? hostFromUrl(apply_url ?? application_url ?? url) ?? 'Queued role'` - so a row with every enrichment field null still renders non-empty text. The `AutoApplyPreviewBar.test.tsx` suite nails the contract hardest: it asserts the region exists, the only control is the navigational link, no `switch`/`submit`/`approve`/`toggle` role is present in any state, the queued chips carry `bg-muted` and neither `bg-primary` nor `bg-success`, and the empty-field row still renders the `Queued role` fallback. (confirmed)

### Nav demotion in one source of truth, route kept reachable

The `auto-apply` object is removed from `APPLY_SECTIONS`, which is the single derivation point for the Apply tab strip, command palette, inline search, and More sheet - so Auto-Apply leaves all four together and `ALL_DESTINATIONS` no longer emits `/app/apply/auto-apply`. The two stale hints are corrected: the Apply `NAV_ITEMS` hint drops "Auto-Apply" and the `autonomy` settings hint is reframed as a paused capability ("Set how far Auto-Apply will go once it is back on"), while the `autonomy` keywords are left intact so the palette still finds the setting. `App.tsx` is unchanged - the `<Route path="auto-apply" element={<AutoApplyTab />}>` still resolves, which `auto-apply-route.test.tsx` asserts (route mounts; index still redirects to tracker, not auto-apply) and `nav.config.test.ts` complements (section gone, destination gone, Apply hint no longer advertises it). This is the consistent kept-reachable-but-not-primary posture the design required. (confirmed)

### Design-system fidelity

A grep for raw hex across the three changed components (`AutoApplyPreviewBar.tsx`, `TodayPage.tsx`, `KpiCards.tsx`) returns nothing - semantic tokens only. Cherry stays action/identity: the only `bg-primary` uses in the new component are the icon chip's `bg-primary/10` tint and the CTA's default fill, both sanctioned; queued chips are `bg-muted`/`text-muted-foreground` so the paused surface never reads as active (cherry) or verified (sage). Glass is used once on Home content (the preview bar's `.glass-pane`), matching the audited one-pane budget. The desktop screenshot reads as a dark neutral canvas with cherry only on actions and accents - it does not read pink. Light, dark, tablet, and mobile are all present in the saved screenshots and render correctly. Motion continues through the shared `rise(order)` helper (reassigned to the new cell order), which already collapses under reduced motion. (confirmed)

### Verification evidence read, not re-run

The coder recorded `node scripts/verify.mjs --full` PASS (install + vitest 624 passed / 1 todo / 0 failed including the 4 new test files + `vite build` OK; the trailing non-zero was a worktree `.git` stamp-write warning after all gates passed), `pnpm copy:check` with no new non-ASCII in touched lines, `pnpm lint` with 0 errors and 1 pre-existing warning, and Playwright screenshots at 1920/1440/768/390 in light+dark. The six screenshots are present under `.tmp-redesign-shots/` and I inspected the 1920-dark and 390-light frames directly - they confirm full-bleed layout, the single glass bar with neutral chips, the KPI rail beside the hero, the mobile Instagram strip, and no right-edge clipping in either theme. Per the review discipline I did not re-run the suites; the one articulable doubt (the "clean ASCII" claim) I spot-checked with a targeted diff and resolved against the sweep script. (confirmed)

Not tested (acknowledged, not blocking): the full-bleed grid geometry, the `xl` rail-beside-hero placement, and the mobile strip overflow discipline are layout facts the design marks as not unit-testable; they are covered by the inspected screenshots rather than assertions. Screenshots used stubbed API data, so they verify layout and theming, not live data correctness.

</details>

<details>
<summary>File map</summary>

- `src/app-shell/pages/TodayPage.tsx` - recompose to `page-full` two-column command center; mount `AutoApplyPreviewBar`; drop `FeatureLaunchpad`; reassign `rise` order.
- `src/app-shell/pages/today/AutoApplyPreviewBar.tsx` (new) - read-only paused preview: desktop glass bar + mobile strip, one navigational CTA.
- `src/app-shell/pages/today/KpiCards.tsx` - add `orientation` prop; one shared wrapper across loading and data branches.
- `src/app-shell/nav.config.ts` - remove `auto-apply` from `APPLY_SECTIONS`; restate the Apply and Autonomy hints.
- `src/app-shell/pages/today/__tests__/AutoApplyPreviewBar.test.tsx` (new) - paused/no-live-control contract + chip fallback.
- `src/app-shell/pages/today/__tests__/KpiCards.test.tsx` (new) - rail vs grid wrapper in both branches.
- `src/app-shell/__tests__/nav.config.test.ts` (new) - Auto-Apply absent from sections/destinations/hint.
- `src/app-shell/pages/__tests__/auto-apply-route.test.tsx` (new) - route still mounts; index redirects to tracker.
- `src/app-shell/pages/__tests__/today-first-run.test.tsx` - drop the orphaned FeatureLaunchpad mock; add QueryClientProvider.
- `docs/design/*` - design doc, plan with evidence, prior design-review artifacts.

Full diff: `git -C d:\Aithrex\jobpilot-frontend\.worktrees\dashboard-redesign diff main`

</details>
