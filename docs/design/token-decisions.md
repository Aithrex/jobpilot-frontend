> ## SUPERSEDED - PROPOSAL SINCE SHIPPED
>
> This proposal was implemented; the values below now live in **`src/index.css`**
> (the single source of truth) and are documented in **`docs/design/system-map.md`**.
> Read those instead; this file is kept only for the contrast-math rationale.

# JobPilot — Reconciled Design-Token Proposal

> **Status: PROPOSAL — review before lock. Nothing here is wired into the running app.**
> Source of truth captured from `src/index.css`, `tailwind.config.ts`, `components.json`
> on 2026-07-11. All contrast ratios below are computed with the WCAG 2.1
> relative-luminance formula (not eyeballed). AA = 4.5:1 text / 3:1 large & UI;
> AAA = 7:1.

---

## 0. Executive summary — what changes and why

**Good news the audit surfaced:** the app's established indigo primary
(`#454ADE`, `hsl(238 70% 57%)`) **already passes AA** in every role it holds —
white-on-primary buttons **6.41:1**, primary-as-text on white **6.41:1**, focus
ring vs background **6.25:1**. So the user's chosen direction ("keep the indigo
where it passes") means **primary stays exactly as-is** in both themes. No
darkening required.

**What we reconcile toward the master prompt:**

| Area | Decision |
|---|---|
| Neutrals | **Adopt the master slate ramp verbatim.** Current neutrals are a slightly bluer, ad-hoc slate; the master slate is a documented, colorblind-safe ladder. |
| Status colors | **Adopt master status palette** — the current `--success` (3.35:1) and `--warning` (3.15:1) **FAIL as normal text on white**; master `#15803D`/`#B45309` pass at 5.02:1. This is the single biggest accessibility fix. |
| Background | Move to **off-white `#F8FAFC`** (was `#FCFDFE`) + white cards; dark stays **near-black `#0F172A`** (never `#000`). Satisfies "near-black on off-white." |
| Type / spacing / radius / elevation / motion | Adopt the master scales; most map cleanly onto existing Tailwind utilities and CSS vars (additive, strangler-fig). |

**Pairs that had to be adjusted or flagged to pass:**

1. **`--success` / `--warning` normal text** — current fails (3.35 / 3.15). Replaced with master `#15803D` / `#B45309` → 5.02:1 AA. **(fixed)**
2. **Muted text on tinted surfaces** — `slate-500` on `slate-100` = **4.34:1 (fails normal text)**. Rule added: muted body text on `slate-100/200` surfaces must step to **`slate-600`** (6.92:1). **(rule)**
3. **`indigo-500 #6366F1` as solid-button text bg** — white on it = **4.47:1** (the classic "just fails" value). We **do not** promote indigo-500 to primary; primary stays the darker `#454ADE` (6.41:1). **(guarded)**
4. **Input/`slate-400` borders** = 2.56:1 vs white — below the 3:1 of WCAG 1.4.11 when a border is a control's *sole* boundary. Mitigation documented in §3. **(flagged)**
5. **`slate-400` as placeholder text** = 2.56:1 — **never use `slate-400` for text**; placeholders use `slate-500` (4.55–4.76:1). **(rule)**

---

## 1. Color primitives

Two ramps only: **slate** (neutrals, carry all everyday UI) and **indigo**
(brand accent, used sparingly). Status + chart palettes below.

### 1.1 Slate neutrals — adopt master verbatim

| Token | Hex | HSL triplet (for shadcn `hsl()`) | Master? | Role |
|---|---|---|---|---|
| `--slate-0`   | `#FFFFFF` | `0 0% 100%`    | ✓ | card / popover surface (light) |
| `--slate-50`  | `#F8FAFC` | `210 40% 98%`  | ✓ | app background (light) |
| `--slate-100` | `#F1F5F9` | `210 40% 96%`  | ✓ | muted / secondary / accent surface |
| `--slate-200` | `#E2E8F0` | `214 32% 91%`  | ✓ | hairline border / divider |
| `--slate-300` | `#CBD5E1` | `213 27% 84%`  | ✓ | stronger border / input rest |
| `--slate-400` | `#94A3B8` | `215 20% 65%`  | ✓ | icon-only / disabled (never text) |
| `--slate-500` | `#64748B` | `215 16% 47%`  | ✓ | muted text (on white/slate-50) |
| `--slate-600` | `#475569` | `215 19% 35%`  | + added | muted text on tinted surfaces; dark borders |
| `--slate-700` | `#334155` | `215 25% 27%`  | ✓ | body text (max-density) |
| `--slate-800` | `#1E293B` | `217 33% 17%`  | + added | card surface (dark) |
| `--slate-900` | `#0F172A` | `222 47% 11%`  | ✓ | primary text (light) / background (dark) |

