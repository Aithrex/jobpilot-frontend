# JobPilot Design System (Shipped)

> **This document describes the token system that is LIVE in the app.**
> The single source of truth is **`src/index.css`** (runtime CSS custom properties,
> light + dark) plus its **`tailwind.config.ts`** mappings. If this document and
> the code ever disagree, the code wins; fix the doc.
>
> Older direction docs are **superseded** and kept only for history:
> `docs/design/archive/2026-superseded-violet-cyan-spec.md` (violet/cyan, Space Grotesk),
> `docs/design/token-decisions.md`, `docs/design/tokens.proposal.css`,
> `docs/design/token-reference.html` (the proposal that BECAME this system).

## 1. Thesis: "Ink and Aubergine"

Aspirely is a daily job-search agent. A job search runs for months, so the
canvas has to be liveable rather than loud: a cool paper page, near-black ink,
and one deep accent for the thing you act on. It is deliberately NOT a blue
enterprise dashboard, a crypto console, or a glossy startup landing page.

**It is also deliberately not the parent company's palette.** `aithrex.tech`
runs `#FBFAF7` parchment with a `#B8623A` terracotta accent, a warm sand band
and a forest green. An earlier pass of this redesign landed on warm clay over
parchment and was effectively a clone of it, down to the two-tone headline and
the terracotta pill CTA - Aspirely read as an Aithrex sub-page rather than as
its own product. Both halves moved in response, not just the accent: a shared
canvas is as much of a collision as a shared brand colour. **Do not reintroduce
warm parchment or terracotta here.**

Aubergine is not a walk back to the violet-indigo this system started with.
That was hue 256 at 70-80% saturation - electric and blue-leaning. This is hue
289 at 25%, dark and muted, and the neutral ramp sits at 5-14% saturation so it
reads as grey rather than as tinted violet.

Color discipline:

- **Aubergine** (`--primary`, `#734A7C` light / `#C49BCB` dark) is the ONE brand and action accent.
- **Sage** (`--success`) only for verified or positive evidence (sponsor proven, screened, offer). Never decorative.
- **Amber** (`--warning`) and **brick** (`--destructive`) only for caution, deadlines and risk. Amber is never a CTA.
- **Muted teal** (`--info`) is the single cool hue, and it is informational only.
- Everything else is the cool ash neutral ramp on cool paper (light) or graphite (dark). Never pure `#000`/`#FFF` canvases.
- **No blue or indigo is an action colour anywhere.** The old violet-indigo identity is retired; the `--indigo-*` ramp has been deleted.

## 2. Token architecture

Two layers in `src/index.css`, all HSL triplets consumed through the shadcn
`hsl(var(--x))` bridge:

1. **Primitives** (theme independent): the cool neutral ramp `--ash-0-hsl`
   ... `--ash-900-hsl`, the aubergine accent (`--plum-fill-hsl`,
   `--plum-ink-hsl`, `--plum-ink-dark-hsl`, `--plum-tint-hsl`,
   `--plum-tint-dark-hsl`), the graphite dark stack (`--app-*-dark-hsl`), the landing's deeper
   `--obsidian-*`, the Resume Studio `--studio-*`, status foregrounds and
   tints, chart palette, radius, type, motion.
   Primitives are referenced ONLY inside `index.css`. No `.ts`/`.tsx` file
   reads one, which is what makes a palette change a values-only edit.
2. **Semantic aliases**: the shadcn names
   (`--background`, `--card`, `--primary`, `--muted-foreground`, `--border`,
   `--ring`, ...) re-pointed at primitives. Components use ONLY semantic
   Tailwind classes (`bg-background`, `text-muted-foreground`, `border-border`,
   `bg-primary`, `text-success`, ...). **Never raw hex or arbitrary `[#...]`
   values in components.**

### There are SIX token scopes, not two

This is the single most important thing to know before editing the palette. A
change that touches only `:root` and `.dark` will leave the public landing and
`/app/resume/*` on the old colours.

