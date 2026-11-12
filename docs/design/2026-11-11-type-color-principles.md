# Type, color and attention principles (evidence base for the US launch redesign)

Date: 2026-11-11. Author: research track. Status: input for the redesign agent; the owner picks
the accent (option A or B in section 8). Every number below was either quoted from the primary
source named next to it or measured with the scripts described in section 7. Where a source could
not be fetched, the doc says so and names the substitute source.

How to use this doc: sections 2 to 6 are the rules and where they come from. Section 7 is what the
current tokens actually measure. Section 8 is the proposed token set with every pair measured.
Section 9 is the implementation checklist.

---

## 1. The short version

1. Body text 16px minimum (1rem), line height 1.5, measure about 45 to 75 characters. No text
   below 12px anywhere. Weight, size and contrast carry hierarchy; color does not.
2. One neutral, content-first canvas plus ONE saturated accent. The accent is reserved for the
   primary action, links, focus and selection. Status colors carry meaning only, always with an
   icon or a word.
3. Every text pair at least 4.5:1 (WCAG 2.2 AA), primary text aimed at 7:1 (AAA). Control borders,
   focus rings and meaningful icons at least 3:1. No opacity-reduced text.
4. Focus: a solid 2px outline with a 2px offset in the accent ink, at least 3:1 against every
   surface it can sit on. Targets at least 24 by 24 CSS px, 44 by 44 for primary controls.
5. Attention comes from isolation and contrast (well evidenced), not from "color psychology"
   (weakly evidenced). Salience is never used to steer a consumer away from the
   privacy-protective, decline or cancel choice; those choices get equal visual weight
   (CPRA regulations, FTC staff report).

---

## 2. Sources and fetch status

| Source | URL | Status on 2026-11-11 |
|---|---|---|
| W3C WCAG 2.2, W3C Recommendation 12 December 2024 | https://www.w3.org/TR/WCAG22/ | Fetched |
| Understanding 1.4.11 Non-text Contrast | https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html | Fetched |
| Understanding 2.4.13 Focus Appearance | https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html | Fetched |
| Understanding 2.5.8 Target Size (Minimum) | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | Fetched |
| Understanding 2.2.2 Pause, Stop, Hide | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | Fetched |
| W3C WCAG 3.0 Working Draft, 10 September 2026 | https://www.w3.org/TR/wcag-3.0/ | Fetched |
| APCA (apca-w3, by Myndex) | https://github.com/Myndex/apca-w3 | Fetched |
| Material Design 3 site (type scale, color roles, states) | https://m3.material.io/styles/typography/type-scale-tokens, https://m3.material.io/styles/color/roles, https://m3.material.io/foundations/interaction/states/state-layers | **Not fetchable** (client-rendered; the fetch returned only the page title). Substitute: Google's own published M3 token source, below |
| M3 tokens, Google (Apache-2.0), `material-web` | https://github.com/material-components/material-web/tree/main/tokens/versions/latest/sass (`_md-sys-typescale.scss`, `_md-sys-color.scss`, `_md-sys-color__dark.scss`, `_md-sys-state.scss`, `_md-sys-state-focus-indicator.scss`) | Fetched |
| Material Color Utilities, contrast concept doc | https://github.com/material-foundation/material-color-utilities/blob/main/concepts/contrast_for_accessibility.md | Fetched |
| Apple HIG: Typography, Color, Accessibility | https://developer.apple.com/design/human-interface-guidelines/typography (and `/color`, `/accessibility`) | Pages are client-rendered; read through Apple's own HIG data endpoint (`developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`) |
| Google Fonts Knowledge | https://fonts.google.com/knowledge | Site is client-rendered; read from its published source in `google/fonts` (`cc-by-sa/knowledge/...`), the same text the site renders |
| YouTube Official Blog, "Ready for our close up", Nate Koechley (UX Director), 24 Oct 2022 | https://blog.youtube/news-and-events/an-updated-look-and-feel-for-youtube/ | Fetched |
| YouTube brand resources | https://brand.youtube | Fetched, but the page text is image filenames only; **no usable color rules**. Not used |
| Instagram, "Introducing Instagram's Visual Refresh", 23 May 2022 | https://about.instagram.com/blog/announcements/instagram-visual-refresh | Fetched |
| Design at Meta, Instagram brand evolution, 23 May 2022 | https://www.meta.com/design-at-meta/blog/behind-instagrams-brand-evolution-movement-inclusivity-and-a-new-purpose/ | Fetched |
| Meta Newsroom, F8 2019 day 1 (Facebook FB5 redesign) | https://about.fb.com/news/2019/04/f8-2019-day-1/ | Fetched |
| Design at Meta, "Redefining Facebook's brand identity", 20 Sep 2023 | https://www.meta.com/design-at-meta/blog/redefining-facebooks-brand-identity/ | Fetched |
| NN/g, F-shaped pattern (first published 12 Nov 2017) | https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/ | Fetched |
| NN/g, Visual hierarchy, Kelley Gordon, 17 Jan 2021 | https://www.nngroup.com/articles/visual-hierarchy-ux-definition/ | Fetched |
| NN/g, Fitts's law, Raluca Budiu, 31 Jul 2022 | https://www.nngroup.com/articles/fitts-law/ | Fetched |
| Healey, Perception in Visualization (preattentive features), NC State | https://www.csc2.ncsu.edu/faculty/healey/PP/ | Fetched |
| Hunt (1995), "The subtlety of distinctiveness: What von Restorff really did", Psychonomic Bulletin & Review 2(1):105 to 112, doi:10.3758/BF03214414 | https://doi.org/10.3758/BF03214414 | Abstract and listing verified; full text not read |
| Elliot (2015), "Color and psychological functioning", Frontiers in Psychology 6:368 | https://doi.org/10.3389/fpsyg.2015.00368 | Fetched (open access) |
| FTC staff report "Bringing Dark Patterns to Light", September 2022 | https://www.ftc.gov/reports/bringing-dark-patterns-light | Report PDF fetched and read |
| 11 CCR § 7004 (CPRA regulations: methods and consent) | https://www.law.cornell.edu/regulations/california/11-CCR-7004 | Fetched |
| 15 U.S.C. § 8403 (ROSCA) | https://www.law.cornell.edu/uscode/text/15/8403 | Fetched |
| Status of the FTC "Click to Cancel" rule | e.g. https://www.fenwick.com/insights/publications/eighth-circuit-vacates-ftcs-click-to-cancel-rule | Secondary (law firm summaries); flagged as such |

---

## 3. Rules from the standards

### 3.1 WCAG 2.2 (normative, the legal baseline for ADA claims and for the plan's goal G6)

