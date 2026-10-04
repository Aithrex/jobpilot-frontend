# Dashboard Redesign - Design Doc

Status: Revised after design review (review verdict CHANGES_REQUESTED; 2 HIGH, 4 MEDIUM, 5 NIT - all addressed; see "Responses to design review" at the end)
Scope: Frontend only, inside worktree `d:\Aithrex\jobpilot-frontend\.worktrees\dashboard-redesign`
Target page: Home (`/app/home`, `src/app-shell/pages/TodayPage.tsx`) plus the Auto-Apply demotion that touches `nav.config.ts` and `App.tsx`.
Brand name in all user-facing copy: Aspirely (never "jobpilot").

---

## 1. Overview

Home today is a correct but conservative single column. `TodayPage` wraps everything in `.page-measure` (max-width 72rem, centered), so on a 1440px+ monitor the briefing sits in a ~1152px strip with wide empty gutters on both sides - the exact "space wasted on left and right" the user called out. The reading order is sound (what-needs-me, where-do-I-stand, what's-new, setup, tour, trends, recent), but it is stacked vertically, so a user scrolls past five full-width bands to reach their pipeline, and a static four-tile "product tour" (`FeatureLaunchpad`) occupies prime real estate above the fold's lower half.

This redesign turns Home into a **calm executive instrument**: a full-bleed, intentional multi-column grid that fills a wide desktop while keeping text-dense panels at a comfortable measure; a mobile experience that is thumb-first and story-strip driven (Instagram-ease); and a Home where every panel earns its place by removing a specific pain of applying to jobs by hand. Auto-Apply, which is on hold, is demoted from a full nav section to a thin, honestly-labeled "paused" preview surface - a glass status bar on desktop and a swipeable strip on mobile - with all of its code left intact and its route still reachable.

The design stays strictly inside the "Black Cherry" system in `src/index.css`: cherry (hue 345) is action/identity only and never a background wash; sage=verified, amber=deadline, red=failed; light mode stays bright; glass is used sparingly via the existing `.glass-pane` / `.glass-nav` tokens; motion comes from `@/lib/motion` and respects `prefers-reduced-motion`. No raw hex in components, semantic tokens only, verified in light + dark + mobile.

**Glass pane budget for Home (audited):** Home *content* glass = exactly **1** pane - the new `AutoApplyPreviewBar` (`.glass-pane`). Every other Home surface (hero, KPI cards, matches, charts, recent table, resume entry) is a plain `bg-card` + hairline + `shadow-soft` surface, not glass. The shell chrome glass (top bar, sidebar, mobile nav - the `.glass-nav*` recipes) is pre-existing, lives outside `TodayPage`, and is counted separately; this redesign does not add to it. So on-screen glass on Home is: 1 content pane + the pre-existing shell chrome. This keeps glass as the "one surface in front" signal (the Mercury reference) rather than a page-wide frost.

### Reference translation (patterns, not pixels)

- **Linear / Vercel dashboard** - information hierarchy and restraint: one clear "what needs me" focal point, dense but not noisy stat rows, hairline-and-shadow separation rather than heavy chrome. Translated as the Zone-A command strip and the KPI rail.
- **Mercury** - glass depth used *sparingly* to mark the one surface that is "in front". Translated as the single Auto-Apply glass bar and the hero's resting elevation, not a page full of frost.
- **Robinhood / Instagram (mobile)** - horizontal, snap-scrolling story strips with large tap targets for scannable collections. Translated as the mobile Top-Matches strip and the mobile Auto-Apply strip.
- **Teal / Huntr / LinkedIn (job tracking)** - the dashboard is a *command center* for a search in progress: today's actions, momentum, strongest roles, pipeline stages, follow-ups. Translated as the pain-point mapping in section 3.

These inform structure and density only. No proprietary color, asset, or layout is copied; everything renders through Black Cherry tokens.

---

## 2. Technology stack (locked once approved)

No new runtime dependencies. The redesign is implemented entirely with what the repo already ships:

- React 18 + TypeScript, Vite 5 build (`pnpm build` = `vite build`; **no `tsc` gate** is added).
- Tailwind 3.4 with the existing semantic token layer and utilities (`rounded-container`, `rounded-control`, `shadow-soft/-panel/-pop/-float`, `text-display/-title/-h2/-caption/-overline`, `duration-fast/base`, `ease-standard/expo`).
- shadcn/ui (Radix) primitives from `src/components/ui/*` (Card, Button, Switch, Badge, Skeleton, Table, the `pill-switch` track/thumb). No hand-rolled primitives.
- framer-motion 12 via the shared `@/lib/motion` helpers (`rise`, `fade`, `listContainer`/`listItem`, `indicatorSpring`) only.
- recharts for the existing trend/funnel charts (unchanged chart engine).
- react-router-dom 6 for routing; nav remains derived from `src/app-shell/nav.config.ts`.
- Data continues through the `apiService` singleton (`src/lib/api.ts`) and existing hooks (`useAutoSubmit`, `useCombinedJobsCtx`). No raw `fetch`, no new auth-401 path.

CSS additions, if any, are confined to new `@layer components` recipes in `src/index.css` expressed in existing tokens (e.g. a responsive Home grid helper and a glass-bar helper). No new palette primitive and no second brand color.

---

## 3. New Home layout and width strategy

### 3.1 Width: `.page-full` replaces `.page-measure` for Home only

`.page-full` already exists in `src/index.css` and is exactly the recipe for this job:

```css
.page-measure, .page-full { width: 100%; padding-inline: 1rem; padding-block: 1.5rem; }
.page-measure { max-width: 72rem; margin-inline: auto; }
.page-full    { max-width: 120rem; margin-inline: auto; }   /* + 1.5rem/2rem inline padding at sm/lg */
```

Decision: **`TodayPage`'s outermost element changes from `page-measure` to `page-full`** (both the main return and the `firstRunHome` early return). This is the same pattern `DiscoverPage`, `ApplicationsPage`, and `CraftPage` already use, so it is a proven in-repo recipe, not an invention. `.page-full` caps at 120rem (1920px) so text never runs edge-to-edge on an ultrawide.

Width gained, stated precisely (the two caps differ by 48rem = 768px, but that full delta is only realized once the viewport reaches the wider cap):
- At **>=1920px**: up to **768px more** usable width (`.page-full` content ~1920 - 2x(2rem) ≈ 1856px vs `.page-measure` ~1152px). This is the cap-to-cap difference.
- At **1440px**: ~**160px more** (`.page-full` ~1440 - 2x(2rem) ≈ 1312px vs `.page-measure` capped at ~1152px). Both pages pad the same inline, so below the 72rem cap there is no difference at all.

Even the ~160px gain at 1440px is enough to seat the KPI rail beside the hero instead of under it; the larger >=1920px gain is where the multi-column command center fully opens up. The point is to spend recovered width on structure, not on stretching text.

**Home uses `page-full` ALONE.** Do not add `studio-canvas` or `surface-studio` to the Home root. `index.css` has a special rule `.page-full.studio-canvas { box-shadow: 0 0 0 100vmax hsl(var(--background)); }` that `CraftPage` uses for its Resume-studio canvas bleed; copying `CraftPage`'s full `surface-studio studio-canvas page-full` class string onto Home would paint an unwanted full-viewport box-shadow and pull in the studio scope. Home is a plain `page-full` container.

**Why not remove the cap entirely / go to `100vw`:** The shell's `<main>` is `overflow-x-hidden` (`AppShell.tsx`). Anything wider than its content box - a `100vw` child, a negative-margin full-bleed trick - is silently clipped off the right edge, which is where primary actions live. `.page-full` deliberately uses `margin-inline: auto` and padding, never negative margins or `100vw`, so it can never produce that clip or a horizontal scrollbar. We follow that constraint exactly.

**No regression to other pages:** We only change the class on `TodayPage`. `GrowPage` and `SettingsPage` keep `.page-measure`; `DiscoverPage`, `ApplicationsPage`, `CraftPage` keep `.page-full`. The width recipes themselves are not edited, so no other page's measure moves. The one edit to `src/index.css` for Home is an *additive* grid helper (section 3.3), not a change to `.page-measure`/`.page-full`.

### 3.2 Reading measure vs. fill - the two-track rule

Filling the width must not make text-dense panels unreadable (a 110-character line is a readability failure). The grid resolves this: wide, scannable surfaces (KPI rail, matches, charts, recent table) stretch to fill columns; prose-heavy surfaces (the hero copy, empty-state bodies) keep an internal `max-w-2xl`/`max-w-sm` on their text block, which they already do (`HeroPanel`, `PanelEmpty`). So the *grid* is full-bleed; the *reading measure* is preserved per panel by the inner `max-w-*` the components already carry.

### 3.3 The grid: a two-column command center on desktop, single column on mobile

Target layout at `xl` (>=1280px), inside `.page-full`:

```
Row 0  Header: greeting + date (left)  ............................  Refresh (right)
Row 1  Auto-Apply paused glass bar  (full width, thin, one line)         [section 5]
Row 2  +------------------------- 2fr -------------------------+ +------- 1fr -------+
       | HeroPanel  (today inbox / "what needs me")            | | KPI rail          |
       |                                                       | | (4 stat cards     |
       +-------------------------------------------------------+ |  stacked vertical)|
       | TopMatchesPanel  (strongest roles)                    | |                   |
       +-------------------------------------------------------+ +-------------------+
Row 3  +------------------- 2fr -------------------+ +--------- 1fr ---------+
       | ApplicationTrend (30-day area chart)      | | ConversionFunnel      |
       +-------------------------------------------+ +-----------------------+
Row 4  RecentActivityPanel (full-width table)
Row 5  ResumeEntryPanel  (quiet, once a resume exists)   [prominent + top on first-run]
```

Rationale for the column split:
- **Left (primary, ~2fr):** the narrative the user reads top-to-bottom - what needs me, then what's strong. These are the "do something now" surfaces.
- **Right (secondary, ~1fr):** at-a-glance status that benefits from being *beside* the hero rather than below it. On a wide screen the KPI cards move from a 4-up horizontal row (which stranded them under the hero) to a vertical rail in the right column, so "where do I stand" is visible without scrolling past the hero. This is the single biggest use of the recovered width.

#### Concrete DOM recompose and landmark map (this REPLACES the current `TodayPage` section structure)

The current `TodayPage` nests `HeroPanel` and `KpiRow` as siblings **inside one** `<motion.section aria-label="Today's status">`, with `TopMatchesPanel` in a separate `<motion.section aria-label="Top matches">`. The command-center grid necessarily pulls `KpiRow` **out** of the hero's section into its own column, so the four current landmarks do not map 1:1 onto the new cells. The redesign therefore re-labels the sections explicitly. This is a real DOM change, not a pure CSS reflow; the doc specifies it so the implementer does not have to guess, and so "landmarks are meaningful" holds (each visible region is a labeled `<section>`, none orphaned).

New structure, from the main (non-first-run) return of `TodayPage`:

```tsx
// header: unchanged <motion.header> (greeting + Refresh) -- not a landmark change
// setupOpen banner: unchanged

<AutoApplyPreviewBar />            {/* its own labeled region, see section 5.4/5.5 */}

{/* The command center: one grid, two columns on xl, single column below xl */}
<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
  {/* LEFT column: the "do something now" narrative */}
  <div className="space-y-6 xl:col-span-2">
    <motion.section {...rise(1)} aria-label="What needs you">
      <HeroPanel model={hero} onRetry={() => void load()} />
    </motion.section>
    <motion.section {...rise(2)} aria-label="Top matches">
      <TopMatchesPanel />
    </motion.section>
  </div>

  {/* RIGHT column: at-a-glance status, beside the hero.
      orientation="rail" is a PURE-CSS responsive wrapper (see section 4): its class is
      "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1", so the four cards are a
      2-up grid on tablet (where this section spans full width) and a single-column
      vertical rail only at xl (where it is the narrow right column). No JS width math. */}
  <motion.section {...rise(3)} aria-label="Where you stand" className="xl:col-span-1">
    <KpiRow orientation="rail" loading={firstLoad && loading}
            overview={overview} readiness={readiness} streak={streak} funnel={funnel} />
  </motion.section>
</div>

<motion.div {...rise(4)}>
  <ResumeEntryPanel onUploaded={() => void load()} />   {/* quiet affordance; moved below the fold once a resume exists */}
</motion.div>

<motion.section {...rise(5)} aria-label="Trends" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
  {/* ApplicationTrend lg:col-span-2 ; ConversionFunnel lg:col-span-1  (unchanged internals) */}
</motion.section>

<motion.section {...rise(6)} aria-label="Recent roles">
  <RecentActivityPanel ... />
</motion.section>
```

Key points for the implementer:
- **Landmark map after recompose** (five labeled regions on the loaded Home, plus the Auto-Apply region): `"What needs you"` (hero), `"Top matches"`, `"Where you stand"` (KPI rail), `"Trends"`, `"Recent roles"`, and `"Auto-Apply preview (paused)"` from the bar. The old single `"Today's status"` label is **retired**: it previously covered hero + KPI together, which no longer share a cell. Splitting it into `"What needs you"` and `"Where you stand"` keeps every region named and self-describing. The `"Top matches"`, `"Trends"`, and `"Recent roles"` labels are unchanged.
- **The KPI rail is its own labeled `<section aria-label="Where you stand">`**, not an orphan `<div>` in the grid - so a screen-reader user lands on a named region, not a bare column.
- **`rise(order)` stagger is reassigned to the new cell order**: header `rise(0)`, hero `rise(1)`, matches `rise(2)`, KPI rail `rise(3)`, resume `rise(4)`, trends `rise(5)`, recent `rise(6)`. Reading order top-to-bottom, left column before right, matching DOM order so keyboard/AT traversal is sane.
- **Below `xl`** the grid collapses to one column (`grid-cols-1`), so the DOM order above *is* the mobile reading order: hero -> matches -> KPI (which renders as a horizontal snap strip on `< md`, section 6) -> resume -> trends -> recent. The Auto-Apply region stays first.
- The `firstRunHome` early return keeps its own simpler structure (section 4 ResumeEntryPanel decision); only its outer class changes `page-measure` -> `page-full`.

Breakpoints (Tailwind):
- `< md` (mobile): single column, everything stacked in reading order; KPI cards become a horizontal snap strip (section 6).
- `md` (tablet, >=768px): two columns for the KPI cards (2x2) and the Trend/Funnel pair; hero and matches full width.
- `xl` (desktop, >=1280px): the two-column command center above (hero+matches | KPI rail), charts as 2fr/1fr.
- `2xl` (>=1536px): same structure; the extra width widens columns rather than adding a third, keeping the layout calm (Linear-style restraint).

Implementation: Tailwind `grid grid-cols-1 xl:grid-cols-3` on the command-center wrapper, with `xl:col-span-2` on the left stack and the KPI rail in the third column (`xl:col-span-1`), exactly as the recompose snippet above shows. Because the existing panels (`HeroPanel`, `TopMatchesPanel`, `KpiRow`, charts, `RecentActivityPanel`) already render as self-contained cards with their own internal responsive behavior, the redesign is primarily a **composition change in `TodayPage.tsx` plus a KPI-rail orientation prop** (section 4), not a rewrite of each panel. The `motion` entrance stays the staggered `rise(order)` helper already in place, reassigned to the new cell order; grid cells animate in reading order.

As noted in the recompose above, the section landmarks are **re-labeled, not merely preserved**: the old combined `"Today's status"` label is retired because hero and KPI no longer share a cell, and is replaced by `"What needs you"` (hero) + `"Where you stand"` (KPI rail). The screen-reader reading order becomes "Auto-Apply preview (paused) / What needs you / Top matches / Where you stand / Trends / Recent roles."

---

## 4. Per-panel pain-point mapping (keep / sharpen / cut / merge)

Every current Home panel is audited against a concrete pain of applying manually. The guiding question (user's words): *"everything should be helpful and easier for the user in terms of the painpoints he experiences when applying for jobs manually."*

| Panel (file) | Manual-apply pain it solves | Decision | Change |
|---|---|---|---|
| **HeroPanel** `today/HeroPanel.tsx` | "What needs me right now?" - manual applicants lose track of follow-ups, approvals, "did you apply?" nudges. The Today-inbox is the single most valuable surface. | **KEEP, promote to left-column focal point** | No logic change. Becomes the top-left anchor of the command center; retains inner `max-w-2xl` reading measure. |
| **KpiRow** `today/KpiCards.tsx` | "Where do I stand?" - momentum, streak, interview rate, readiness. Manual applicants have no scoreboard; this is the anti-giving-up surface. | **KEEP, re-orient** | Add an optional `orientation` prop with a **shared wrapper across BOTH the loading-skeleton branch and the data branch** so there is no layout shift when data lands. No metric changes. See the explicit prop contract below the table. |
| **TopMatchesPanel** `today/TopMatchesPanel.tsx` | "Which roles are worth my limited time?" - the core of not wasting effort on poor-fit roles. Scored against the resume. | **KEEP** | Stays full-width in the left column on desktop; becomes a horizontal story strip on mobile (section 6). No feed change (still a read of the shared `CombinedJobsProvider`). |
| **ResumeEntryPanel** `today/ResumeEntryPanel.tsx` | Tailoring friction / setup gap - without a base resume, nothing else works. Self-gating (loud when missing, quiet when present). | **KEEP** | Position change only: prominent + first on first-run Home; demoted to a quiet affordance near the bottom once a resume exists. Behavior unchanged (upload stays via `apiService.uploadResumeForParser`). |
| **ApplicationTrend** `today/PipelinePanels.tsx` | "Am I keeping momentum?" - 30-day send-rate. Directly addresses the demoralizing invisibility of manual effort. | **KEEP** | Moves into the 2fr chart cell. No change to chart or its sr-only data table. |
| **ConversionFunnel** `today/PipelinePanels.tsx` | "Where do applications stall?" - manual applicants can't see their funnel. Deadlines/stage visibility. | **KEEP** | Moves into the 1fr chart cell. Unchanged. |
| **RecentActivityPanel** `today/RecentActivityPanel.tsx` | "Where did I apply, and don't re-apply" - the single clearest manual-tracking pain. Status + fit + saved date. | **KEEP** | Full-width table below the charts. Unchanged. |
| **FeatureLaunchpad** `today/FeatureLaunchpad.tsx` | A static four-tile "product tour." Solves a *discovery* need, not an *applying* pain. One of its tiles is Auto-Apply (on hold), another duplicates "Jobs for you" (already the Top Matches panel's CTA) and "Tailor resume" (already reachable from matches + nav). | **CUT from Home** | Remove the `FeatureLaunchpad` render from `TodayPage`. The component file is **kept** (not deleted) so nothing else that imports it breaks and it can be reused elsewhere, but it no longer occupies prime Home space. Discoverability is already covered by the command palette (⌘K over `ALL_DESTINATIONS`), the mobile More sheet, and the primary nav - so the tour is redundant filler by the brief's own standard. |

#### `KpiRow` orientation prop contract (both branches honor it)

Today `KpiCards.tsx` hardcodes `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4` in **two separate places** - the loading-skeleton branch (four `StatCardSkeleton`s) and the data branch (four `StatCard`s). To add a `rail` orientation without a loading->loaded layout shift, both branches must read the **same** wrapper class derived from the prop. The required contract:

```tsx
export function KpiRow({
  loading, overview, readiness, streak, funnel,
  orientation = 'grid',           // 'grid' | 'rail'
}: KpiRowProps) {                   // KpiRowProps adds `orientation?: 'grid' | 'rail'`
  const wrap =
    orientation === 'rail'
      ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1'   // rail: 2-up on tablet, vertical only at xl (the narrow right column)
      : 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4';  // grid: current default (unchanged)

  if (loading) {
    return (
      <div className={wrap}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    );
  }
  // ...compute values unchanged...
  return <div className={wrap}>{/* the same four StatCards, unchanged */}</div>;
}
```

Rules the implementer must hold:
- `orientation` defaults to `'grid'`, so every existing caller (there are none besides `TodayPage` today, but the default guarantees it) keeps the current 4-up responsive grid with zero behavior change. Only the new right-column call passes `orientation="rail"`.
- The `rail` wrapper is itself **pure-CSS responsive**: `grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1`. So on tablet (`md`-`lg`), where the "Where you stand" section spans full width in the collapsed single-column command center, the four cards are a 2-up grid; only at `xl`, where the section is the narrow right column beside the hero, do they stack into a single-column vertical rail. There is no JS width measurement - the orientation is a prop, the breakpoint behavior is Tailwind.
- The **skeleton branch takes the same `orientation`** and renders through the same `wrap` class, so loading and loaded share one layout and there is no shift when data arrives. This satisfies the "skeletons occupy the final layout" invariant (sections 6.3, 7).
- The change is **presentational only** - no metric computation moves, no `StatCard` content changes. The four cards and their contexts are byte-for-byte the same; only the wrapping container's class differs.

Net effect: Home drops one redundant marketing band and reorganizes the survivors into a two-column command center. Nothing that reduces a real applying pain is removed. The removal of `FeatureLaunchpad` is the "prime cut candidate" the task names; the Auto-Apply tile within it is superseded by the dedicated paused glass bar (section 5), so Auto-Apply loses nothing in discoverability.

**Merge note:** No panels are merged in this pass. The hero already *is* the merge of inbox + today's status (it branches on `hasQueue`). Merging KPIs into the hero was considered and rejected: it would overload the one focal surface and break the "one glance = one question" clarity that makes the hero work.

---

## 5. Auto-Apply demotion (on hold - demote, never delete)

### 5.1 What stays untouched

All feature code under `src/components/autoSubmit/*` (`AutoApplyTab`, `AutoApplyModeControls`, `AutoApplyOnboarding`, `NeedsInputCard`, `StatusRowCard`, `ApproveLinkConfirm`, `needsInput.ts`, tests) is **kept intact**. The `useAutoSubmit` hook, its React Query keys, and `src/types/autoSubmit.ts` are unchanged. We are changing *presence and framing*, not capability.

### 5.2 Nav change (one source of truth)

Navigation has exactly one source of truth: `src/app-shell/nav.config.ts`. The command palette (`CommandPalette.tsx`), the inline top-bar search (`TopBarSearch.tsx`), the mobile More sheet (`MoreSheet.tsx`), and the Apply SubNav (`ApplicationsPage.tsx`) all derive from `NAV_SECTIONS` / `ALL_DESTINATIONS`. Therefore:

Decision: **Remove the `auto-apply` entry from `APPLY_SECTIONS` in `nav.config.ts`.** This single edit removes Auto-Apply from the Apply tab strip, the command palette, the inline search, and the More sheet consistently - exactly the "decide in nav.config.ts" requirement, with no entry hard-coded anywhere else. Alternatives (keeping it in nav but hiding with a flag) were rejected because they leave a live-looking "Queue roles and let Aspirely fill the forms" destination in the palette for a paused feature, which contradicts the "preview/paused" framing.

Two consequential consistency edits that MUST ship with that removal:

1. **The Apply `NAV_ITEMS` hint goes stale and must change.** `NAV_ITEMS` has `{ to: "apply", label: "Apply", icon: LayoutList, hint: "Tracker, Auto-Apply, and inbox" }` - that hint advertises Auto-Apply as an Apply tab, which it no longer is after the removal. Update it so it names only tabs that still exist:

   ```ts
   { to: "apply", label: "Apply", icon: LayoutList, hint: "Tracker, inbox, and daily pipeline" },
   ```

   (ASCII, `copy:check`-safe. "Daily pipeline" matches the remaining `pipeline` section's own hint.)

2. **Grep for and update any test/snapshot asserting Auto-Apply in the Apply SubNav before removing the section.** I searched the worktree: the matches for "Auto-Apply"/"auto-apply" in tests are in `landing/__tests__/landing-redesign.test.tsx` (landing-page capability dock, unrelated), `job-search/**` and `autoSubmit/**` (card flows and the AutoApplyTab itself, unrelated to the Apply **nav strip**), and `today-first-run.test.tsx` (mocks `FeatureLaunchpad` but asserts nothing on it). **No existing test asserts that "Auto-Apply" appears in the Apply SubNav tab strip**, so removing the `APPLY_SECTIONS` entry does not break a current test. The implementer must still re-run this grep (`"Auto-Apply"` within `**/*.test.tsx`) after the edit and, if any new assertion exists, update it; the positive guard test in section 8 asserts the section is now absent.

   Separately, after the removal the Apply SubNav renders exactly three tabs (Tracker / Inbox / Pipeline). `ApplicationsPage` derives its tab strip from `APPLY_SECTIONS`, so no `ApplicationsPage` edit is needed for the strip itself; the only Apply-page concern is the `approve`-token mount, covered in 5.3.

### 5.3 Keeping the route reachable (App.tsx)

The `<Route path="auto-apply" element={<AutoApplyTab />}>` under `/app/apply` in `App.tsx` is **kept**. Removing the nav entry does not remove the route, so:
- `/app/apply/auto-apply` still renders the full `AutoApplyTab` for anyone who deep-links, bookmarks, or clicks the "Preview Auto-Apply" CTA on the new glass bar.
- The emailed approve/review links that 302 into `/app/apply?approve=<token>` continue to work: `ApplicationsPage` still mounts `ApproveLinkConfirm` on the `approve` query param, independent of the SubNav items.

Consistency requirement for the implementer: `App.tsx` and `nav.config.ts` must agree that the route exists but is not a primary nav destination. We keep the route, drop the nav section entry, and document that `/app/apply` now redirects its index to `tracker` (already the case) - so landing on Apply shows the Tracker, not Auto-Apply.

One secondary reference also updates for consistency: `Settings > Autonomy` (`SETTINGS_SECTIONS` `autonomy`) currently reads `hint: "How far Auto-Apply may go without you"` - a claim of a live capability. It stays as a section (Settings is explicitly "everything else stays present and functional"), but its hint copy changes to read as configuring a **paused/preview** capability. Exact replacement string (ASCII, no em dash, `copy:check`-safe):

```ts
hint: "Set how far Auto-Apply will go once it is back on",
```

The `keywords` line is **left as-is** (`"auto apply autopilot threshold approval"`) so the command palette still finds the Autonomy section when a user types "auto apply" or "autopilot." This is a copy tweak only; no structural change to `SETTINGS_SECTIONS`.

### 5.4 Desktop: the thin horizontal glass bar

A new `AutoApplyPreviewBar` component (new file: `src/app-shell/pages/today/AutoApplyPreviewBar.tsx`) renders as Row 1 of Home. It is **one** labeled region whose inner layout toggles between a thin horizontal bar (`md+`) and a swipeable strip (`< md`) by responsive classes (see the responsive-switch rule at the end of this section). It uses the sanctioned glass recipe.

Visual spec (desktop bar):
- Container: `.glass-pane` (token-driven frost with the required opaque fallback and `prefers-reduced-transparency` fallback already handled in `index.css`). One line tall on desktop (`min-h-14`), full grid width, `rounded-container`.
- Left: a small `Send`/`Bot` icon in a `bg-primary/10 text-primary` chip, then an **overline-styled "PAUSED - PREVIEW" label**. The paused state is carried by the word "Paused" plus a `Pause`/dashed icon, never color alone (no-color-alone rule). It must not read as live-submitting.
- Middle: a compact read of a few queued roles - up to 3 role chips, sourced read-only from `useAutoSubmit().pending` / `waiting`. Chip content and fallback are specified below. If the feature flag is off (`available === false`) or there is nothing queued, the bar shows a calm paused line instead of chips. No approve/submit action is wired on Home.
- Right: a single primary CTA - **"Preview Auto-Apply"** - a `Button` (shadcn) linking to `/app/apply/auto-apply`. There is deliberately **one** control and it is navigational, not a live toggle, so Home can never submit an application. The live on/off switch stays inside `AutoApplyTab`.

#### Queued-role chip content and fallback (the type marks these best-effort)

`AutoSubmitApprovalView` marks `company`, `role`, and `title` as `?: string | null`, and its doc-comment is explicit: "Company / role / match% are best-effort enrichments ... NOT guaranteed ... every consumer must render them defensively (fall back to the posting URL's host)." The bar therefore derives chip text defensively and **never renders an empty chip**:

```
label  = role ?? title ?? hostOf(apply_url ?? application_url ?? url) ?? 'Queued role'
company = company ?? hostOf(url) ?? (omit the sublabel entirely)
```

where `hostOf(u)` parses the hostname from a URL (stripping a leading `www.`) and returns `undefined` on a missing/unparseable URL. If `label` resolves to `'Queued role'` AND there is no company, the chip still renders with the single `'Queued role'` text (never blank). A `queued` state chip is neutral/muted toned, never cherry (which means "active") and never sage (which means "verified/submitted").

#### States (the `available` lifecycle, all cases)

`useAutoSubmit().pending`/`waiting` are only populated when `available === true` (the `pendingQuery` is `enabled: available === true`), and `available` is `undefined` until the settings query resolves. The bar must distinguish the still-resolving case from the paused case, or it would briefly claim "paused" on every load even when the feature is actually on. The complete state table:

| Condition | What the bar shows |
|---|---|
| `available === undefined` (settings still resolving; tie to `settingsLoading`) | **Slim skeleton bar** - same height as the final bar, no "paused" text yet, zero layout shift. NOT the paused line. |
| `available === false` (flag off, 404) | Calm paused line: "Auto-Apply is paused. When it is back, approved roles will queue here." + the "Preview Auto-Apply" CTA. |
| `available === true` and `pending.length + waiting.length === 0` | Calm "nothing queued yet" line: "Auto-Apply is paused. Nothing is queued right now." + CTA. |
| `available === true` and queue > 0 | "PAUSED - PREVIEW" label + up to 3 queued-role chips (derived as above) + CTA. |
| `pendingError` (query errored while `available === true`) | Falls back to the calm paused line (preview is best-effort; a failed read never blocks Home). **No retry button on Home** - the full `AutoApplyTab` owns retries via `refetchPending`. |

The skeleton is tied to `available === undefined` / `settingsQuery.isLoading`, **not** to `pendingLoading` (which never fires while `available !== true`, so keying the skeleton off it would show the paused line during the real first load).

Because the bar reads `useAutoSubmit` (React Query, `staleTime`/`refetchInterval` already tuned) it adds no new API method and no new fetch pattern. It is a pure read; it calls none of the hook's mutating actions.

### 5.5 Mobile: the Instagram-style strip

On `< md`, the same `AutoApplyPreviewBar` renders as a horizontally scrollable, snap-aligned strip (the Instagram/Robinhood pattern):
- A leading "status card" (large tap target, >=44px) showing the "Paused - Preview" label and the "Preview Auto-Apply" CTA.
- Followed by up to 3 queued-role cards, each a large rounded tile (label + company derived by the same fallback as 5.4 + a muted "queued" chip), horizontally scrollable with `snap-x snap-mandatory`, momentum scroll, and `overflow-x-auto` **contained inside the panel** (never the page - the shell's `overflow-x-hidden` means the strip must scroll within its own box, which `overflow-x-auto` on the strip container provides).
- Tapping any card routes to `/app/apply/auto-apply` (preview); none submits.
- The strip honors the same state table as 5.4: skeleton while `available === undefined`, the calm paused card when flag-off / empty / errored, chips only when `available === true` with a non-empty queue.

#### Responsive-switch mechanism (exactly one landmark)

The bar and the strip are two inner layouts of **one** component, and the component emits exactly **one** labeled region so a screen reader never announces the Auto-Apply preview twice. Concretely:

```tsx
<section aria-label="Auto-Apply preview (paused)" role="region" className="...">
  {/* desktop bar: hidden below md */}
  <div className="hidden md:flex ...">{/* bar layout */}</div>
  {/* mobile strip: hidden at md and up */}
  <div className="flex md:hidden ...">{/* strip layout */}</div>
</section>
```

The single `aria-label` / `role="region"` lives on the **outer `<section>`**, which is always present; only the inner bar/strip `<div>`s toggle with `hidden md:flex` / `md:hidden`. Because a Tailwind `hidden` element is `display:none` (removed from the a11y tree), only one inner layout is ever exposed, and there is exactly one labeled landmark at every breakpoint. (If an implementer instead needs truly separate subtrees, only one may carry the `aria-label`/`role`; the other must be `aria-hidden`. The single-section form above is preferred and is the spec.)

Accessibility for the strip: the scroller is keyboard-reachable, cards are real links/buttons with focus-visible rings, and the horizontal order matches DOM order so arrow-key/tab traversal is sane. `prefers-reduced-motion` disables any snap/scroll animation flourish; the strip still scrolls, just without added motion.

### 5.6 Why this reads as "paused preview," not live

- Copy leads with "Paused" / "Preview," never "Auto-Apply is on."
- The only action is navigation to the full surface; there is no approve/submit/toggle on Home.
- Queued roles are shown read-only with a neutral "queued" chip (muted, not the cherry "active" tone, and never the success/sage tone which means "verified/submitted").
- If the backend flag is off, the bar states it plainly rather than hiding, so the capability stays discoverable without pretending to be active.

---

## 6. Responsive, theming, accessibility plan

### 6.1 Responsive

- **Desktop (`xl`+):** the two-column command center (section 3.3). Recovered width is spent on the KPI rail beside the hero and the 2fr/1fr chart split - not on stretching text.
- **Tablet (`md`-`lg`):** two-column KPI grid (2x2 - the KPI section is still single-column `md` within the pre-`xl` stack, so `KpiRow` keeps `orientation="grid"`'s 2-up here; `orientation="rail"` only applies in the `xl` right column), hero/matches/table full width, Trend/Funnel side by side. The Auto-Apply surface renders its thin horizontal bar layout (the `hidden md:flex` inner branch from 5.5).
- **Mobile (`< md`):** single column in reading order (hero -> matches -> KPI -> resume -> trends -> recent, per the recompose DOM order). The KPI rail wrapper is `grid-cols-1` here, so the four stat cards stack vertically full-width (each a large, legible card) rather than cramming into a strip - the scoreboard reads cleanly on a phone. Top Matches and the Auto-Apply surface become the Instagram-style horizontal snap strips (story-like, large tap targets). Primary CTAs are >=44px (the codebase already uses `min-h-11`). Bottom nav (`MobileNav`) is unaffected.
- **Overflow discipline:** every horizontal strip uses `overflow-x-auto` on its *own* container; nothing relies on page-level horizontal scroll (the shell clips it). No element exceeds `.page-full`'s box.

### 6.2 Theming

- Semantic tokens only: `bg-card`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`, `bg-primary`, `shadow-soft/-panel/-pop/-float`, and the glass tokens (`.glass-pane`, `--glass-*`). No raw hex in any component.
- Cherry stays action/identity only. The command center uses neutral card surfaces and hairline/shadow elevation for separation; cherry appears on CTAs, active states, focus rings, and scored chips - never as a panel background. The failure mode to avoid (accent creeping into cards until the page reads pink) is explicitly guarded by using `bg-card`/`bg-muted` for surfaces and reserving `bg-primary`/`primary/10` for controls and selection.
- Light mode stays bright: separation comes from `border-border` + `shadow-soft`, never from darkening the canvas.
- Status hues keep their meanings: sage=verified/submitted, amber=deadline/needs-you, red=failed. The Auto-Apply "queued" chip is muted/neutral, not a status hue.
- Dark mode: all of the above resolve through the `.dark` token swap already in `index.css`; glass darkens via the `.dark` `--glass-*` overrides. Every new surface is verified in both themes.

### 6.3 Accessibility

- **Focus:** every interactive element keeps a visible `focus-visible` ring (`.focus-ring-visible` or the inline `ring-2 ring-ring ring-offset-2` the codebase uses). The new bar/strip CTAs are real `<Button>`/`<a>` with rings.
- **ARIA / landmarks:** every Home zone is a labeled `<section>` per the recompose map in 3.3 - `"What needs you"`, `"Top matches"`, `"Where you stand"`, `"Trends"`, `"Recent roles"` - and the Auto-Apply surface is one labeled region (`"Auto-Apply preview (paused)"`) whose inner bar/strip layouts toggle without duplicating the landmark (section 5.5). The old combined `"Today's status"` label is retired. The Refresh control keeps its `aria-live` status announcement. Charts keep their `figcaption` + sr-only data table.
- **No color alone:** paused state = word + icon; trend direction = arrow icon + words (already in `KpiCards`); status pills = icon + label + hue (already in `primitives`); scored chips = number + band label.
- **Reduced motion:** all entrances go through `@/lib/motion` helpers that collapse to instant under `prefers-reduced-motion`; skeletons occupy the final layout so the page simply appears. Strip snap/scroll flourishes are disabled under reduced motion; scrolling still works.
- **Keyboard:** horizontal strips are tab/arrow reachable with DOM order matching visual order; no nested interactive elements inside links (the matches panel already enforces this).

---

## 7. Error handling (per operation that can fail)

Home composes several independent async surfaces; each owns its own state so one failure never blanks the page. This preserves the existing contract in `TodayPage.load()` (each fetch is `.catch(() => ({ error }))` and settled independently).

| Operation | Source | Failure condition | Recoverable? | What the user sees | Logged? |
|---|---|---|---|---|---|
| Dashboard overview / streak / funnel / saved | `apiService.getOverview/...` in `TodayPage.load` | network/5xx (caught to `{error}`) | Yes | The specific panel shows `PanelError` with a Try-again that re-runs `load()`; other panels stay live. KPI "counts unknown" only when both overview + streak fail. | Not to a remote sink; errors are reflected in UI state only (consistent with current code). |
| Today inbox | `apiService.getTodayInbox` | failure | Yes (best-effort) | Hero falls back to "today's status" branch; no error wall for a missing inbox (current behavior kept). | No. |
| Top matches scan | `useCombinedJobsCtx` | all sources fail | Yes | `PanelError` with a Rescan that calls `feed.sync(true)`; partial failures show a "N sources did not respond" degraded note (current behavior kept). | No. |
| Resume presence/upload | `apiService.listBaseResumes` / `uploadResumeForParser` | presence unknown / upload rejected | Yes | Presence-unknown -> panel stays silent (returns null); upload errors -> `toast.error` with the server message; size/type validated client-side before upload. | No (toast only). |
| Auto-Apply preview read | `useAutoSubmit().pending/waiting` (React Query) | query error / flag off | Yes (best-effort) | Bar falls back to the calm "paused" line; no error wall, no retry on Home (the full `AutoApplyTab` owns retry via `refetchPending`). Flag-off (`available === false`) is a normal state, shown as paused. | No. |

Validation rules for external input on Home:
- **Resume upload file** (only direct user input on Home): required to be `.pdf` or `.docx` (checked on filename), max 5MB (`MAX_BYTES`). On failure: `toast.error` and abort before any network call. (Unchanged from `ResumeEntryPanel`.)
- **Deep links** rendered in the hero inbox: resolved via `resolveDeepLink` against the `/app` base; external `http(s)` links open in a new tab with `noopener,noreferrer`. (Unchanged.)

Invariant ownership:
- "Cherry is action, not background" - owned at the component layer by using `bg-card`/`bg-muted` for surfaces and `bg-primary`/`primary/10` only for controls/selection. Reviewer-checkable by grepping new components for `bg-primary` on non-interactive containers.
- "One nav source of truth" - owned by `nav.config.ts`; the implementer must not hard-code an Auto-Apply entry anywhere else. The route in `App.tsx` is the only place the destination exists outside nav config, and it is intentionally a non-nav route.
- "No page-level horizontal overflow" - owned by each strip container (`overflow-x-auto` on itself), because the shell's `overflow-x-hidden` would otherwise clip it.

---

## 8. Testability

- **Unit-testable (Vitest + Testing Library, already used - see `autoSubmit/__tests__`):**
  - `AutoApplyPreviewBar`: given mocked `useAutoSubmit` returning `available:false`, empty queue, a 3-item queue, and an error - asserts the paused label renders, the "Preview Auto-Apply" link points at `/app/apply/auto-apply`, no submit/toggle control exists, and the chip tone is the neutral/muted class (not `bg-primary`/`bg-success`). This is the highest-value new test because it guards the "paused, not live" contract.
  - `KpiRow` `orientation="rail"`: asserts the wrapper carries the rail class (`xl:grid-cols-1`) vs. the grid default (`lg:grid-cols-4`), **in BOTH the loading and loaded branches** (render once with `loading`, once with data, assert the same wrapper class each time) - proves the re-orientation is presentational only and that loading/loaded share one layout (no shift). Also asserts the four metric contexts are unchanged from the grid rendering.
  - `nav.config`: a test asserting `APPLY_SECTIONS` no longer contains an `auto-apply` section, that `ALL_DESTINATIONS` therefore omits `/app/apply/auto-apply` (guards against a future re-add leaking it back into the palette), and that the Apply `NAV_ITEMS` hint no longer contains the string "Auto-Apply" (guards the stale-hint fix from section 5.2).
- **Integration-testable:**
  - Routing: `/app/apply/auto-apply` still resolves to `AutoApplyTab` after the nav entry is removed (render the router at that path, assert the tab mounts). Guards the "route stays reachable" requirement.
  - `/app/apply?approve=<token>` still mounts `ApproveLinkConfirm` (the emailed-link path), proving the demotion did not break approvals.
- **Hard to unit-test (accept as manual/visual verification):** the full-bleed grid breakpoints, glass rendering, light/dark correctness, and `prefers-reduced-motion` behavior. These are verified by `pnpm build` + manual check in both themes and at mobile/tablet/desktop widths. The design intentionally keeps layout logic as composition + Tailwind classes (not JS width math) so there is little imperative logic to test and the visual check is the right tool.
- **Build / verification gate (stated honestly):** the named gates are `pnpm build` (= `vite build`, bundle must succeed) + `pnpm test` (vitest, the unit/integration tests above must pass) + `pnpm copy:check` (all new copy is ASCII). **`vite build` does not typecheck and there is no `tsc` gate**, so "no new TS errors" is NOT machine-enforced by any gate the repo runs - type correctness of the new/edited files is **author-verified** (editor/`tsc --noEmit` locally if desired) rather than CI-enforced. The hard invariant is only "do not ADD new TS errors and do not fix the repo's known pre-existing ones," and the change surface here (one new component, one prop, two config strings, composition in `TodayPage`) is small and strongly typed against existing types, so author verification is sufficient.

---

## 9. Files touched (summary for the implementer)

Modify:
- `src/app-shell/pages/TodayPage.tsx` - `page-measure` -> `page-full`; recompose into the two-column command center; remove the `FeatureLaunchpad` render and its import; render `AutoApplyPreviewBar` as Row 1; pass `orientation="rail"` to `KpiRow` in the `xl` right column.
- `src/app-shell/pages/today/KpiCards.tsx` - add optional `orientation` prop (`"grid"` default | `"rail"`) threaded through a shared `wrap` class in BOTH the loading and data branches; no metric change (section 4 contract).
- `src/app-shell/nav.config.ts` - three edits: (1) remove the `auto-apply` object from `APPLY_SECTIONS`; (2) change the Apply `NAV_ITEMS` hint to `"Tracker, inbox, and daily pipeline"`; (3) change the `autonomy` Settings hint to `"Set how far Auto-Apply will go once it is back on"` (keywords unchanged). All ASCII.
- `src/index.css` - additive `@layer components` helpers only (optional Home grid helper, glass-bar/strip helpers) in existing tokens. Do not edit `.page-measure`/`.page-full` or any palette primitive.

Add:
- `src/app-shell/pages/today/AutoApplyPreviewBar.tsx` - the desktop glass bar + mobile strip (reads `useAutoSubmit`, no new API).
- Tests under `src/app-shell/pages/today/__tests__/` and a `nav.config` guard test as described in section 8.

Keep (do NOT delete):
- `src/components/autoSubmit/*` (all of it), `src/types/autoSubmit.ts`, `src/hooks/useAutoSubmit.ts`.
- `src/app-shell/pages/today/FeatureLaunchpad.tsx` (removed from Home, file retained).
- The `<Route path="auto-apply" element={<AutoApplyTab />}>` in `src/App.tsx` and the `approve`-token mount in `ApplicationsPage.tsx`.

Do NOT touch (behavior must not regress):
- Resume upload (`ResumeEntryPanel` + `src/components/resume/*`), Jobs (`DiscoverPage` / `/app/jobs`), Tailoring (`CraftPage` + `src/app-shell/pages/craft/*`). Polish for visual cohesion only, no behavior change.
- `src/lib/api.ts` (owned elsewhere; all data goes through the existing `apiService`).

---

## 10. Open assumptions (flag for review)

1. **`.page-full` cap at 120rem is the right fill.** Assumed acceptable per the task's "fill the screen intentionally while keeping comfortable reading measure." If the user wants edge-to-edge beyond 1920px, that would require a new width recipe; this design deliberately does not, to stay within the proven, overflow-safe pattern.
2. **`FeatureLaunchpad` is cut from Home but the file is retained.** Assumed the discoverability it provided is covered by ⌘K palette + More sheet + the Auto-Apply bar. If the user wants a shortcut grid to remain somewhere, it can be re-homed later without affecting this layout.
3. **Auto-Apply removed from `APPLY_SECTIONS` (not merely flag-hidden).** Assumed the cleaner "paused" story is to not list a live-sounding destination in nav while keeping the route reachable. If the user prefers it to remain visible-but-disabled in nav, that is a one-line alternative in `nav.config.ts`.
4. **No new backend contract.** The preview bar reuses `useAutoSubmit` reads only; it adds no API method and never submits from Home.

---

## 11. Responses to design review

The review (`docs/design/dashboard-redesign-review.md`, verdict CHANGES_REQUESTED: 2 HIGH, 4 MEDIUM, 5 NIT) was accurate on every point I re-verified against source. All HIGH and MEDIUM findings are addressed; all NITs are addressed too. Each finding and the resolution:

- **[HIGH] 1 - `KpiRow` has no `orientation` prop and hardcodes its grid in two branches (layout-shift risk).** ADDRESSED. Section 4 now gives the explicit prop contract: a single `wrap` class derived from `orientation` is used in BOTH the loading-skeleton branch and the data branch, so loading and loaded share one layout with no shift. The prop defaults to `'grid'` (current behavior unchanged); `'rail'` is the new wrapper. The claim is no longer "presentational only" hand-waving - the exact code shape and both-branch requirement are stated.

- **[HIGH] 2 - grid places the KPI rail in a sibling column but `TodayPage` nests `KpiRow` inside the hero's section; recompose vs. existing landmarks unspecified.** ADDRESSED. Section 3.3 now has a "Concrete DOM recompose and landmark map" with the actual JSX: left column (`xl:col-span-2`) holding `HeroPanel` + `TopMatchesPanel`, right column (`xl:col-span-1`) holding the KPI rail as its own `<section aria-label="Where you stand">`. The explicit grid classes, the retirement of the combined `"Today's status"` label, the new per-section `aria-label`s, and the reassigned `rise(order)` stagger are all specified. Section 6.3 and the earlier "landmarks preserved" wording are corrected to "re-labeled, not preserved."

- **[MEDIUM] 3 - queued-role chips read best-effort `company`/`role` with no fallback.** ADDRESSED. Section 5.4 now specifies the derivation: `label = role ?? title ?? hostOf(apply_url ?? application_url ?? url) ?? 'Queued role'`; `company = company ?? hostOf(url) ?? omit`; and the rule that a chip never renders empty.

- **[MEDIUM] 4 - `pending`/`waiting` empty until `available === true`; the `undefined` (settings resolving) case was omitted, risking a false "paused" flash on load.** ADDRESSED. Section 5.4 now has a complete state table: `available === undefined` -> slim skeleton (tied to `settingsLoading`, not `pendingLoading`); `available === false` -> calm paused line; `available === true` & empty -> "nothing queued yet"; `available === true` & queue > 0 -> paused label + up to 3 chips; `pendingError` -> calm paused line.

- **[MEDIUM] 5 - exact Settings `autonomy` hint string not given.** ADDRESSED. Section 5.3 specifies the ASCII string `"Set how far Auto-Apply will go once it is back on"` and states the `keywords` line is left as-is so the palette still finds it.

- **[MEDIUM] 6 - stale Apply `NAV_ITEMS` hint and no check for tests asserting the 4-tab Apply strip.** ADDRESSED. Section 5.2 adds the hint change `"Tracker, inbox, and daily pipeline"`, records that I grepped `**/*.test.tsx` for "Auto-Apply" and found no test asserting it in the Apply SubNav strip, and requires the implementer to re-grep after the edit. Section 8's nav guard test now also asserts the hint no longer contains "Auto-Apply."

- **[NIT] 7 - width-gain number wrong.** FIXED. Section 3.1 now states "up to 768px more at >=1920px, ~160px more at 1440px, and no difference below the 72rem cap," with the arithmetic shown.

- **[NIT] 8 - `.page-full.studio-canvas` interaction unaddressed.** FIXED. Section 3.1 adds the explicit line: Home uses `page-full` ALONE; do not add `studio-canvas`/`surface-studio` (CraftPage's canvas treatment), with the reason (unwanted full-viewport box-shadow + studio scope).

- **[NIT] 9 - glass "2-3 panes" asserted without a Home audit.** FIXED. Section 1 now states Home content glass = exactly 1 (`AutoApplyPreviewBar`); shell chrome glass (top bar, nav) is pre-existing and counted separately.

- **[NIT] 10 - bar/strip responsive switch mechanism unspecified (double-announce risk).** FIXED. Section 5.5 specifies one labeled `<section>` carrying the single `aria-label`/`role="region"`, with inner bar/strip `<div>`s toggled by `hidden md:flex` / `md:hidden` (a `hidden` element is out of the a11y tree, so exactly one landmark exists at every breakpoint); the two-subtree fallback (`aria-hidden` on the inactive one) is noted as secondary.

- **[NIT] 11 - "no new TS errors" not enforced by the named gate.** FIXED. Section 8 now states the gate honestly: `pnpm build` (bundle only, no typecheck) + `pnpm test` + `pnpm copy:check`; there is no `tsc` gate, so type correctness is author-verified, and the only hard rule is "do not ADD new TS errors, do not fix pre-existing ones."

No finding was backlogged or declined; all were in scope and consistent with the original requirements (full-width Home, pain-point-earned panels, Auto-Apply demoted-not-deleted, resume/jobs/tailoring untouched, responsive + themed + accessible).