| Scope | Applied by |
|---|---|
| `:root` (light) | default |
| `.dark` | `components/theme-provider.tsx` puts the class on `<html>` |
| `.surface-editorial` | `landing/LandingExperience.tsx` (landing, light) |
| `.surface-obsidian` | `landing/LandingExperience.tsx` (landing, dark) |
| `.surface-studio` | `app-shell/pages/CraftPage.tsx` (`/app/resume/*`, light) |
| `.dark .surface-studio` | the same, dark |

Each re-points the WHOLE semantic layer for its subtree, so the surfaces nest
freely and every child resolves `bg-card` / `text-muted-foreground` /
`border-border` correctly without a single `dark:` variant.

**Semantic token names may be added but never renamed or removed** - roughly
477 `text-primary` call sites and every shadcn primitive depend on them.
(Primitive names are free to change; they have no consumers outside this file.)

### `--primary` vs `--primary-ink`: the non-obvious mechanic

`tailwind.config.ts` overrides the `textColor` key so that **`text-primary`
resolves to `--primary-ink`** while `bg-primary` / `border-primary` /
`ring-primary` stay on `--primary`. They are different colours because a fill
and a text tone have different jobs:

- **Light:** the fill is `#734A7C`; the ink is one step darker, `#6B4373`, and
  both clear AA on the soft-mauve `--nav-active` tint.
- **Dark:** both are the lifted `#C49BCB`. Dark buttons therefore carry
  **graphite ink, not white** - the mirror of light mode rather than a
  contradiction of it. On a light page the accent is dark, so it carries light
  text and reads as text; on a dark page it is light, so it does the inverse.

## 3. Palette

### Neutrals (cool ash ramp)

| Token | Hex | Role |
|---|---|---|
| `--ash-0-hsl` | `#FAFAFB` | card / popover surface (light). Not pure white. |
| `--ash-50-hsl` | `#F1F0F3` | cool paper canvas (light) |
| `--ash-100-hsl` | `#E5E3EA` | muted / secondary / accent surface |
| `--ash-200-hsl` | `#DAD7E0` | hairline border |
| `--ash-300-hsl` | `#89859A` | input border (light). Dark on purpose - see below. |
| `--ash-400-hsl` | `#ABA7B4` | icon-only / disabled on light; muted TEXT on dark |
| `--ash-500-hsl` | `#63606B` | muted text (5.42:1 canvas, 4.83:1 on the muted fill) |
| `--ash-600-hsl` | `#55525E` | muted text on tinted surfaces |
| `--ash-700-hsl` | `#423F4C` | secondary foreground |
| `--ash-800-hsl` | `#2E2C34` | |
| `--ash-900-hsl` | `#23212A` | body text (light) - 13.99:1 on the canvas |

**`--input` is not a hairline.** A field border is a control boundary and owes
WCAG 1.4.11 3:1 against its adjacent surface; the old `slate-300` on white
measured 1.74:1 and failed. Every scope's `--input` now clears 3:1, so expect
visibly heavier field borders than before. That is the fix, not a regression.

### Brand

- Primary fill: `--plum-fill-hsl` = `hsl(289 25% 39%)` (`#734A7C`). Warm white on it = 6.71:1 (AA).
- Primary ink: `--plum-ink-hsl` = `hsl(290 26% 36%)` (`#6B4373`). 6.91:1 on canvas, 6.29:1 on the active tint.
- Dark primary: `--plum-ink-dark-hsl` = `hsl(291 32% 70%)` (`#C49BCB`), carrying **graphite ink** at 7.56:1.
- Active/selected tint: `--nav-active` = `--plum-tint-hsl` (`#EDE3EF` soft mauve) / `--plum-tint-dark-hsl` (`#2E2333`). Defined in every scope; it used to exist only inside `.surface-studio`, so `.studio-nav-row` resolved to an invalid colour anywhere else.
- Gradient: `--brand-from` (aubergine) to `--brand-to` (`#9E5687` mauve-rose); decorative only (`.brand-gradient`, `.gradient-text`).
- Logo tile: `--brand-mark-from/to-hsl` (`#734A7C` -> `#452B54`), theme-independent, glyph `--brand-mark-fg-hsl` at 6.71:1 -> 11.2:1.

