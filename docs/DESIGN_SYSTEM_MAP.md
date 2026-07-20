# JobPilot — Production UI/UX Design Map

_Research-backed plan to take the app from "functional" to a distinctive, production-grade product. Read this before touching visual code; implement in the phased order at the bottom._

## 0. The problem we're fixing

The current UI is competent but generic: flat glass cards, a monochrome purple wash, ALL-CAPS scraped job titles, badges scattered without hierarchy, default cursors, no company identity, no search. It reads as "a Tailwind admin template," not "a product with a point of view." 2026 design research is blunt about this: _every SaaS dashboard now looks the same — pastel gradients, friendly sans, pill toggles, illustration fluff — and professionals don't want decoration._ Our edge is **signal** (match, trust, visa/H1B, sponsorship). The design should make that signal the hero and stay disciplined everywhere else.

## 1. Thesis — "Signal, not noise"

JobPilot is a career copilot for people (many international / H1B) drowning in job-board noise. The interface's single job on every surface: **surface the few things that matter (fit, trust, eligibility, freshness) and make acting on them effortless.** One bold signature element per surface; everything else quiet and precise.

## 2. Color system

Move off "purple-on-white." Keep violet→indigo as the brand, but ground it in a considered neutral **ink** scale and a disciplined **signal** palette. All values are HSL tokens in `index.css` (never raw hex in components).

| Role | Light | Dark | Use |
|---|---|---|---|
| `--ink` (bg) | `hsl(240 20% 99%)` | `hsl(240 24% 6%)` | app background (a hair of violet, not pure white/black) |
| `--surface` | `hsl(240 30% 100%)` | `hsl(240 20% 9%)` | cards |
| `--brand-from` | `262 83% 58%` (violet) | same | primary gradient start |
| `--brand-to` | `226 84% 56%` (indigo) | same | primary gradient end |
| `--signal-fit` | `152 60% 42%` | `152 55% 48%` | strong match / verified |
| `--signal-warn` | `38 92% 50%` | `38 90% 56%` | caution / partial |
| `--signal-risk` | `352 78% 55%` | `352 74% 60%` | scam / sponsorship refused |
| `--signal-remote` | `199 89% 48%` | `199 85% 55%` | remote / location |
| `--signal-sponsor` | `168 76% 40%` | `168 70% 46%` | H1B / sponsor-friendly |

**Card variety without pastel fluff:** each company gets a deterministic hue derived from a hash of its name, applied only as a _tint_ (logo tile background + a 4px accent rail at ~10-14% opacity). This gives the visual variety the Tsenta reference had, but as a considered accent — not full pastel card backgrounds (which read as templated).

## 3. Typography

Current: one display face + system-ish body. Upgrade to an intentional, **variable** pairing (2026 default) with a real data face:

- **Display / headings:** a characterful geometric-grotesk (e.g. *Clash Display* or *Geist*, variable) — used with restraint, tight tracking, weight 600-700.
- **Body / UI:** *Inter* variable (already effectively in use) — 14/16 base, 1.5 line-height.
- **Data / mono:** *Geist Mono* / *JetBrains Mono* for scores, counts, countdowns, salaries — tabular-nums everywhere numbers live.

Type scale (rem): 0.6875 (overline) · 0.75 · 0.8125 · 0.875 (body) · 1 · 1.125 · 1.5 · 2 · 2.5. **Job titles and companies always Title-Cased** (see §7) — never render scraped ALL CAPS.

## 4. Elevation, glass & depth

Research consensus: glassmorphism **with depth layering** (not flat single-layer glass). Layer model:
- **L0 background:** `--ink` + one slow ambient aurora (already have `.aurora-blob`) — very low opacity, transform-only, paused off-screen.
- **L1 surface:** `.glass-card` (backdrop-blur-xl, 1px hairline border, `shadow-pop`).
- **L2 raised:** hover / active — `-translate-y-1`, brand border, `shadow-xl` brand-tinted.
- **L3 overlay:** modals / gate — stronger blur + scrim.
Consistent hairline borders (`border-border/60`), soft radii (cards `rounded-2xl`, pills `rounded-full`, inputs `rounded-xl`).

## 5. Motion language

