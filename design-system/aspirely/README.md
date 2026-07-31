# Aspirely — editorial design system

A full product design for **Aspirely**, a resume-to-job matcher, in a premium editorial style.
Paper and ink, one confident accent, hierarchy from size and weight rather than color.

> **Status: design exploration, not shipped.** This is a *fresh* brand direction and it deliberately
> conflicts with the live JobPilot token system (`src/index.css` + `tailwind.config.ts`, indigo
> `hsl(238 70% 57%)` on slate, Inter / Plus Jakarta Sans). Nothing in the running app was touched.
> Treat `docs/DESIGN_SYSTEM_MAP.md` as authoritative until someone decides to adopt this.

---

## How to view

Open the design book:

```
design-system/aspirely/index.html
```

Opening it straight from disk works in Chrome. If your browser blocks local iframes, serve the folder:

```powershell
cd jobpilot-frontend/design-system/aspirely
npx serve .          # then open http://localhost:3000
```

The book renders every screen as a **live page** inside true 1440 and 390 frames. Frames scroll.
Each screen has its own `paper` / `ink` switch, and `open` launches the page standalone at full size.

## What is here

| File | Screen | Frames |
|---|---|---|
| `index.html` | Design book shell | all 14 |
| `00-style-guide.html` | Style guide: palette, type ramp, spacing, motion, 4 components | 1440 · 390 |
| `01-landing.html` | Landing page | 1440 · 390 · paper · ink |
| `02-upload.html` | Upload flow, guest, no account | 1440 · 390 |
| `03-matches.html` | Match results | 1440 · 390 |
| `04-dashboard.html` | Dashboard, signed in | 1440 · 390 · paper · ink |
| `05-auto-apply.html` | Auto Apply setup, coming-soon teaser | 1440 · 390 |
| `06-whatsapp-alerts.html` | WhatsApp alerts opt-in | 1440 · 390 |
| `css/aspirely.css` | Every token and component | |
| `js/aspirely.js` | Theme, reveal, count-up, ribbon, timeline, FAQ | |

Both variants exist on **every** screen (the toggle is in each page header). The landing hero and the
dashboard are the two called out in the brief and are exercised in both from the book.

---

## Tokens

Ready to port to `src/index.css` as semantic HSL when and if this is adopted.

| Token | Paper | Ink | Use |
|---|---|---|---|
| `--paper` | `#F7F5F0` | `#0B0B0E` | page |
| `--paper-raised` | `#FFFDF9` | `#131318` | cards, inline UI |
| `--paper-sunk` | `#F1EEE7` | `#08080A` | UI bars, chrome |
| `--ink` | `#0E0E10` | `#EDEBE4` | headings, values |
| `--ink-soft` | `#3B3B42` | `#B5B3AB` | body |
| `--gray` | `#8A8A93` | `#7E7E88` | labels, mono, meta |
| `--rule` | `#E4E1DA` | `#23232A` | hairline dividers |
| `--rule-firm` | `#CFCBC1` | `#34343D` | inputs, marks, dashed targets |
| `--indigo` | `#4B4BFF` | `#5555F6` | one action, one match highlight |
| `--ochre` | `#E8B33A` | `#DDAF45` | recency, status pings, paused fields |

Dark accents are the light values **desaturated 10%** in HSL, lightness held.
Contrast: body 15.8:1, gray 4.6:1, indigo on paper 6.9:1, white on indigo 5.4:1. AA at every size used.

### Type

- **Display** Fraunces, 400 only, `-0.02em`, 22px floor. `d1` 96 / `d2` 72 / `d3` 56 / `h1` 40 / `h2` 32.
- **Body** Inter, 17px, 1.66, max 34em. Lede 19px. Small 14px.
- **Mono** JetBrains Mono. Kickers 11px uppercase `+0.08em`. Receipts, timestamps, filters, status.
- **Numerals** Fraunces at 34 to 64px for match percentages and week counters.
- Pull quotes are Fraunces 300 italic, `-0.03em`.

### Spacing and grid

4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160 · 192.
12 columns, 1240 max, 24 gutter, 40 page padding. Section rhythm 128, or 192 for a section that has to land.
Below 900px: 4 columns, 16 gutter, 20 padding, rhythm halves.
Radius 8 card / 10 inline UI / 999 pill. **1px borders only, no shadows anywhere.**

### Motion

Easing `cubic-bezier(.22,.72,.16,1)` everywhere.
Reveal 640ms with a 16px rise and a clip-path mask. Stagger 40ms, capped at 12.
Count-up 1100ms cubic-out; the ring arc draws with the number.
No parallax, no bounce, no hover scale above 1.02. `prefers-reduced-motion` resolves everything instantly.

---

## The four components

**Match card** (`.match`) — `1fr / 168px / 1.1fr`, separated by a top hairline rather than boxed.
The three reasons (Why it fits · What is missing · Sponsorship signal) are **fixed and always present**;
if one is unknown, it says unknown rather than disappearing.

**Application row** (`.apps tr`) — Position · Resume · Status · Applied. Status is mono text, lowercase,
no pill background. Indigo only when active, ochre for `needs you`, gray otherwise. **A status is never red.**

**Receipt block** (`.receipt`) — the integrity primitive. Mono, dashed top rule, max four items, the
zero claim first and the only item allowed indigo. Appears under every generative surface: parse,
match, tailor, auto apply, alert. Every number in it must be real.

**Editorial CTA** (`.cta-editorial`) — a 1px **ink** rule above and a 1px **hairline** below. The weight
difference between the two rules is the entire effect. One primary action, never two.

---

## Copy rules used throughout

- No em dashes, no en dashes, no accented characters (per the platform copy rule). Middot separators only.
- US spelling. Short sentences. No hype verbs.
- Receipts-style microcopy: `0 invented facts · 4 keywords matched · 8 words → 16`.
- Numbered section prefixes: `01 · read`, `02 · match`, `03 · tailor`.

## Placeholders, deliberately

All company names (Northwind Grid, Halcyon Labs, Verity Health, Orbit Freight, Lantern Bio,
Cadence Systems), match percentages, salary bands and counts are **invented**.

The social proof strip on the landing page ships with invented marks and a visible caption saying so.
Given the product's whole position is "nothing invented", a proof strip carrying a real company logo
without a real interview behind it would be the one thing this design cannot afford. Replace only with
employers where an interview actually happened, or delete the section.

## If this gets adopted

1. Port the tokens above into `src/index.css` as semantic HSL pairs, both themes.
2. Add Fraunces to the font stack; keep Inter and JetBrains Mono, which are already in the app.
3. Build the four components as shadcn-composed React components before any screen work.
4. The screens map to existing surfaces: `01` to the landing route, `02` to the guest upload flow,
   `03` to match results, `04` to the `/next` shell, `05` and `06` to the auto-apply and alerts teasers.
5. Everything async still follows the platform contract: kick off, `{job_id}`, `apiService.pollJob`.