`600` and `800` are additive steps the master ramp implies but doesn't list;
both are needed for AA-safe muted-on-tint and for the dark card surface.

### 1.2 Indigo — KEEP the app's established brand ramp

| Token | Hex | HSL triplet | Note |
|---|---|---|---|
| `--indigo-300` | `#A5B4FC` | `230 94% 82%` | dark-mode link/accent (8.96:1 on slate-900, AAA) |
| `--indigo-400` | `#818CF8` | `234 89% 74%` | dark hover (5.98:1 on slate-900) |
| `--indigo-500` | `#6366F1` | `239 84% 67%` | tints/washes ONLY — **white text on it = 4.47:1, do not use as solid button** |
| `--indigo-600` | `#4F46E5` | `243 75% 59%` | = current `--brand-from`; gradient start |
| `--indigo-primary` | `#454ADE` | `238 70% 57%` | = **current `--primary`, KEPT** (6.41:1 AA on white) |
| `--indigo-dark`   | `#7C86F4` | `235 84% 72%` | = current dark `--primary`, KEPT (5.45:1 on dark card) |

### 1.3 Status — adopt master (fixes the failing greens/ambers)

| Role | Light fg | Light tint | Dark fg (lifted) | on-white | on-tint |
|---|---|---|---|---|---|
| success | `#15803D` (`142 72% 29%`) | `#F0FDF4` (`138 76% 97%`) | `#4ADE80` (`142 69% 58%`) | 5.02 AA | 4.79 AA |
| warning | `#B45309` (`26 90% 37%`)  | `#FFFBEB` (`48 100% 96%`) | `#FBBF24` (`43 96% 56%`)  | 5.02 AA | 4.84 AA |
| danger  | `#B91C1C` (`0 74% 42%`)   | `#FEF2F2` (`0 86% 97%`)   | `#F87171` (`0 91% 71%`)   | 6.47 AA | 5.91 AA |
| info    | `#0E7490` (`193 82% 31%`) | `#ECFEFF` (`183 100% 96%`)| `#22D3EE` (`188 86% 53%`) | 5.36 AA | 5.15 AA |

Dark fg on `slate-900`: success 10.25, warning 10.69, danger 6.45, info 9.88 — all **AA/AAA**.

### 1.4 Categorical chart palette — adopt master (colorblind-aware, cap 8)

`#2563EB #16A34A #D97706 #7C3AED #0891B2 #DC2626 #64748B #DB2777`.
All ≥ **3.0:1** vs white as graphical objects (min `#D97706` 3.19:1).
**Never encode series by color alone** — pair with dash pattern / direct label /
marker shape (see reference §chart). Order chosen so adjacent series stay
distinct under deuteranopia (blue→green→amber, not green→red).

---

## 2. Semantic aliases (shadcn bridge)

The proposal keeps every existing shadcn token name so nothing downstream breaks
— they just re-point at primitives (strangler-fig: additive, values only).

| shadcn token | Current (light) | Chosen (light) → primitive | Current (dark) | Chosen (dark) → primitive | CR light | CR dark | Verdict |
|---|---|---|---|---|---|---|---|
| `--background` | `220 33% 99%` | `210 40% 98%` slate-50 | `222 24% 8%` | `222 47% 11%` slate-900 | — | — | surface |
| `--foreground` | `222 32% 12%` | `222 47% 11%` slate-900 | `220 14% 96%` | `210 40% 96%` slate-100 | 17.85 | 16.30 | AAA |
| `--card` / `--popover` | `0 0% 100%` | `0 0% 100%` slate-0 | `222 22% 11%` | `217 33% 17%` slate-800 | — | — | surface |
| `--card-foreground` | `222 32% 12%` | slate-900 | `220 14% 96%` | slate-100 | 17.85 | ~15 | AAA |
| `--primary` | `238 70% 57%` | **`238 70% 57%` KEEP** | `235 84% 72%` | **`235 84% 72%` KEEP** | 6.41 | 5.45 | AA |
| `--primary-foreground` | `0 0% 100%` | white | `222 47% 11%` | slate-900 | 6.41 | 5.58 | AA |
| `--secondary` / `--muted` / `--accent` | `220 20% 96%` | `210 40% 96%` slate-100 | `222 16% 17%` | `217 33% 17%` slate-800 | — | — | surface |
| `--muted-foreground` | `220 10% 44%` | `215 16% 47%` slate-500* | `220 10% 62%` | `215 20% 65%` slate-400 | 4.55 | 6.96 | AA |
| `--secondary-foreground`/`--accent-foreground` | `222 25% 24%` | `215 25% 27%` slate-700 | `220 14% 92%` | slate-100 | 10.35 | ~13 | AAA |
| `--border` / `--input` | `220 16% 90%` | `214 32% 91%` slate-200 | `222 14% 20%` | `215 25% 27%` slate-700 | 1.23† | 1.72† | decorative |
| `--ring` | `238 70% 57%` | `238 70% 57%` indigo-primary | `235 84% 72%` | indigo-dark | 6.11 | 5.82 | AA (≥3) |
| `--destructive` | `0 72% 51%` | `0 74% 42%` danger | `0 72% 57%` | `0 91% 71%` danger-dark | 6.47 | 6.45 | AA |
| `--destructive-foreground` | `0 0% 100%` | white | white | white / slate-900 | 6.47 | — | AA |
| `--success` | `158 64% 38%` ✗3.35 | **`142 72% 29%`** | `158 58% 52%` | `142 69% 58%` | **5.02** | 10.25 | AA→AAA |
| `--warning` | `32 95% 44%` ✗3.15 | **`26 90% 37%`** | `32 92% 56%` | `43 96% 56%` | **5.02** | 10.69 | AA→AAA |
| `--info` *(new)* | — | `193 82% 31%` | — | `188 86% 53%` | 5.36 | 9.88 | AA→AAA |