Micro < 200ms, orchestrated moments 300-450ms, spring for playful, `ease-expo`/`[0.22,1,0.36,1]` for reveals. Respect `prefers-reduced-motion` (kill transforms, keep opacity). Catalog:
- **Card reveal:** staggered opacity+y+scale (have it) — keep.
- **Filter/nav active:** framer `layoutId` sliding indicator (nav already has it; extend to filter pills).
- **Hover:** lift + accent-rail brighten + logo subtle scale.
- **Numbers:** count-up on first paint for match %, role counts.
- **Sync:** the countdown ring is the ambient "alive" cue.
- **Empty/loading:** shimmer skeletons that match final layout (no spinners as primary).

## 6. 3D & graphics (deliberate, not everywhere)

The research warning matters: 3D as decoration reads as AI-fluff. Reserve WebGL/3D for **hero-tier moments** where it tells the story; use lightweight CSS/SVG/canvas for ambient elsewhere.
- **Keep / extend:** landing `SignalField` WebGL hero (already exists).
- **Feed header "Signal Field":** a subtle canvas/SVG particle-constellation tinted to match density (more/brighter nodes = more strong matches) — a *data-driven* ambient, not decoration. This is the app's in-product signature.
- **Empty states / first-load:** a small react-three-fiber or Lottie/SVG motif (e.g. a slowly rotating low-poly "radar") instead of a static icon.
- **Score ring:** animate the arc draw-on.
- **Everywhere else:** CSS gradients + aurora only. No gratuitous 3D on list rows.
Perf budget: 3D only on ≤2 surfaces at once, lazy-loaded, `prefers-reduced-motion` → static poster.

## 7. Content & formatting rules

- **Title Case** all scraped titles/companies/locations via a `toTitleCase()` util (handle acronyms: AWS, SRE, US, H1B, AI, ML, QA, UI/UX, iOS, DevOps).
- **Company identity:** logo priority → `job.logo` → favicon from `apply_link` domain (`https://www.google.com/s2/favicons?domain=<host>&sz=128`) → deterministic color monogram tile. Every card gets a company mark.
- **Badge hierarchy:** one **primary signal row** (match band, then eligibility: H1B / Sponsor-friendly / Remote), one **muted meta row** (salary · type · source · posted). Never a flat wall of same-weight chips.
- **Cursors:** `cursor-pointer` on every interactive element (global CSS rule for `button/[role=button]/a/[data-clickable]`), `cursor-not-allowed` on disabled.
- **Copy:** active-voice, sentence case, name things by what the user controls (§frontend-design writing rules).

## 8. Per-surface plan

- **App shell:** glass nav done. Add a command-palette (⌘K) for jump-to + job search. Density-aware.
- **Job feed (Browse):** sticky glass **search bar (by title/company)** + pill filters; feed-header Signal Field; premium cards (§7); numbered pagination; per-source progress. _Primary redesign surface._
- **Job card:** the signature component — see §7 + §2 accent system.
- **Dashboard / Today:** data-storytelling (insights, not raw tiles): "3 strong matches today," momentum, next action. Count-up stats, one hero chart (see `dataviz` skill).
- **Saved / Applications:** kanban-ish status lanes with drag (research shows this is table-stakes).
- **Empty/error/loading:** every async surface gets a designed state (motif + one clear action).

## 9. Phased roadmap

1. **Phase 1 (now):** tokens (signal palette + card-accent hashing), global `cursor-pointer`, `toTitleCase`, **JobCard v2** (logos + Title Case + badge hierarchy + accent), **title/company search bar** in the feed, filter-pill polish. _Highest visible impact, low risk._
2. **Phase 2:** typography upgrade (variable display + mono for data), count-up numbers, feed-header Signal Field graphic, animated score-ring draw.
3. **Phase 3:** dashboard/Today data-storytelling redesign + one hero chart; ⌘K command palette.
4. **Phase 4:** 3D/graphics signature moments (empty-state radar, extend SignalField), Saved/Applications kanban.
5. **Phase 5:** global token/theme sweep across every remaining surface for consistency; a11y + reduced-motion + responsive audit.

## 10. Guardrails

Build is `vite build` only (no tsc gate; don't add new TS errors). Token-driven — no raw hex in components. Verify light + dark + mobile. Every interactive element: visible focus ring, 44px target, pointer cursor. One signature per surface; cut decoration that isn't signal.
