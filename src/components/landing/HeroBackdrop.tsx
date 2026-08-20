import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * The landing hero's ambient background.
 *
 * THE MOTION ASSET IS EXTERNAL. It is a 3D film generated in Gemini and copied
 * into `public/media/`; nothing in this repo synthesises it. Until those files
 * land, the `<video>` element finds no playable source, fails, and the poster
 * takes over - which is the same path a network failure takes, so the
 * transitional state is a state that is already tested.
 *
 *   /media/aspirely-hero-loop.webm    preferred (VP9/AV1)
 *   /media/aspirely-hero-loop.mp4     fallback (H.264, Safari)
 *   /media/aspirely-hero-poster.webp  generated here, on-palette
 *
 * WEBM FIRST, MP4 SECOND, and the order is the whole point: a browser picks
 * the first `<source>` whose `type` it can play, so Safari skips the webm and
 * takes the mp4 without a second request. Chrome and Firefox never download
 * the mp4 at all.
 *
 * THE POSTER IS GENERATED IN-REPO, by `scripts/generate-aspirely-hero-loop.mjs`,
 * because it has to match `src/index.css` to the token and no external tool is
 * going to do that. Re-run it after any palette change - the media does not
 * inherit tokens, so it is the one thing in the system that goes stale
 * silently.
 *
 * DECORATIVE, AND THEREFORE `aria-hidden`. Everything the loop suggests -
 * scattered work becoming ordered, a path through milestones - is said in
 * words by the headline sitting on top of it. A screen-reader user loses
 * nothing, so there is no text alternative to write and no `<track>` to add.
 *
 * REDUCED MOTION GETS THE POSTER, not a paused video. A `<video>` element with
 * `autoPlay` removed still downloads, still decodes its first frame, and still
 * carries a play affordance in some browsers. An `<img>` is unambiguous: the
 * user asked for no motion, so there is no video on the page at all.
 *
 * NO LAYOUT SHIFT: the layer is absolutely positioned and fills the hero, so
 * whether the media has loaded or failed can never move the headline.
 *
 * PERFORMANCE. `preload="metadata"` rather than `auto` - the browser fetches
 * enough to start and streams the rest, instead of racing the LCP text for
 * bandwidth. The element is skipped entirely under reduced motion, and the
 * whole layer unmounts once a guest upload takes over the hero.
 */

const LOOP_WEBM = '/media/aspirely-hero-loop.webm';
const LOOP_MP4 = '/media/aspirely-hero-loop.mp4';
const POSTER_SRC = '/media/aspirely-hero-poster.webp';

export function HeroBackdrop({ className }: { className?: string }) {
  const reduced = !!useReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);

  // Pause off-screen and in a hidden tab. Decoding video for a hero nobody is
  // looking at is one of the more expensive things a landing page can leave
  // running, and this one sits at the top of a long scroll.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduced || failed) return;
    let onScreen = true;
    const sync = () => {
      if (onScreen && document.visibilityState !== 'hidden') void el.play().catch(() => undefined);
      else el.pause();
    };
    const io =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([e]) => {
            onScreen = e.isIntersecting;
            sync();
          });
    io?.observe(el);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io?.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [reduced, failed]);

  const showPoster = reduced || failed;

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* THE MEDIA is a light film. In dark mode it stays visible and is
          frosted into the canvas (glass), instead of being crushed to 30%
          opacity on a near-black wash — that pairing made Home feel like a
          black slab with a ghost image. */}
      {showPoster ? (
        <img
          src={POSTER_SRC}
          alt=""
          className="absolute inset-0 h-full w-full object-cover dark:opacity-80 dark:brightness-[0.88] dark:saturate-[0.85]"
          decoding="async"
          fetchPriority="low"
        />
      ) : (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover dark:opacity-80 dark:brightness-[0.88] dark:saturate-[0.85]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER_SRC}
          onError={() => setFailed(true)}
        >
          <source src={LOOP_WEBM} type="video/webm" />
          <source src={LOOP_MP4} type="video/mp4" />
        </video>
      )}

      {/* Dark-only frost: blurs the film into the page so it reads as glass
          atmosphere behind the copy, not a photograph pasted on charcoal. */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: 'hsl(var(--background) / 0.38)',
          backdropFilter: 'blur(28px) saturate(140%)',
          WebkitBackdropFilter: 'blur(28px) saturate(140%)',
        }}
      />

      {/* THE OVERLAY. Four layers, each doing one job, all token-driven so the
          whole stack re-tints with the surface underneath it.

          WHAT THIS REPLACED. The first layer used to start at a FULLY OPAQUE
          `hsl(var(--background))` and the last faded to the same value, which
          on the old surface logic resolved to obsidian for anyone whose OS
          preferred dark - and that is the entire mystery of the "dark opaque
          left panel" and the "fade to black" in the brief. Neither was a
          decision about the hero; both were one token resolving dark on a page
          that should never have been dark. A third layer multiplied cherry over
          the frame, which on a bright canvas is how a page turns pink.

          1 The readability wash still guarantees the copy column, but it now
            TOPS OUT BELOW 1. A wash that reaches full opacity is a panel with
            a soft edge, and it reads as one; holding it at 0.9 keeps the film
            faintly alive behind the words while text stays well past AA.
          2 + 3 Two ambient glows - cherry at the top left, sage low and right
            - as plain radial gradients rather than blurred boxes. A blurred
            layer this size is one of the more expensive things a hero can
            leave composited, and a radial stop is already soft. Both are under
            a tenth of an alpha: they are depth, not colour.
          4 The bottom settle, which is now a short ramp to the page's own
            canvas rather than a cinematic fade. */}
      <div
        className="hero-film-wash absolute inset-0"
      />
      {/* Below `lg` the copy column is centred and full-width, so there is no
          quiet side for the film to live on - it sits directly behind the
          words. The horizontal wash cannot fix that (it protects the LEFT),
          so a flat scrim takes the film back on small viewports. It costs one
          composited layer that does not exist on desktop. */}
      <div
        className="hero-film-mobile-scrim absolute inset-0 lg:hidden"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 55% at 18% 8%, hsl(var(--primary) / 0.09), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 50% at 88% 78%, hsl(var(--success) / 0.07), transparent 72%)',
        }}
      />
      {/* Sized to sit INSIDE the hero's bottom padding rather than past it.
          At `h-32` this ramp was taller than the padding it lives in, so the
          film had already faded to flat background well above the hero's last
          line - and 128px of empty gradient plus the section band below read
          as one ~220px void under "Sign in". The fade still does its job at
          this height; it just stops manufacturing space the layout did not
          ask for. */}
      <div
        className="absolute inset-x-0 bottom-0 h-20"
        style={{
          background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
        }}
      />
    </div>
  );
}