| SC | Level | Rule (quoted) | What it means for tokens |
|---|---|---|---|
| 1.4.3 Contrast (Minimum) | AA | "contrast ratio of at least 4.5:1", and large-scale text "at least 3:1" | Every text pair, placeholders and captions included, at least 4.5:1 |
| 1.4.6 Contrast (Enhanced) | AAA | "contrast ratio of at least 7:1", large text "at least 4.5:1" | Our target for body and secondary text, not a gate |
| Large scale (glossary) | | "with at least 18 point or 14 point bold"; note 3: "roughly equivalent to 1.2 and 1.5 em" | 18pt = 24 CSS px; 14pt bold = about 18.66 CSS px bold. Headline S (24px) and up count as large |
| 1.4.11 Non-text Contrast | AA | "at least 3:1 against adjacent color(s)" for UI components and graphical objects | Input borders, focus rings, meaningful icons, chart marks, the checkbox outline |
| 1.4.12 Text Spacing | AA | no loss of content when line height is set to 1.5, paragraph spacing to 2, letter spacing to 0.12, word spacing to 0.16 times the font size | No fixed heights on text containers; use min-height; no clipping |
| 1.4.4 Resize Text | AA | "resized without assistive technology up to 200 percent without loss of content or functionality" | rem units; `clamp()` sizes must keep a rem component |
| 2.4.11 Focus Not Obscured (Minimum) | AA | focused component "is not entirely hidden due to author-created content" | Sticky headers need `scroll-padding-top`; cookie or consent bars must not cover focus |
| 2.4.13 Focus Appearance | AAA | indicator area "at least as large as the area of a 2 CSS pixel thick perimeter" and "a contrast ratio of at least 3:1 between the same pixels in the focused and unfocused states" | The Understanding doc names the simplest pass: "a solid 2 CSS pixel thick perimeter" (outline plus offset) |
| 2.5.8 Target Size (Minimum) | AA | "at least 24 by 24 CSS pixels", with spacing, equivalent, inline, user agent and essential exceptions | Icon buttons, chips, close buttons, pagination dots |
| 2.5.5 Target Size (Enhanced) | AAA | the Understanding doc: "uses the larger 44 by 44 CSS pixel measure" and suggests aiming for it for important controls | Primary CTA, nav items, form submit |
| 2.2.2 Pause, Stop, Hide | A | moving content that starts automatically, lasts more than five seconds and runs in parallel with other content needs "a mechanism for the user to pause, stop, or hide it" | Applies to the 3D hero and any looping animation |

Two clarifications from the 1.4.11 Understanding doc that decide real design questions:

- A text-labelled button does not need a 3:1 boundary: "This success criterion does not require
  that controls have a visual boundary indicating the hit area."