### Status roles (light / dark)

| Role | Light | Dark | Use |
|---|---|---|---|
| `--success` | `hsl(156 31% 31%)` `#376854` sage (6.09:1 on canvas) | `hsl(154 34% 63%)` `#7FC0A4` | verified, positive evidence only |
| `--warning` | `hsl(36 77% 31%)` `#8A5A12` amber (5.19:1) | `hsl(39 71% 63%)` `#E3B45C` | caution, deadlines, quota-near |
| `--destructive` | `hsl(3 53% 42%)` `#A53832` brick (5.74:1) | `hsl(4 76% 73%)` `#EE8B84` | errors, scam risk, refusals |
| `--info` | `hsl(184 42% 32%)` `#2F6E73` (5.12:1) | `hsl(184 39% 64%)` `#7FC2C7` | neutral secondary signal only |

Warning amber is much darker than it looks like it should be. Yellow is
intrinsically light: the originally briefed `#A96F18` measured 3.71:1 on the
canvas and failed, and white on it was only 4.22:1. `#8A5A12` clears both ways
and still reads burnished rather than brown.

Sage, amber and brick are now the **only warm hues in the system**, which is
precisely why they read as meaning rather than as decoration.

All four flip automatically in `.dark`; components never need `dark:` variants
for status color. Standard chip recipe: `border-<role>/30 bg-<role>/10
text-<role>` (light tint, AA foreground, hairline border). Never color-only:
every status chip pairs color with an icon or label.

### Chart palette (categorical, cap 8)

`--chart-1` ... `--chart-8` are raw hex (aubergine, sage, amber, plum, teal,
brick, ash, rose) for raw consumers; the additive `--chart-N-hsl` triplets bridge
them into Tailwind (`text-chart-1`, `bg-chart-3/10`, ...). The ramp steps
LIGHTNESS as well as hue so the series survives greyscale and deuteranopia.
Always add a second cue (shape, label, position) beyond hue.

**Known limitation:** this is a single set tuned for the light canvas. On
graphite the same values measure roughly 1.8-3.7:1, i.e. most of a series would be
hard to read in dark mode. A per-theme override is the correct fix and is not
yet done - no component consumes `--chart-*` today, so nothing renders wrong
right now, but wire the dark set before the first chart ships.

## 4. Typography

- **Body/UI:** Inter (400 to 800), `font-feature-settings` with `cv11`/`ss01`. 14 to 15px base.
- **Display/headings:** Plus Jakarta Sans (`font-display`), tracking `-0.02em`. Applied to `h1/h2/h3` globally.
- **Data/mono:** JetBrains Mono (`font-mono`) for scores, counts, countdowns, salaries; `tabular-nums` wherever numbers live.

Named Tailwind steps (additive to the default scale): `text-display`,
`text-title` (1.75rem/700), `text-h1` (1.5rem/700), `text-h2`, `text-h3`,
`text-body` (0.9375rem), `text-caption` (0.8125rem). The `.overline` class is
the quiet uppercase kicker (11px, weight 600, tracking 0.06em,
muted-foreground). Job titles and companies are always Title-Cased via
`toTitleCase()` (`src/lib/format.ts`); never render scraped ALL CAPS.

## 5. Spacing, radius, borders

- **Spacing:** 4/8px rhythm using the default Tailwind scale. Group with whitespace before borders.
- **Radius:** shadcn base `--radius: 0.75rem` derives `rounded-lg/md/sm`. Two-radius system on new surfaces: `rounded-control` (8px) for inputs/buttons, `rounded-container` (16px, or `rounded-2xl`) for cards/panels. Pills are `rounded-full`.
- **Borders:** thin hairlines only; `border-border` (ash-200 light / graphite hairline dark), often softened as `border-border/60` or `/70`. Inputs use `--input`, which is a much darker step and now clears WCAG 1.4.11 3:1 on its own rather than leaning on the focus ring.

