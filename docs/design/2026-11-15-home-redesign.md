# Home page redesign (2026-11-15)

The public home page (`/`) was rebuilt from scratch as a sales page. This note
records what was decided, what it was decided from, and what was deliberately
left for later. The code is the source of truth; if this note and the code
disagree, fix the note.

Supersedes [`landing-v8-brief.md`](landing-v8-brief.md) for layout, copy and
visual direction. The guest-flow contract in that brief (one `useGuestFlow`,
one file input, the `flowActive` collapse) is unchanged.

## What the owner asked for

A home page that sells: the full business value, minimal, with an appealing
and consistent palette, real structure, and motion. Free to redesign from
nothing, using the best-designed sites as the reference.

## What it was decided from

Two research passes, both on live pages captured in a headless browser on
2026-11-15 (computed styles, not opinion):

**15 reference sites** (Linear, Stripe, Vercel, Raycast, Cursor, Attio,
Mercury, Ramp, Granola, Notion, Clay, Superhuman, Wealthsimple, Duolingo, Dia).
What the best of them share:

| Finding | Measured | What we did |
|---|---|---|
| Real product in the first screen | 7 of 15 in the first viewport, 12 of 15 by the second; 5 build it as live DOM | The hero is a sample board you can click through |
| Display type is large but not heavy | Median h1 64px; weight 510 or less on 10 of 15; tracking -0.02 to -0.06em | h1 620 (was 800), tracking -0.045em |
| One accent, kept rare | A neutral canvas with one chromatic accent on 10 of 15 | One action colour only; headings are ink |
| White or near-neutral canvas | 12 of 15 light-first, near-neutral greys | Canvas `#FFFFFF`, band `#F5F6F8` (was a blue-tinted `#F5F7FC` everywhere) |
| One saturated or dark chapter | Attio, Stripe, Granola, Superhuman, at 55 to 75% of scroll | One saturated band, spent on sponsorship |
| Two-tone statement text | 8 of 15 | Chapter headings: the claim in ink, its meaning in grey |
| Motion is the product playing | Live DOM demos, sticky scroll steppers | Every animation is a product scene; text does not animate |

The old page measured against the same set: h1 weight 800 with a coloured
second line (0 of 15 do this), about 8,000 px2 of blue per 1,000 px of scroll
against 700 to 6,600 on the references, 33 backdrop-filter elements against a
median of 7, and a wireframe illustration with a disclaimer where the others
show the product.

**14 competitor home pages** (Jobright, Simplify, Teal, Huntr, Careerflow,
Jobscan, Kickresume, Rezi, AIApply, WonsultingAI, FrogHire, Interstride,
MyVisaJobs, Handshake). The category repeats "trusted by N million", outcome
multipliers and score dials. Nobody on a consumer AI page leads with any of:

1. where the jobs come from (the employer's own careers page, with its date);
2. visa sponsorship evidence on the same card as the fit;
3. tailoring that invents nothing;
4. approval before anything is sent.

Aspirely does all four today, and the old page named none of them above the
fold: the words visa, H-1B and OPT did not appear on it at all. The new hero
sentence carries the first three and the trust line carries the fourth.

## Later passes, same day

Three rounds of owner feedback after the first build, in order:

1. "Try colours other than blue", and "the page is too text heavy: show it".
   Four non-blue accents were rendered on the real page, and the page was
   rebuilt around things to operate instead of things to read.
2. "Blue is good" (after comparing all five live), "dark mode is not
   attractive", the sponsorship block "all blue" looks like a bug, the second
   section is "clumsy: more animated, more 3D, more touch", and "check it as
   a sales person would".
3. An independent sales review of the page, applied (below).

## Colour: is blue right for this product?

Short answer: yes, with conditions. Sourced on 2026-11-15:

- Blue is tied to perceived competence and to web trust, but the effects are
  small and depend on the shade (Labrecque and Milne 2012; Alberts and van der
  Geest 2011; a pure `#0000FF` showed no trust effect, dark blue did).
- Blue was the favourite colour in all ten countries YouGov surveyed. No
  controlled study of blue and trust in India was found.
- The AI job-tool category is green and teal (Jobright, Simplify, Teal,
  Handshake, FrogHire, Wonsulting). Blue sits beside the incumbents instead,
  which is the safer side for a decision that involves visa status and a
  resume.
- Blue and yellow survive red-green colour-vision deficiency, the common
  kind; green does not.
- A saturated blue fails contrast on dark surfaces, so dark mode needs its
  own lighter tint (periwinkle `#80A0FF`), not the same cobalt.

Do NOT keep blue if: a tab and favicon test reads as LinkedIn or Indeed; the
positioning turns challenger, where excitement beats competence; blue becomes
link, button and status at once; or the brand goes dark-first.

## Palette

Only the public pair (`.surface-lumen`, `.surface-nocturne` in `src/index.css`)
changed. The signed-in app is untouched.

| Role | Light | Dark | Token |
|---|---|---|---|
| Canvas | `#FFFFFF` | `#080B15` | `--background` |
| Band (section rhythm) | `#F4F6FA` | `#0B0E1A` | `--band` |
| Ink / muted / subtle | `#101422` / `#444A5A` / `#5C6170` | near-white, cool | `--foreground`, `--ink-muted`, `--ink-subtle` |
| Action | `#2648D6` cobalt | `#80A0FF` periwinkle | `--primary` |
| Highlighter | `#FFD43D` marigold | same hue, 30% alpha | `--mark` |
| Dark chapter | `#0B1130` navy, lit from one corner | same | `--brand-band`, `--brand-band-glow` |
| Button on the chapter | `#FFD43D` | same | `--band-btn` |

- **Ink** does the talking. No heading is coloured.
- **Cobalt** is the action colour and the product's own judgement (buttons,
  links, the fit ring, selection). Kept rare.
- **Marigold** is the highlighter (evidence found in a resume) and the one
  button on the navy chapter. That button is what stops the chapter being
  "all blue".
- **The navy chapter** is a deep field lit from one corner with a fine dot
  grid. It is never the button colour laid edge to edge: that read as a block
  that had failed to render.
- **Dark is designed, not inverted**: near-black navy canvas, surfaces that
  step up, a glow behind the hero stage, a lit top edge on every surface, a
  halo on the primary button (`.surface-nocturne` rules in `landing.css`).

**Comparing palettes.** Under `vite dev` a small picker sits bottom left
(`src/components/landing/dev/`): Cobalt (shipped), Evergreen, Daybreak, Plum,
Poppy. Development only, not in a production build. Delete the folder once
the decision is final.

## Type

- **Display: Mona Sans** (GitHub, OFL), one variable file, set wide (106 to
  112%) and tight, weight 600 to 620. Public pages only for now.
- **Body: Inter**, unchanged. Product scenes are also set in Inter.
- Classes `pub-h1` to `pub-h4`, `pub-lede`, `pub-body` in
  `src/components/landing/landing.css`.
- No capitalised section labels. The one line above the headline says who the
  product is for, which is information, not decoration.

## Structure

A sales order: problem, the deciding objection, product, price, objections,
close. Each section is a heading, at most a sentence, and a scene to operate.

| # | Section | id | What the visitor does |
|---|---|---|---|
| 1 | Hero | `try` | Sees who it is for; drives a four-step tour that opens on the matches |
| 2 | The problem | `noise` | Watches 24 listings clear down to 5, one reason at a time |
| 3 | Sponsorship | `sponsorship` | Flips one switch and watches the roles re-sort |
| 4 | Features | `features` | Handles a deck of five cards |
| 5 | The offer | `pricing` | One card: the free plan. The paid tiers are one sentence |
| 6 | Fair questions | `before-you-begin` | Six real objections; the full twelve stay on `/trust` |
| 7 | Coming next | `coming-next` | Three slim cards, labelled as not available |
| 8 | Close | `get-started` | The offer once more |

Header: Sponsorship, Features, Pricing, FAQ.

**What the sales review changed** (independent review of the page, 2026-11-15):

- Who it is for was nowhere above the fold: added "Built for the F-1 and OPT
  job search. Works the same with no visa need."