- An input identified only by its border does: "Where a text-input has an indicator such as a
  complete border (#767676), that indicator must meet 3:1 contrast ratio." Hairlines and
  decorative borders are exempt ("Not every graphical object needs to contrast with its
  surroundings"), though the doc encourages authors to "avoid particularly thin lines".

The contrast math (WCAG 2.2 glossary): relative luminance uses `L = 0.2126 R + 0.7152 G + 0.0722 B`
with the sRGB linearisation threshold `0.04045` (the glossary notes it was 0.03928 before May 2021;
the difference is immaterial for 8-bit colors), and contrast is `(L1 + 0.05) / (L2 + 0.05)`.

### 3.2 APCA and WCAG 3 (informative only, never a gate)

- WCAG 3.0 is a Working Draft (10 September 2026). Its own text: "The contrast algorithm used in
  WCAG 3 is yet to be determined." The text contrast requirement reads "The default visual
  presentation of text meets @@[contrast measure to be determined]." The draft says items are
  "exploratory at this point."
- APCA is "being evaluated as a replacement for WCAG 2 contrast math for future standards"; the
  library is labelled beta. Constants (0.0.98G): exponents 2.4 / 0.56 / 0.57 / 0.62 / 0.65,
  `blkThrs 0.022`, `blkClmp 1.414`, scale 1.14, offsets 0.027, `loClip 0.1`. Our script reproduces
  the published reference values (black on white Lc 106.04, white on black Lc -107.88, #888 on
  white Lc 63.06).
- How we use it: the tables in sections 7 and 8 report APCA Lc beside the WCAG ratio for
  information. Legal conformance in the US is WCAG 2.x; nothing passes or fails on Lc. One useful
  APCA signal that WCAG 2 hides: light text on dark backgrounds scores lower in APCA than the WCAG
  ratio suggests (for example our proposed dark `ink-muted` is 9.77:1 but Lc -64), so dark mode
  secondary text should not be pushed any dimmer than proposed.
- Apple's HIG names both: "Two popular standards of measure for color contrast are the [WCAG] and
  the Accessible Perceptual Contrast Algorithm (APCA)," and its Accessibility Inspector uses WCAG
  AA values.

### 3.3 Material Design 3 (from Google's published token source)

Type scale (rem, from `_md-sys-typescale.scss`; weights from `_md-ref-typeface.scss`: regular 400,
medium 500, bold 700):

| Role | Size | Line height | Weight | Tracking |
|---|---|---|---|---|
| Display Large | 3.5625rem (57px) | 4rem (64px) | 400 | -0.015625rem |
| Display Medium | 2.8125rem (45px) | 3.25rem (52px) | 400 | 0 |
| Display Small | 2.25rem (36px) | 2.75rem (44px) | 400 | 0 |
| Headline Large | 2rem (32px) | 2.5rem (40px) | 400 | 0 |
| Headline Medium | 1.75rem (28px) | 2.25rem (36px) | 400 | 0 |
| Headline Small | 1.5rem (24px) | 2rem (32px) | 400 | 0 |
| Title Large | 1.375rem (22px) | 1.75rem (28px) | 400 | 0 |
| Title Medium | 1rem (16px) | 1.5rem (24px) | 500 | 0.009375rem |
| Title Small | 0.875rem (14px) | 1.25rem (20px) | 500 | 0.00625rem |
| Body Large | 1rem (16px) | 1.5rem (24px) | 400 | 0.03125rem |
| Body Medium | 0.875rem (14px) | 1.25rem (20px) | 400 | 0.015625rem |
| Body Small | 0.75rem (12px) | 1rem (16px) | 400 | 0.025rem |
| Label Large | 0.875rem (14px) | 1.25rem (20px) | 500 (prominent 700) | 0.00625rem |
| Label Medium | 0.75rem (12px) | 1rem (16px) | 500 (prominent 700) | 0.03125rem |
| Label Small | 0.6875rem (11px) | 1rem (16px) | 500 | 0.03125rem |

Color roles map to tones of a tonal palette (from `_md-sys-color.scss` and `__dark.scss`):

| Role | Light | Dark |
|---|---|---|
| primary | primary 40 | primary 80 |
| on-primary | primary 100 | primary 20 |
| surface / background | neutral 98 | neutral 6 |
| surface-container lowest to highest | neutral 100, 96, 94, 92, 90 | (dark ladder) |
| on-surface | neutral 10 | neutral 90 |
| on-surface-variant | neutral-variant 30 | neutral-variant 80 |
| outline | neutral-variant 50 | neutral-variant 60 |
| outline-variant | neutral-variant 80 | neutral-variant 30 |

- The tone rule that makes this work (Material Color Utilities): "a difference of 40 in tone
  guarantees a WCAG contrast ratio >= 3.0; a difference of 50 in tone guarantees a contrast ratio
  >= 4.5." Tone is CIELAB L*. Our proposal follows the same idea: light canvas near L* 97, text
  near L* 8 to 40; dark canvas near L* 6, text near L* 95.
- The same doc lists the scheme guarantees: standard contrast "4.5:1 for all text and icons" and
  "3:1 for required non-text elements"; high contrast "7:1 for all text and icons".
- State layers (`_md-sys-state.scss`): hover 0.08, focus 0.10, pressed 0.10, dragged 0.16, disabled
  0.38, applied as the content color at that opacity over the container.
- Focus indicator tokens (`_md-sys-state-focus-indicator.scss`): thickness 3px, outer offset 2px,
  inner offset -3px. (WCAG's minimum is 2px; M3 uses 3px.)
- Takeaway: M3's body default on the web is Body Large, 16px with 24px leading, and the accent is a
  mid-tone (40) on light and a light tone (80) on dark with a dark label on it. Our current dark
  mode already follows that inversion.

### 3.4 Apple Human Interface Guidelines

- Sizes (Typography, "Ensuring legibility"):

  | Platform | Default size | Minimum size |
  |---|---|---|
  | iOS, iPadOS | 17 pt | 11 pt |
  | macOS | 13 pt | 10 pt |
  | visionOS | 17 pt | 12 pt |
  | watchOS | 16 pt | 12 pt |

- Default ("Large") Dynamic Type on iOS: Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3
  20/25, Headline 17/22 semibold, Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18,
  Caption 1 12/16, Caption 2 11/13 (size/leading in points).
- Weight: "avoid light font weights ... prefer Regular, Medium, Semibold, or Bold font weights, and
  avoid Ultralight, Thin, and Light font weights".
- Hierarchy: "Adjust font weight, size, and color as needed to emphasize important information" and
  "Minimize the number of typefaces you use".
- Contrast (Accessibility): up to 17 pt, all weights, 4.5:1; 18 pt, 3:1; bold, 3:1. "If your app
  supports dark-mode, make sure to check the minimum contrast in both light and dark appearances."
- "Convey information with more than color alone ... Offer visual indicators, like distinct shapes
  or icons, in addition to color".
- Controls: default 44x44 pt, minimum 28x28 pt (iOS, iPadOS, watchOS).
- Color use (Color): "Avoid using the same color to mean different things." On accent:
  "reserve it for elements that truly benefit from emphasis, such as status indicators or primary
  actions. To emphasize primary actions, apply color to the background rather than to symbols or
  text ... Refrain from adding color to the background of multiple controls." And: "in apps with
  primarily monochromatic content or backgrounds, choosing your brand color as the app accent color
  can be an effective way to tailor your app experience".

### 3.5 Google Fonts Knowledge

- Measure (lesson "Understanding measure / line length"): quotes Bringhurst, "anything from 45 to 75
  characters is widely regarded as a satisfactory length of line", and notes the Material guidance
  of "between 40 to 60 characters" for body text on screen; "approximately ... 10 words work quite
  well."
- Line height (lesson "Choosing a suitable line height"): "between 115% and 150% is where the optimum
  value sits" for Latin text; "The smaller the type, the more generous we should be"; for display
  type "a line height smaller than the type size will usually look better. Consider 72px type with a
  line height of between 90% and 100%"; on mobile a body value "such as 150% for wide viewports might
  instead be 130%". Glossary: "longer lines need more generous line spacing."
- Minimum size (lesson "Introducing accessibility in typography"): "a safe bet would be to use 16px
  or 1em or 1rem as the smallest size for body type." On contrast: "A good middle ground is to aim
  for a 7:1 contrast ratio, the AAA rat[io]".
- Pairing (lesson "Pairing typefaces"): first ask "Do we really need a secondary typeface? Have we
  explored all of the possibilities on offer in our primary one"; pair for "the balance between
  distinction and harmony"; a sibling face shares "similar x-height, similar contrast, similar
  width".

---

## 4. How YouTube, Instagram and Facebook hold attention (official sources only)

What their own design and brand posts say:

- **YouTube (2022 redesign, UX Director Nate Koechley):** the stated aim is "making improvements to
  bring the focus back to the video player." Frequent actions (like, share, download) were restyled
  to reduce distraction. The Subscribe button "while it's no longer red, it's easier to find": "the
  new shape and high contrast make it really stand out." Dark theme was "updated to be even darker
  so the colors truly pop", and ambient mode tints the background from the video ("dynamic color
  sampling"). Lesson: the chrome went neutral and high-contrast so the content and the one action
  could carry the color.
- **Instagram (2022 visual refresh):** "Our new layout and design system is content-forward";
  "puts content at the center, with a focus on simplicity and self-expression." The gradient
  "signals moments of discovery"; Meta's design post adds "The gradient is used with purpose
  throughout the Instagram experience" (Create mode, Story rings, the icon), and Instagram Sans was
  built "focusing on accessibility and legibility throughout the design process."
- **Facebook:** FB5 (2019) is "a fresh new design for Facebook that's simpler, faster, more immersive
  and puts your communities at the center." The 2023 brand refresh keeps "Blue ... the foundational
  color" with "a new set of hues, tones and contrast ratios ... optimized for accessibility."

Not found in their official resources, so not claimed here: published feed font sizes, the hex
values of their UI palettes (brand.youtube returned no readable text), and a documented rationale for
red notification badges. For body size we therefore lean on Apple (17pt body) and M3 (16px Body
Large), and for badge salience on the perception science below.

The common pattern, stated as rules for us:

1. Neutral canvas, near-white or near-black, so content (jobs, resumes, the 3D object) is the
   colorful thing.
2. One saturated accent, reserved: primary action, link, focus, selection. Apple says the same
   thing in its own words (section 3.4).
3. High-contrast type with hierarchy by size and weight (400 body, 600 labels and titles, 700 to 800
   display), not by tinting text.
4. A single, small, high-saturation signal for "new" or "needs you" (a badge), so it pops out
   preattentively against a calm canvas.

## 5. The perception science behind it, and what is weak

Well evidenced, use it:

- **Isolation (von Restorff) effect.** An item that differs from its neighbours is remembered and
  noticed. Hunt (1995) cautions that von Restorff's own data show "perceptual salience is not
  necessary" for the effect; distinctiveness is relative to the context. Design consequence: the
  accent only isolates the CTA if the accent appears almost nowhere else on the screen.
- **Preattentive features (Healey, NC State).** Tasks done in "less than 200 to 250 milliseconds"
  regardless of distractor count are preattentive; hue, intensity, size, orientation and motion are
  on the list, and "a conjunction target ... normally cannot be detected preattentively."
  Consequence: make the CTA differ from everything else in one feature (a saturated hue that no
  other element uses), not in a combination. Motion is preattentive too, which is why ambient 3D
  motion competes with the CTA and must be slow and stoppable.
- **Fitts's law (NN/g, Budiu 2022).** "The movement time to a target depends on the size of the
  target and the distance to the target"; "make targets big" and place them near the user's "most
  probable prior location." Consequence: 44px primary controls, CTA next to the content it acts on.
- **Visual hierarchy (NN/g, Gordon 2021).** Created "through variations in color and contrast, scale,
  and grouping"; "If everything is contrasted, then nothing stands out"; the squint or blur test
  reveals the real hierarchy. Consequence: run a blur test on every redesigned page; the CTA and
  the H1 must survive it.
- **F-shaped scanning (NN/g, 2017).** Happens when text has "little or no formatting", the user wants
  efficiency, and is not committed to reading every word; "the F-shaped scanning pattern is bad for
  users and businesses." Remedies: most important points in the first two paragraphs, headings that
  stand out, "Start headings and subheadings with the words carrying most information", bold key
  phrases. Consequence for landing, pricing and legal pages: front-loaded headings, short
  paragraphs, scannable lists.

Weakly evidenced, do not rely on it:

- **Color psychology** ("blue means trust", "red means urgency", "purple means premium"). Elliot
  (2015), the field's own review: "the literature on color and psychological functioning is at a
  nascent stage of development"; "much of the research remains underpowered"; "Underpowered samples
  commonly produce overestimated effect size estimates"; "It is premature to offer any bold
  theoretical statements, definitive empirical pronouncements". So option B below is called "trust
  blue" because it is the convention in finance and job platforms, not because blue is proven to
  raise trust. The choice between A and B is a brand decision; the evidence-based part is contrast,
  isolation and consistency, which both options satisfy.

---

## 6. Guardrails: attention through clarity, never manipulation

The accent-on-the-CTA pattern is legitimate for the product's primary action. It becomes an
enforcement target when visual prominence is used to steer a consumer's choice against their
interest. Primary sources:

- **FTC staff report (September 2022).** Dark patterns are "design practices that trick or
  manipulate users into making choices they would not otherwise have made and that may cause harm."
  The appendix lists, among others:
  - *False Hierarchy or Pressured Upselling*: "using contrasting visual prominence to steer users
    into making a certain selection" (example: "Keep My Subscription" as a bright orange button,
    "Cancel My Subscription" as a small pale gray link).
  - *Misdirection*: "Using style and design to focus users' attention on one thing in order to
    distract their attention from another".
  - *Confirm Shaming*: "Using shame to steer users away from certain choices by framing the
    alternatives as a bad decision".
  - *Preselection*: "Preselecting a default that's good for the company, but not the user" (the
    example includes a pre-checked tracking box).
  - *Nagging* ("Yes" or "Not Now" instead of "Yes" or "No"), *Baseless Countdown Timer*, *False Low
    Stock* and *False High Demand* messages, *Roadblocks to Cancellation*, *Immortal Accounts*.
  - On cancellation, ROSCA requires "a simple mechanism"; the report says sellers "should provide
    cancellation mechanisms that are at least as easy to use as the method the consumer used to buy
    the product or sign up for the service."
- **11 CCR § 7004 (CPRA regulations).** Methods for privacy requests and consent must be easy to
  understand, offer "symmetry in choice", avoid confusing language, avoid "choice architecture that
  impairs or interferes with the consumer's ability to make a choice", and be easy to execute. The
  path to the more privacy-protective option "shall not be longer or more difficult or
  time-consuming". Examples: "Yes" with "Ask me later" is not symmetrical; "An equal or symmetrical
  choice could be between "Accept All" and "Decline All""; "Yes"/"No" next to "Do Not Sell or Share
  My Personal Information" is a double negative; on/off toggles "may require further clarifying
  language"; inconsistent button order is confusing; bundling consent to incompatible uses is not
  allowed. And: "Any agreement obtained through the use of dark patterns shall not constitute
  consumer consent."
- **ROSCA, 15 U.S.C. § 8403.** Online negative-option sales require (1) text that "clearly and
  conspicuously discloses all material terms" before billing information is collected, (2) "express
  informed consent before charging", and (3) "simple mechanisms for a consumer to stop recurring
  charges". The FTC's 2024 Click-to-Cancel rule was vacated by the Eighth Circuit on 8 July 2025
  (Custom Communications v. FTC, per law-firm summaries; secondary source); ROSCA itself and the state
  auto-renewal laws still apply.

Design rules that follow (the redesign must implement these, and the compliance-fe track owns the
copy):

1. Consent, privacy choices, email preferences, cookie or tracking choices, and cancel or downgrade
   flows present their options with **equal visual weight**: same component variant, same size,
   same contrast, consistent order. The accent fill is not used on one side only. If one option is
   filled, both are filled; otherwise both are outline or both are neutral.
2. "Decline", "No", "Cancel subscription" and "Delete account" are real buttons with real words,
   never pale links and never shamed ("No thanks, I like paying more" is banned).
3. No pre-checked boxes for anything optional (marketing email, sensitive data such as visa or
   immigration status, data sharing).
4. No countdowns, "only N left", or "N people are viewing" unless literally true and verifiable;
   the plan already bans fabricated proof (FTC truth in advertising).
5. Price and renewal terms sit next to the subscribe button in body-size text (16px, at least
   4.5:1), not in a caption.
6. The accent's salience is spent on the user's next useful action (upload, see matches, tailor),
   which is how YouTube, Instagram and Facebook describe their own redesigns: focus on the content.

---

## 7. Audit of the current tokens (measured)

Method: `contrast_audit.py` (session scratchpad; the core math is reproduced in Appendix A) parses
`src/index.css`, resolves each scope's `var()` chain (`:root`, `.dark`, `.surface-lumen`,
`.surface-nocturne`, `.surface-editorial`, `.surface-obsidian`, `.surface-studio`,
`.dark .surface-studio`), converts the HSL triplets to 8-bit sRGB as the browser rasterises them,
and computes the WCAG 2.2 ratio plus APCA Lc. It also composites the `!important` glass overrides
over the real page background, and the opacity-reduced text utilities the codebase actually uses
(counted with grep over `src/**/*.tsx`).

### 7.1 Results that matter

Measured failures and near misses, worst first:

| # | Finding | Measured | Required | Where |
|---|---|---|---|---|
| 1 | Opacity-reduced text on cards (`text-muted-foreground/40` to `/70`, `text-primary/40` to `/70`, `text-foreground/50`) | light: `/70` 3.35, `/60` 2.72, `/50` 2.23, `/45` 2.04, `/40` 1.87; `text-primary/40` 1.86, `/60` 2.64, `/70` 3.20; `text-foreground/50` 3.13. Dark: muted `/60` 4.18, `/50` 3.30, `/45` 2.93, `/40` 2.58; primary `/40` 2.35, `/60` 3.69; foreground `/50` 4.49 | 4.5:1 | 20 uses of `/70`, 9 of `/60`, plus the rest. Some are decorative icons or bullets (exempt), but real text fails too, e.g. `KanbanBoard.tsx:137` (11px at `/60`), `CapabilityDock.tsx:101` (9px uppercase at `/50`), `ApplicationRow.tsx:148` ("Not applied" at `/60`), `StreakWidget.tsx` labels |
| 2 | Input border inside the dark Resume Studio | 2.96:1 (`#8A7582` on `#3B303A`) | 3:1 (1.4.11) | `.dark .surface-studio` `--input` vs `--card` |
| 3 | Text size below the floor | `text-[9px]` 30 uses, `text-[10px]` 262, `text-[11px]` 456, `text-xs` (12px) 919; tokens `--text-body-size: 0.875rem` (14px), Tailwind `body` step 0.9375rem (15px), `caption` 0.8125rem | 16px body (Google Fonts), 11pt iOS minimum (Apple) | Not a WCAG ratio failure, but 9 and 10px text fail the Apple minimum and every source's body guidance |
| 4 | Action color vs destructive color are nearly the same | fills 1.02:1 apart; hue 345 vs 352 (7 degrees) | distinguishable without relying on color (1.4.1, Apple "more than color alone") | `--cherry-fill-hsl` vs `--danger-600-hsl`; the CSS comment already flags it |
| 5 | Lowest-headroom text pair | primary ink on the active tint 4.51:1 (passes by 0.01) | 4.5:1 | `--primary-ink` on `--nav-active` in `:root`, `.surface-editorial`, `.surface-studio` |
| 6 | Elevation inverted in dark mode | dark `.bg-card` pane `#1A191F` is darker than the canvas `#242027` (L 0.0101 vs 0.0155, 1.09:1) | a raised surface should be lighter on dark (M3 surface-container ladder) | `@layer components` override `.dark .bg-card { background-color: rgb(22 22 28 / 0.72) !important }` |
| 7 | Token comments no longer describe the values | e.g. `--primary` comment says `#7A4B78 ... 6.64:1`, value renders `#A9425B` (5.69:1 under white); `.dark --foreground` comment says `#E5E3EA - 13.7:1`, value is `#F4E5E9` (13.14:1) | n/a | `src/index.css` lines 373, 386, 470 |
| 8 | Glass overrides bypass the token system | `.bg-card`, `.bg-popover`, `.bg-muted`, `.bg-secondary`, `.bg-accent`, `.bg-background` are literal `rgb()` panes with `!important`; light card pane vs canvas 1.05:1 | n/a | Any ratio quoted against `--card` is not what renders; the composites below are |

Everything else passes AA in all eight scopes. Hairline borders (1.27 to 1.62:1) are decorative and
exempt; cards rely on them plus shadow for edges, which is weak hierarchy rather than a failure.

### 7.2 Key pairs per scope (WCAG ratio; APCA Lc in the full output)

Light app (`:root`, also `.surface-editorial`):

| Pair | FG | BG | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Body text on canvas | `#2C2125` | `#FBF6F7` | 14.52 | 4.5 | PASS |
| Body text on card | `#2C2125` | `#FFFCFD` | 15.24 | 4.5 | PASS |
| Muted text on canvas | `#67565D` | `#FBF6F7` | 6.40 | 4.5 | PASS |
| Muted text on muted fill | `#67565D` | `#F4E5E9` | 5.62 | 4.5 | PASS |
| Button label on primary | `#FFFCFD` | `#A9425B` | 5.69 | 4.5 | PASS |
| Primary ink on canvas | `#A9425B` | `#FBF6F7` | 5.43 | 4.5 | PASS |
| Primary ink on active tint | `#A9425B` | `#F4DDE4` | 4.51 | 4.5 | PASS (no headroom) |
| Success label on fill | `#FFFCFD` | `#3E7A68` | 4.92 | 4.5 | PASS |
| Warning label on fill | `#FFFCFD` | `#9A661D` | 4.80 | 4.5 | PASS |
| Input border vs canvas | `#9A848D` | `#FBF6F7` | 3.24 | 3.0 | PASS |
| Focus ring vs canvas | `#A9425B` | `#FBF6F7` | 5.43 | 3.0 | PASS |
| Hairline vs card | `#E7D4DA` | `#FFFCFD` | 1.39 | - | decorative |
| Card vs canvas | `#FFFCFD` | `#FBF6F7` | 1.05 | - | info |

Dark app (`.dark`, same values in `.surface-nocturne`):

| Pair | FG | BG | Ratio | Needs | Result |
|---|---|---|---|---|---|
| Body text on canvas | `#F4E5E9` | `#242027` | 13.14 | 4.5 | PASS |
| Muted text on card | `#CBB9C0` | `#352C35` | 7.19 | 4.5 | PASS |
| Button label on primary | `#242027` | `#E49BB0` | 7.33 | 4.5 | PASS |
| Primary ink on card | `#E49BB0` | `#352C35` | 6.15 | 4.5 | PASS |
| Input border vs card | `#8A7582` | `#352C35` | 3.17 | 3.0 | PASS (thin) |
| Focus ring vs card | `#E49BB0` | `#352C35` | 6.15 | 3.0 | PASS |
| Card vs canvas | `#352C35` | `#242027` | 1.19 | - | info |

Public light landing (`.surface-lumen`): body 14.87 on canvas, muted 5.98, button label 5.67,
primary ink 5.43, primary ink on its tint 4.61, input 3.31, focus 5.43. All pass.

What actually renders for the glass panes (page background composited, no content behind):

| Pane | Composite | fg | muted | primary ink | input | ring |
|---|---|---|---|---|---|---|
| light `.bg-card` on fog canvas | `#FDFDFE` | 15.29 | 6.74 | 5.71 | 3.41 | 5.71 |
| light `.bg-card` on the gradient bloom | `#FAF8FB` | 14.71 | 6.49 | 5.50 | 3.28 | 5.50 |
| light `.bg-accent` on the bloom | `#F3EEF7` | 13.60 | 6.00 | 5.08 | 3.03 | 5.08 |
| dark `.bg-card` on canvas | `#1A191F` | 14.33 | 9.35 | 7.99 | 4.11 | 7.99 |

Content scrolling under a frosted pane changes these numbers; backdrop blur averages it but does
not guarantee contrast. The redesign must keep the solid fallback and re-measure over the busiest
backdrop (a photo or the 3D hero).

---

## 8. Proposed token set (measured)

Fonts: **keep Inter (UI and body) and Plus Jakarta Sans (display), both self-hosted, plus JetBrains
Mono for data.** No source above favors a change: Apple and Google Fonts both say to minimise the
number of typefaces, and two families plus a data mono is within that; switching would add layout
shift risk and font bytes for no evidenced gain. Two adjustments: use Inter's tabular figures
(`font-variant-numeric: tabular-nums`) for scores, salaries and dates, and never set either face
below weight 400 (Apple: avoid light weights).

### 8.1 Type scale

| Token | Size | Line height | Weight | Tracking | Family | Use |
|---|---|---|---|---|---|---|
| `display-lg` | `clamp(2.5rem, 1.75rem + 3.2vw, 4rem)` (40 to 64px) | 1.05 | 800 | -0.025em | Jakarta | Landing hero H1 only |
| `display-sm` | `clamp(2rem, 1.5rem + 2vw, 2.75rem)` (32 to 44px) | 1.1 | 700 | -0.02em | Jakarta | Section openers on public pages |
| `headline-lg` | 2rem (32px) | 2.5rem (40px) | 700 | -0.02em | Jakarta | Page H1 in app and legal pages |
| `headline-md` | 1.75rem (28px) | 2.25rem (36px) | 700 | -0.015em | Jakarta | H2 |
| `headline-sm` | 1.5rem (24px) | 2rem (32px) | 700 | -0.01em | Jakarta | H3; counts as WCAG large text |
| `title-lg` | 1.375rem (22px) | 1.75rem (28px) | 600 | -0.005em | Inter | Card and dialog titles |
| `title-md` | 1.125rem (18px) | 1.625rem (26px) | 600 | 0 | Inter | List item titles (job title) |
| `title-sm` | 1rem (16px) | 1.5rem (24px) | 600 | 0 | Inter | Small section labels |
| `body-lg` | 1.125rem (18px) | 1.75rem (28px) | 400 | 0 | Inter | Marketing paragraphs, legal pages |
| `body-md` (default) | 1rem (16px) | 1.5rem (24px) | 400 | 0 | Inter | All app body text |
| `body-sm` | 0.875rem (14px) | 1.25rem (20px) | 400 | 0.005em | Inter | Dense tables and secondary metadata only, never paragraphs |
| `label-lg` | 0.875rem (14px) | 1.25rem (20px) | 600 | 0.005em | Inter | Buttons, tabs, form labels |
| `label-md` | 0.8125rem (13px) | 1rem (16px) | 600 | 0.01em | Inter | Chips, badges, table headers |
| `caption` | 0.75rem (12px) | 1rem (16px) | 500 | 0.01em | Inter | Timestamps, footnotes. **The floor**: nothing smaller, no exceptions for badges |

Rules that go with the scale:

- Measure: prose `max-width: 65ch` on body text, `40ch` for hero sub-copy, `70ch` for legal pages.
  `ch` is the width of "0", which is wider than Inter's average glyph, so 65ch holds roughly 70
  characters; check one real paragraph lands between 45 and 75 characters per line (the Google
  Fonts Knowledge asterisk technique) at 360px, 768px and 1280px widths.
- Line height follows Google Fonts Knowledge: 1.5 for 16px body, 1.55 to 1.6 for 18px long-form,
  1.05 to 1.1 for display. On viewports under 480px body may tighten to 1.45, never below.
- `clamp()` always keeps a rem term so text-only zoom (1.4.4) still scales; never size text in `vw`
  alone.
- Hierarchy by weight and size: 400 body, 600 labels and titles, 700 to 800 headlines and display.
  Three steps of text color only (ink, ink-muted, ink-subtle). No opacity on text, ever: replace
  every `text-*/NN` on text with the right token and add a lint rule.
- 1.4.12: no fixed `height` on any text container; use `min-height` and let text wrap.

### 8.2 Neutral canvas (shared by both accent options)

Light:

| Token | Hex | HSL triplet | Role |
|---|---|---|---|
| `--canvas` | `#F7F7F9` | `240.0 14.3% 97.3%` | Page background |
| `--surface` | `#FFFFFF` | `0.0 0.0% 100.0%` | Cards, popovers, dialogs |
| `--surface-muted` | `#EFEFF3` | `240.0 14.3% 94.5%` | Secondary fills, inputs, wells |
| `--surface-strong` | `#E4E4EA` | `240.0 12.5% 90.6%` | Selected neutral, pressed, table header |
| `--hairline` | `#E1E1E7` | `240.0 11.1% 89.4%` | Decorative dividers only |
| `--control-border` | `#85838F` | `250.0 5.1% 53.7%` | Input, checkbox, radio, switch track edge |
| `--ink` | `#141318` | `252.0 11.6% 8.4%` | Primary text |
| `--ink-muted` | `#484651` | `250.9 7.3% 29.6%` | Secondary text (AAA everywhere) |
| `--ink-subtle` | `#62606B` | `250.9 5.4% 39.8%` | Captions, metadata, placeholders (AA everywhere) |

Dark:

| Token | Hex | HSL triplet | Role |
|---|---|---|---|
| `--canvas` | `#0F0F12` | `240.0 9.1% 6.5%` | Page background |
| `--surface` | `#18181C` | `240.0 7.7% 10.2%` | Cards (lighter than canvas, as M3's surface ladder) |
| `--surface-muted` | `#222228` | `240.0 8.1% 14.5%` | Secondary fills, inputs |
| `--surface-strong` | `#2C2C33` | `240.0 7.4% 18.6%` | Selected neutral, pressed |
| `--hairline` | `#303038` | `240.0 7.7% 20.4%` | Decorative dividers only |
| `--control-border` | `#787681` | `250.9 4.5% 48.4%` | Control edges |
| `--ink` | `#F3F3F6` | `240.0 14.3% 95.9%` | Primary text |
| `--ink-muted` | `#BAB8C2` | `252.0 7.6% 74.1%` | Secondary text |
| `--ink-subtle` | `#9C9AA5` | `250.9 5.8% 62.5%` | Captions, metadata, placeholders |

(The hex is normative; each HSL triplet was checked to round-trip to the same 8-bit hex.)

Measured (WCAG ratio, APCA Lc):

| Pair | Light | Dark |
|---|---|---|
| ink on canvas / surface / surface-muted / surface-strong | 17.28 / 18.48 / 16.12 / 14.60 (Lc 100 to 89) | 17.28 / 15.98 / 14.28 / 12.51 (Lc -100 to -96) |
| ink-muted on canvas / surface / muted / strong | 8.64 / 9.25 / 8.06 / 7.30 | 9.77 / 9.04 / 8.08 / 7.08 |
| ink-subtle on canvas / surface / muted / strong | 5.76 / 6.17 / 5.38 / 4.87 | 6.91 / 6.39 / 5.71 / 5.00 |
| control-border vs canvas / surface / surface-muted | 3.48 / 3.72 / 3.25 | 4.29 / 3.97 / 3.55 |
| hairline vs canvas / surface (decorative) | 1.22 / 1.30 | 1.46 / 1.35 |
| surface vs canvas (depth) | 1.07 | 1.08 |
| ink on hover layer (M3 8% ink over surface) | 15.66 on `#ECECED` | 12.92 on `#2A2A2D` |
| ink-muted on pressed layer (10%) | 7.50 on `#E8E7E8` | 6.90 on `#2E2E32` |

Depth comes from the surface step plus a soft shadow on light and from lightness alone on dark
(shadows do little on dark), matching M3's surface-container idea. If glass panes stay, a pane is
`--surface` at 0.85 alpha or more over the canvas, with `--surface` as the solid fallback, and is
re-measured over the busiest backdrop.

### 8.3 Semantic states (shared)

| Token | Light | Dark | On it |
|---|---|---|---|
| `--success` | `#16723F` (146.7 67.6% 26.7%) | `#5FD08F` (145.5 54.6% 59.4%) | light: white; dark: `#0F0F12` |
| `--warning` | `#8C5100` (34.7 100.0% 27.5%) | `#F2B65A` (36.3 85.4% 65.1%) | same |
| `--danger` | `#C02A1E` (4.4 73.0% 43.5%) | `#FF8A7A` (7.2 100.0% 73.9%) | same |
| `--info` | `#0B6688` (196.3 85.0% 28.8%) | `#6CC7EA` (196.7 75.0% 67.1%) | same |

Measured, light (label on fill / as text on surface / on canvas / on surface-muted / on its own 12%
tint): success 5.98 / 5.98 / 5.59 / 5.21 / 5.03; warning 6.38 / 6.38 / 5.96 / 5.56 / 5.34;
danger 5.85 / 5.85 / 5.47 / 5.10 / 4.81; info 6.42 / 6.42 / 6.00 / 5.60 / 5.39.
Dark: success 9.94 / 9.19 / 9.94 / 8.22 / 7.32; warning 10.58 / 9.79 / 10.58 / 8.75 / 7.71;
danger 8.35 / 7.73 / 8.35 / 6.91 / 6.31; info 10.02 / 9.27 / 10.02 / 8.28 / 7.36.

Rules: status color is never the only cue (icon plus word); success is never decorative; warning is
deadlines and risk; danger is failure and irreversible actions; info is neutral notices and never a
button color.

### 8.4 Accent option A: cherry, tuned for salience and contrast

Same hue family as today (about 343), more chroma, darker so white text has headroom.

| Token | Light | Dark |
|---|---|---|
| `--accent` (fill) | `#B3264F` (342.6 65.0% 42.5%) | `#FF8FAE` (343.4 100.0% 78.0%) |
| `--accent-hover` | `#97193F` (341.9 71.6% 34.5%) | `#FFADC3` (343.9 100.0% 83.9%) |
| `--on-accent` | `#FFFFFF` | `#0F0F12` |
| `--accent-ink` (links, focus ring, selected text) | `#A91F48` (342.2 69.0% 39.2%) | `#FF8FAE` |
| `--accent-tint` (12% accent over surface; selected rows, active nav) | `#F5E4E9` | `#34262E` |

| Pair | Light | Dark | Needs |
|---|---|---|---|
| Button label on accent | 6.35 | 8.92 | 4.5 |
| Button label on accent-hover | 8.31 | 10.95 | 4.5 |
| Accent ink on canvas / surface / surface-muted | 6.59 / 7.06 / 6.15 | 8.92 / 8.25 / 7.38 | 4.5 |
| Accent ink on accent-tint (selected) | 5.76 | 6.69 | 4.5 |
| Ink on accent-tint | 15.10 | 12.96 | 7 |
| Focus ring vs canvas / surface / surface-strong | 6.59 / 7.06 / 5.57 | 8.92 / 8.25 / 6.46 | 3 |
| Accent fill vs canvas | 5.94 | 8.92 | 3 |
| Hue separation from danger | 22 degrees | 24 degrees | as large as possible |

Trade-offs: keeps the established Aspirely identity and the current "cherry means press this" rule;
the selected-tint pair gains headroom (5.76 versus today's 4.51). The cost is that a red-family
accent sits only 22 degrees from danger, so (1) destructive controls must always carry an icon and
a verb ("Delete account") and live inside a confirmation dialog, and (2) a red notification badge
cannot be isolated from the accent; badges in option A use the accent fill with the count in
`--on-accent` (6.35:1) and gain salience from size and position, not hue.

### 8.5 Accent option B: trust blue

| Token | Light | Dark |
|---|---|---|
| `--accent` (fill) | `#1F5BD6` (220.3 74.7% 48.0%) | `#86AEFF` (220.2 100.0% 76.3%) |
| `--accent-hover` | `#1748B0` (220.8 76.9% 39.0%) | `#A6C3FF` (220.4 100.0% 82.5%) |
| `--on-accent` | `#FFFFFF` | `#0F0F12` |
| `--accent-ink` | `#1C55C9` (220.2 75.5% 44.9%) | `#86AEFF` |
| `--accent-tint` | `#E4EBF9` | `#252A37` |

| Pair | Light | Dark | Needs |
|---|---|---|---|
| Button label on accent | 5.96 | 8.67 | 4.5 |
| Button label on accent-hover | 8.11 | 10.82 | 4.5 |
| Accent ink on canvas / surface / surface-muted | 6.15 / 6.58 / 5.74 | 8.67 / 8.02 / 7.17 | 4.5 |
| Accent ink on accent-tint (selected) | 5.50 | 6.49 | 4.5 |
| Ink on accent-tint | 15.45 | 12.94 | 7 |
| Focus ring vs canvas / surface / surface-strong | 6.15 / 6.58 / 5.20 | 8.67 / 8.02 / 6.28 | 3 |
| Accent fill vs canvas | 5.57 | 8.67 | 3 |
| Hue separation from danger | 144 degrees | 147 degrees | as large as possible |

Trade-offs: the action color and the danger color can no longer be confused, and a red badge
(`--danger` with a white count, 5.85:1) pops out against a blue-and-neutral page the way Facebook's
does. The cost is a brand change (the current tokens explicitly say blue is not this brand's action
color) and a 24 degree gap to `--info`, so info stays text and icon only, never a fill that looks
like a button.

**The owner chooses A or B.** Both meet every pair above in light and dark.

### 8.6 Focus, targets and states (both options)

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid hsl(var(--ring));   /* --ring = --accent-ink */
  outline-offset: 2px;
}
```

- Measured ring contrast is at least 5.20:1 against every surface in both options (3:1 needed).
  This is the "solid 2 CSS pixel thick perimeter" the 2.4.13 Understanding doc calls the simplest
  pass. An inset ring must be thicker than 2px.
- Sticky header: keep `scroll-padding-top` equal to the header height (2.4.11). The consent bar
  must not cover the focused element.
- Targets: 24 by 24 CSS px minimum for every pointer target (2.5.8), 44 by 44 for primary
  controls, nav items and the mobile menu (2.5.5 and Apple 44pt).
- State layers (M3): hover 8%, focus 10%, pressed 10% of the content color over the container;
  disabled 38% opacity (exempt from contrast, but disabled must also be said in words or by the
  `disabled` attribute, never by opacity alone).
- Links inside body text are underlined; color alone does not mark them.

### 8.7 Mapping to the existing shadcn variables

Keep the variable names so the ~477 `text-primary` call sites and every shadcn primitive keep
working; repoint values only.

| shadcn variable | New value |
|---|---|
| `--background` | `--canvas` |
| `--card`, `--popover` | `--surface` |
| `--muted`, `--secondary` | `--surface-muted` |
| `--accent` (shadcn's neutral hover, not our accent) | `--surface-strong` |
| `--foreground`, `--card-foreground`, `--popover-foreground` | `--ink` |
| `--secondary-foreground`, `--accent-foreground` | `--ink-muted` |
| `--muted-foreground` | `--ink-subtle` |
| `--primary` / `--primary-hover` / `--primary-foreground` | `--accent` / `--accent-hover` / `--on-accent` |
| `--primary-ink` (Tailwind `text-primary`) and `--ring` | `--accent-ink` |
| `--nav-active` | `--accent-tint` |
| `--border` | `--hairline` |
| `--input` | `--control-border` |
| `--destructive`, `--success`, `--warning`, `--info` (+ `-foreground`) | section 8.3 (+ `--on-semantic`) |

---

## 9. Checklist for the redesign agent

1. Tokens: replace the values in `src/index.css` (`:root`, `.dark`, and the named surfaces) per
   8.7; delete stale ratio comments or regenerate them from the script; keep `.surface-obsidian`
   only if the 3D or product window needs a deeper dark, and re-measure it.
2. Glass: move the literal `rgb()` `!important` panes in `@layer components` onto tokens; dark
   panes must be lighter than the canvas.
3. Type: add the section 8.1 steps to `tailwind.config.ts` `fontSize`; set the base `body` to
   `body-md`; migrate `text-[9px]`, `text-[10px]`, `text-[11px]` to `caption` or larger; reserve
   `text-xs` for `caption`.
4. Text color: remove opacity modifiers on text (`text-*/NN`); use `ink-muted` or `ink-subtle`.
   Add an ESLint rule or a `copy:check`-style grep that fails on `text-(foreground|muted-foreground|primary)/\d+`
   and on `text-\[(8|9|10|11)px\]`.
5. Destructive: icon plus verb, inside a confirmation dialog, in both options.
6. Consent and cancel UIs: equal-weight buttons (section 6), owned with compliance-fe.
7. Verify: re-run the contrast audit on the edited `index.css` (Appendix A), run Lighthouse a11y
   (goal 100), and check light, dark, 200% zoom, 320px width and the 1.4.12 spacing bookmarklet.

---

## Appendix A: the contrast math used for every number in this doc

```python
def lin(c8):                       # 8-bit channel -> linear (WCAG 2.2, threshold 0.04045)
    c = c8 / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def rel_lum(rgb):
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

def hsl_to_rgb8(h, s, l):          # CSS Color 4 hsl(), rounded to 8-bit as rasterised
    s, l = s / 100, l / 100
    def f(n):
        k = (n + h / 30) % 12
        a = s * min(l, 1 - l)
        return l - a * max(-1, min(k - 3, 9 - k, 1))
    return tuple(round(max(0, min(1, f(n))) * 255) for n in (0, 8, 4))

def over(fg, alpha, bg):           # alpha compositing for glass panes and opacity text
    return tuple(round(alpha * f + (1 - alpha) * b) for f, b in zip(fg, bg))

def apca_lc(txt, bg):              # APCA-W3 0.0.98G-4g, informative only
    def y(rgb):
        r, g, b = (c / 255 for c in rgb)
        return 0.2126729 * r**2.4 + 0.7151522 * g**2.4 + 0.0721750 * b**2.4
    yt, yb = y(txt), y(bg)
    yt = yt if yt > 0.022 else yt + (0.022 - yt) ** 1.414
    yb = yb if yb > 0.022 else yb + (0.022 - yb) ** 1.414
    if abs(yb - yt) < 0.0005:
        return 0.0
    if yb > yt:
        s = (yb**0.56 - yt**0.57) * 1.14
        return 0.0 if s < 0.1 else (s - 0.027) * 100
    s = (yb**0.65 - yt**0.62) * 1.14
    return 0.0 if s > -0.1 else (s + 0.027) * 100
```

Self-checks that pass: black on white 21.0:1; `#767676` on white 4.54:1; APCA black on white
106.04, white on black -107.88, `#888888` on white 63.06.

The full scripts used on 2026-11-11 (`contrast_audit.py`, which parses `index.css` and every scope,
and `proposal.py`, which measures section 8) live in the research session's scratchpad, which is
temporary. If the redesign agent wants them in the repo, add them under `scripts/` as a design
check; the math above is all they contain beyond CSS parsing.