\* `--muted-foreground` = slate-500 is AA on `background`(slate-50, 4.55) and white
(4.76), but only **4.34:1 on `slate-100`** surfaces. **Rule:** muted *body* text
sitting on `muted`/`secondary`/`accent` (slate-100/200) surfaces must use
**slate-600** (6.92:1). Icon-adjacent captions and short labels at that size are
acceptable at slate-500.

† Borders are non-text/decorative and exempt from 1.4.11 **except** when a
border is the *sole* visual boundary of an active control — see §3.

### 2.1 Sidebar tokens (mapped identically)

| Token | Light → | Dark → |
|---|---|---|
| `--sidebar-background` | slate-50 (or slate-0 for a flush look) | slate-900 |
| `--sidebar-foreground` | slate-700 | slate-300 (`213 27% 84%`) |
| `--sidebar-primary` / `--sidebar-ring` | indigo-primary | indigo-dark |
| `--sidebar-accent` | slate-100 | slate-800 |
| `--sidebar-accent-foreground` | slate-700 | slate-100 |
| `--sidebar-border` | slate-200 | slate-700 |

Brand gradient (`--brand-from` / `--brand-to`): keep `#4F46E5 → sky` — the
"growth" sky accent is intentional and non-text (decorative gradient only).

---

## 3. Flagged contrast failures + mitigations

| # | Pair | Ratio | Rule / mitigation |
|---|---|---|---|
| 1 | current `--success` text on white | 3.35 ✗ | replaced by `#15803D` (5.02) |
| 2 | current `--warning` text on white | 3.15 ✗ | replaced by `#B45309` (5.02) |
| 3 | slate-500 muted text on slate-100 | 4.34 ✗ | step to slate-600 (6.92) on tinted surfaces |
| 4 | slate-400 as text/placeholder on white | 2.56 ✗ | slate-400 is **never text**; placeholders = slate-500 |
| 5 | white on indigo-500 solid | 4.47 ✗ | primary stays `#454ADE` (6.41); indigo-500 = tints only |
| 6 | slate-200/300/400 rest border vs white | 1.23–2.56 | decorative-exempt; **for inputs** the AA-passing indigo focus ring (6.11) + a persistent visible `<label>` carry state — do not rely on the rest border alone as the sole affordance. If a stronger idle border is wanted, use slate-300 and accept it as decorative. |

None of these block adoption; #1–#2 are the reason to adopt the master status
palette in the first place.

---

## 4. Typography — adopt master scale (Inter body / Plus Jakarta display kept)

`font-feature-settings` gains **`"tnum" 1` scoped to numeric data** (`.tabular-nums`
utility / apply to metric, currency, dates, table figures).

