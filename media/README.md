# Aspirely landing media

The landing hero (`src/components/landing/HeroBackdrop.tsx`) reads these three
paths. Only the poster is generated in this repo.

| Path | Produced by | Notes |
| --- | --- | --- |
| `aspirely-hero-loop.webm` | **Gemini, externally** | Preferred source. VP9 or AV1, silent, seamless, 16:9. |
| `aspirely-hero-loop.mp4` | **Gemini, externally** | Safari fallback. H.264 + AAC-free (silent). Same cut as the webm. |
| `aspirely-hero-poster.webp` | `scripts/generate-aspirely-hero-loop.mjs` | 1920x1080, Black Cherry, generated to match `src/index.css`. |

Drop the two film files in at those exact names and the hero picks them up with
no code change. Until then the `<video>` finds no playable source, fails, and
the poster takes over - the same path a network failure takes, so the
transitional state is one that is already covered by tests.

**Re-run the poster script after any palette change.** The media does not
inherit design tokens, so it is the one thing in the system that goes stale
without anything failing.

## Brief for the film

- 10-15s, seamless loop, **silent** (no audio track at all), 16:9, 1920x1080.
- Activity on the RIGHT and outer edges. The headline and both CTAs occupy the
  left ~55% of the hero, and the overlay is built to keep that area calm - a
  film with its subject centre-left will fight the copy no matter what the
  overlay does.
- Bright enough for light mode. The hero is a light page; a dark film reads as
  a hole in it.
- Black Cherry: cherry `#A8425B`, deep cherry `#8D334B`, blush canvas `#FBF6F7`,
  sage `#3E7B69` for confirmation beats, amber `#9A651D` for milestones.
- Abstract only - opportunity-card structures, resume-like information blocks,
  a career path connecting milestones, scattered resolving into ordered.

## What NOT to do

- Do not autoplay the full film, and do not autoplay anything with audio.
- Do not substitute an animated screen recording of static mockups and call it
  the product film. If the product cannot be filmed doing the thing, the film
  should not claim it does the thing.
- Do not put employer logos, real company names, or invented match percentages
  on screen. The landing test suite asserts against fabricated companies and
  scores in the DOM, and the same standard applies to the video.
- No hiring guarantees, no "get hired faster", no employer partnerships.

---

*The 75-second product-film brief that used to sit here has been removed. It
described a separate explainer film in the parchment/terracotta palette, two
directions ago, and there is no surface on the site that plays it any more. The
hero loop above is the only motion asset the landing has. If a long-form film is
commissioned later, write its brief fresh against the current palette rather
than reviving that one.*
