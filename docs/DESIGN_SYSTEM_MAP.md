# JobPilot Design System (Shipped)

> **This document describes the token system that is LIVE in the app.**
> The single source of truth is **`src/index.css`** (runtime CSS custom properties,
> light + dark) plus its **`tailwind.config.ts`** mappings. If this document and
> the code ever disagree, the code wins; fix the doc.
>
> Older direction docs are **superseded** and kept only for history:
> `design-system/jobpilot/MASTER.md` (violet/cyan, Space Grotesk),
> `docs/design/token-decisions.md`, `docs/design/tokens.proposal.css`,
> `docs/design/token-reference.html` (the proposal that BECAME this system).

## 1. Thesis: "Signal, not noise"

JobPilot is a career workspace for people drowning in job-board noise. Every
surface has one job: surface the few things that matter (fit, trust, visa
eligibility, freshness) and make acting on them effortless. Calm, premium,
trustworthy. One signature element per surface; everything else quiet.

Color discipline:

- **Indigo** (`--primary`, `hsl(238 70% 57%)`, `#454ADE`) is the ONE brand accent.
- **Green** (`--success`) only for verified or positive evidence (sponsor proven, screened, offer).
- **Amber** (`--warning`) and **red** (`--destructive`) only for caution and risk.
- **Cyan/sky** (`--info`, plus the `--brand-to` gradient stop) is the single restrained secondary accent (remote, saved, learning).
- Everything else is the slate neutral ramp on off-white (light) or deep slate (dark). Never pure `#000`/`#FFF` canvases.

## 2. Token architecture

Two layers in `src/index.css`, all HSL triplets consumed through the shadcn
`hsl(var(--x))` bridge:

1. **Primitives** (theme independent): `--slate-0-hsl` ... `--slate-900-hsl`,
   the indigo ramp (`--indigo-300-hsl` ... `--indigo-primary-hsl`,
   `--indigo-dark-hsl`), status foregrounds and tints, chart palette, radius,
   type, motion.
2. **Semantic aliases** (light `:root`, dark `.dark`): the shadcn names
   (`--background`, `--card`, `--primary`, `--muted-foreground`, `--border`,
   `--ring`, ...) re-pointed at primitives. Components use ONLY semantic
   Tailwind classes (`bg-background`, `text-muted-foreground`, `border-border`,
   `bg-primary`, `text-success`, ...). **Never raw hex or arbitrary `[#...]`
   values in components.**

The landing (`src/components/landing/LandingExperience.tsx`) pins the semantic
tokens to their light values by NAME (`LIGHT_SURFACE`). Because of this,
**tokens may be added but existing token names must never be renamed or
removed.**

## 3. Palette

### Neutrals (slate ramp)

| Token | Hex | Role |
|---|---|---|
| `--slate-0-hsl` | `#FFFFFF` | card / popover surface (light) |
| `--slate-50-hsl` | `#F8FAFC` | app background (light) |
| `--slate-100-hsl` | `#F1F5F9` | muted / secondary / accent surface |
| `--slate-200-hsl` | `#E2E8F0` | hairline border |
| `--slate-300-hsl` | `#CBD5E1` | input border (light) |
| `--slate-400-hsl` | `#94A3B8` | icon-only / disabled; **never text on light** |
| `--slate-500-hsl` | `#64748B` | muted text on white/slate-50 |
| `--slate-600-hsl` | `#475569` | muted text on tinted surfaces |
| `--slate-700-hsl` | `#334155` | secondary foreground |
| `--slate-800-hsl` | `#1E293B` | card surface (dark) |
| `--slate-900-hsl` | `#0F172A` | text (light) / background (dark) |

### Brand

- Primary: `--indigo-primary-hsl` = `hsl(238 70% 57%)` (`#454ADE`). White on it = 6.41:1 (AA).
- Dark-mode primary: `--indigo-dark-hsl` = `hsl(235 84% 72%)` (lifted indigo; slate-900 foreground).
- Gradient: `--brand-from` (indigo 600) to `--brand-to` (sky `199 89% 48%`); decorative only (`.brand-gradient`, `.gradient-text`, `.btn-premium`).
- `--indigo-500-hsl` (`#6366F1`) is for tints only: white on it is 4.47:1, just below AA for normal text.

### Status roles (light foreground / dark foreground)

| Role | Light | Dark | Use |
|---|---|---|---|
| `--success` | `hsl(142 72% 29%)` (5.02:1 on white) | `hsl(142 69% 58%)` | verified, positive evidence only |
| `--warning` | `hsl(26 90% 37%)` (5.02:1) | `hsl(43 96% 56%)` | caution, quota-near, partial |
| `--destructive` | `hsl(0 74% 42%)` | `hsl(0 91% 71%)` | errors, scam risk, refusals |
| `--info` | `hsl(193 82% 31%)` | `hsl(188 86% 53%)` | neutral-positive secondary signal (remote, saved) |

All four flip automatically in `.dark`; components never need `dark:` variants
for status color. Standard chip recipe: `border-<role>/30 bg-<role>/10
text-<role>` (light tint, AA foreground, hairline border). Never color-only:
every status chip pairs color with an icon or label.

### Chart palette (categorical, cap 8)

`--chart-1` ... `--chart-8` are raw hex (blue, green, amber, violet, cyan, red,
slate, pink) for raw consumers; the additive `--chart-N-hsl` triplets bridge
them into Tailwind (`text-chart-1`, `bg-chart-3/10`, ...). Colorblind-aware:
always add a second cue (shape, label, position) beyond hue.

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
- **Borders:** thin hairlines only; `border-border` (slate-200 light / slate-700 dark), often softened as `border-border/60` or `/70`. Inputs use `--input`. Note: slate-300 as a control's sole boundary is 2.56:1, below the 3:1 of WCAG 1.4.11, so inputs also rely on background contrast and the focus ring.

## 6. Elevation and glass

Token shadows (theme aware; slate-tinted in light, deeper black halos in dark):

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

- Convention: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (+ `ring-offset-2 ring-offset-background` on filled surfaces). shadcn `ui/*` primitives ship this; hand-rolled controls use the `.focus-ring-visible` class or the same utilities inline. The ring color (`--ring`) is the indigo primary in both themes.
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