## 6. Elevation and glass

Token shadows (theme aware; ink-tinted in light - `hsl(255 18% 12%)`, because a shadow whose hue fights the page reads as a stain rather than as shade - and deeper black halos in dark):

| Class | Use |
|---|---|
| `shadow-soft` | resting cards |
| `shadow-panel` | hover lift, raised panels |
| `shadow-pop` | popovers, toasts |
| `shadow-float` | modals, floating bars |

Surface recipes in `@layer components`: `.surface` (flat panel), `.panel`
(soft lift), `.card-interactive` and `.card-hover` (calm 2px translate-y lift,
200ms, `ease-expo`), `.mesh-accent` / `.mesh-warning` (the ONE sanctioned
gradient wash, hero surfaces only).

**Glass:** `.glass-nav` is the canonical frosted recipe, reserved for sticky or
fixed chrome (top bar, mobile nav, sidebar via `.glass-nav-sidebar`, sticky
filter bars via `.glass-nav-card`). It is token-driven
(`hsl(var(--glass-bg) / 0.7)` + 16px blur) and falls back to a SOLID fill via
`@supports not ((backdrop-filter: ...))` so unsupported browsers never get
smeary translucent bars. Do not hand-roll new blur recipes and do not put blur
on list rows or content cards. (`.glass-card` is legacy; prefer `.surface` or
`.glass-nav`.)

## 7. Motion

Tokens: `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 320ms`.
Easings: `--ease-standard`, `--ease-accelerate` (exits), and `--ease-out-expo`
(= `--ease-decelerate`, entrances; Tailwind `ease-expo`).

- Micro interactions 120 to 200ms; orchestrated reveals 200 to 320ms. Prefer `transform`/`opacity` only.
- Framer Motion 12 for reveals; always gate with `useReducedMotion()`. A global `prefers-reduced-motion` net in `index.css` collapses all CSS animation.
- Theme toggles suppress transitions globally (`html.theme-transitioning`) to repaint in one pass.
- Skeletons that match final layout for loading; no spinner-only primary states.

## 8. Focus and interaction states

- Convention: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (+ `ring-offset-2 ring-offset-background` on filled surfaces). shadcn `ui/*` primitives ship this; hand-rolled controls use the `.focus-ring-visible` class or the same utilities inline. The ring colour (`--ring`) is the aubergine accent in every scope: `#6B4373` on light (6.91:1 against the canvas) and `#C49BCB` on dark (7.56:1). Both are far past the 3:1 that a non-text indicator owes.
- Every interactive element: pointer cursor (global rule), visible keyboard focus, 44px minimum touch target on mobile nav and primary actions.
- Loading, empty (guidance + one CTA), error (recoverable), and success states are mandatory for every async surface. Quota and upgrade surfaces (`LockBadge`, `QuotaMeter`, `QuotaLimitDialog`) stay encouraging, never punitive: warning tint near the cap, destructive only at exhaustion, always with a next step.

## 9. Company identity accents

Cards may carry a deterministic company hue from `hueFromString()`
(`src/lib/format.ts`), applied ONLY as a tint (monogram tile background at
about 14% opacity + inset hairline). This is the sanctioned exception to
"no inline hsl" because the hue is data-derived; keep lightness/saturation
recipes exactly as in `KanbanBoard`/`JobCard` so tiles stay AA in both themes.

## 10. Guardrails

- Build is `vite build` only (no tsc gate); add zero new TS or lint errors.
- Token-driven: no raw hex, no ad-hoc Tailwind palette classes (`bg-purple-50`, `text-emerald-600`, ...) in components; map to semantic roles instead.
- Verify every visual change in light AND dark, mobile AND desktop, plus a keyboard-only pass.
- Add tokens to `src/index.css` additively only; never rename or remove existing names (the landing pins them by name).
- User-facing copy: no em/en dashes, no accented characters.