| Role | Master (rem, size/line, weight) | Current app step | Decision |
|---|---|---|---|
| Display | 2.25 / 2.5, 700 | `display` clamp 2–2.75, 800 | adopt 36/40 **700** (drop 800; keep Plus Jakarta, `-0.02em`) |
| H1 | 1.875 / 2.25, 700 | `h1` 1.5/1.2, 700 | adopt 30/36 700 |
| H2 | 1.5 / 2, 600 | `h2` 1.25/1.3, 700 | adopt 24/32 **600** |
| H3 | 1.25 / 1.75, 600 | `h3` 1.0625/1.4, 600 | adopt 20/28 600 |
| Subtitle | 1.125 / 1.75, 600 | — | **add** 18/28 600 |
| Body-L | 1 / 1.5, 400 | — | **add** 16/24 400 |
| Body | 0.875 / 1.25, 400 | `body` 0.9375/1.6 | adopt 14/20 400 (denser, workspace-appropriate) |
| Label | 0.75 / 1, 500 | `caption` 0.8125/1.45 | adopt 12/16 500 |
| Overline | 0.6875 / 1, 600, upper, **0.04em** | `.overline` 0.6875, `0.14em` | adopt master size/weight; **relax tracking 0.14em → 0.06em** (compromise: master 0.04em reads tight at 11px on-screen; 0.06em keeps the editorial kicker legible — flag for human pick) |

All numeric data (`QuotaMeter`, billing, match scores, dates, tables) → `tabular-nums`.

---

## 5. Spacing — 8pt grid (maps onto existing Tailwind scale, no new tokens)

Allowed steps: `4 8 12 16 20 24 32 40 48 64 80 96` px
= Tailwind `1 2 3 4 5 6 8 10 12 16 20 24`. **Decision:** document these as the
*only* sanctioned steps; the 4px half-step (`0.5` / `1`) is for icon-to-label
gaps only. No config change needed — this is a lint/usage convention.

---

## 6. Radius — align to master (sm 8 / md 12 / lg 16 / pill)

| Role | Master | Current | Decision |
|---|---|---|---|
| sm (chips, inputs, buttons) | 8px | `--radius`−4 ≈ 7px + `control:8px` | **8px** (`--radius-sm`) |
| md (cards, menus) | 12px | `--radius`−2 ≈ 9px | **12px** (`--radius-md`) |
| lg (modals, sheets, panels) | 16px | `--radius` 11px + `container:16px` | **16px** (`--radius-lg`) |
| pill | 9999px | — | **9999px** (`--radius-pill`) |

Set base `--radius: 0.75rem` (12px) so the shadcn `lg/md/sm` derivation lands
near 12/10/8, **and** expose explicit `--radius-sm/md/lg/pill` primitives. The
existing `control:8px` / `container:16px` utilities already match — keep them as
aliases of `sm`/`lg`.

---

## 7. Elevation — keep the 4-step token scale, retint to master intent

Current `soft/panel/pop/float` are already token-driven and slate-tinted (never
pure black in light) — that matches the master intent. Decision: **keep the
4-step scale**, expose master-named aliases:

| Master | App alias | Value (light, tinted slate-900) |
|---|---|---|
| shadow-sm | `soft` | `0 1px 2px hsl(222 47% 11% / .05), 0 1px 3px …/.05` |
| shadow-md | `panel` | `0 1px 2px …/.04, 0 6px 16px -4px …/.10` |
| shadow-lg | `pop` | `0 4px 12px -2px …/.08, 0 16px 32px -8px …/.12` |
| (xl) | `float` | `0 8px 24px -6px …/.14, 0 28px 56px -12px …/.16` |

Dark keeps the deeper near-black halos already defined. **No functional change**
— this is a naming/documentation reconciliation only.

---

## 8. Motion — add named duration/easing tokens; reduced-motion already honored

| Token | Master | Current | Decision |
|---|---|---|---|
| `--motion-fast` | 120ms | 120–180ms ad hoc | **120ms** |
| `--motion-base` | 200ms | ~180–200ms | **200ms** |
| `--motion-slow` | 320ms | 300–400ms | **320ms** |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | — | **add** (enter+exit) |
| `--ease-decelerate` | `cubic-bezier(0,0,0,1)` | `--ease-out-expo (.16,1,.3,1)` | keep expo as **decelerate** (entrances) |
| `--ease-accelerate` | `cubic-bezier(.3,0,1,1)` | — | **add** (exits) |
| reduced-motion | required | ✓ already global (`index.css` L602) + `useReducedMotion()` | keep |

Use `transform`/`opacity` only (already the app convention).

---

## 9. What this proposal deliberately does NOT change

- **Primary indigo** — passes AA, stays byte-for-byte (both themes).
- **`components.json` `baseColor: pink`** — irrelevant to runtime (CSS vars
  override); leave as-is to avoid churn.
- **Dark primary `#7C86F4`** — passes AA on card, kept.
- The reduced-motion net, scrollbar theming, and Leaflet overrides — out of scope.

Next step after human sign-off: alias the shadcn tokens onto these primitives in
`index.css` (values-only diff), then hand structural type-scale wiring to
`frontend-engineer`.