- The tour opened on the input (Read). It opens on the outcome (Match).
- The no-account upload was whispered. It is in the trust line at body size,
  has one name everywhere ("Find my matches"), and appears in the hero, the
  sponsorship chapter, the end of the tour and the close.
- Sponsorship moved from fifth to third.
- There was no problem beat: the `noise` section is it.
- A full screen of unshipped features sat right before the price: the roadmap
  is slim and last.
- Two cards saying "Pricing not announced yet" sat beside the free plan: the
  home page shows one offer.
- Twelve soft questions became six real objections, three of them new.
- "Nothing is submitted without your approval" left the hero: nothing is
  submitted by the product at all today, so the line implied a feature that
  is not shipped.
- The tab title no longer says "for early-career job seekers".

**The tour** (`tour/ProductTour.tsx`, scenes in `scenes/`). Four tabs with a
story-style progress line. It plays like a short film until the visitor
touches it. Pick a role in Match, press Tailor resume and the tailoring step
is about that role, press Mark as applied and that role's card is the one a
reply moves in Track, which ends on "Try it with my resume".

**The deck** (`Features.tsx`). One card forward, four behind in depth. The
front card leans toward the pointer and can be thrown aside by its top edge.

| Card | What you do |
|---|---|
| It will not stretch the truth | Drag the team size up; it springs back to what the resume says |
| One role, once | Fold a role's reposts behind the employer's original |
| Practice on your own roles | Turn an interview card over to see what it was built from |
| See what keeps coming up | Press a skill to see which roles ask for it |
| Your contact details stay with you | Turn the resume over to see what the AI model is sent |

All scenes read from one sample resume and five sample roles in `sample.ts`.

## Motion

Every animation is the product doing something, and after it plays once it
belongs to the visitor.

- Page load: headline, copy, then the tour. One sequence.
- The tour plays itself, holds under the pointer, and has a pause control
  (WCAG 2.2.2). The first click anywhere in it stops the film for good.
- The next thing worth clicking pulses three times and then holds still.
- Depth and touch: the deck's spring and tilt, a slider that rubber-bands, 3D
  card flips, cards that stack in perspective.
- Nothing outside the tour loops, so nothing else needs a pause control.

With reduced motion nothing plays by itself and every scene opens resolved.

## Honesty rules that were kept

All of these are held by `landing-redesign.test.tsx`:

- one file input for the whole page, three triggers, none in the header;
- no real company name, no outcome claim, no user count, no price;
- every scene that uses sample data says so in words;
- sample scores sit in the product's own bands with the product's own labels;
- every status label is read from `lib/capabilities.ts`;
- the tailoring demo is the same lines word for word in a different order
  (asserted structurally, and for every sample role), because a before and
  after that grew a number would demonstrate the one thing the product
  refuses to do;
- every button inside a scene does something in the scene, and none of them
  touches the network.

## What changed outside the page

- `lib/capabilities.ts`: Auto Apply moved from `beta` to `coming-soon`. Its UI
  was deleted from the app on 2026-11-12 and its route redirects to the
  tracker, so by the registry's own rule a normal user cannot reach it. Added
  `AUTOFILL` (the browser extension) as `coming-soon`: built, not published.
- `lib/pricing.ts`: the "Assisted applications" limit lines now carry the
  capability they meter, so they render "Coming soon" beside the number.
- `/pricing`, `/trust` and the legal pages share the public shell, so they
  picked up the new header, footer, palette and display face.

## Not done yet

- **Sign in and Create account** were rebuilt on this system the same day:
  see [`2026-11-15-sign-in.md`](2026-11-15-sign-in.md).
- **`/trust`** keeps its older card grid inside the new shell.
- **The signed-in app** is untouched: Jakarta headings, cobalt, the
  blue-tinted canvas.
- **Open decisions for the owner:** the free plan says "Tailored resumes,
  with a daily limit" without the number (the review asks for the real
  figure); the FAQ answers under "Control and automation" on `/trust` still
  describe Auto Apply settings a user cannot reach.
