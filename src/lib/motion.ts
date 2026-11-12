/**
 * JobPilot motion system - the ONE framer-motion vocabulary.
 *
 * Every animated surface in the app should reach for something here rather
 * than inventing a duration or a cubic-bezier inline. The values mirror the
 * CSS motion tokens in `src/index.css` (`--motion-fast/base/slow`,
 * `--ease-standard/accelerate/decelerate`) so a CSS transition and a framer
 * tween of the same intent are indistinguishable.
 *
 * Rules this encodes:
 *   1. Motion is FAST. Micro-interactions 120ms, reveals 200ms, the longest
 *      UI entrance 280ms, so every response lands inside 300ms and well
 *      inside the 400ms Doherty threshold. Nothing waits on an animation.
 *      The one exception is the landing's product story
 *      (`components/landing/story`), a looped illustration with a Pause
 *      control, not a UI response.
 *   2. Motion is CHEAP. `opacity` and `transform` only - never height, width,
 *      top or left, so nothing reflows mid-animation.
 *   3. Motion is OPTIONAL. Every helper takes `reduce` (from framer's
 *      `useReducedMotion()`) and collapses to an instant, no-transform state.
 *      Skeletons already occupy the final layout, so with motion off the page
 *      simply appears - it never looks broken.
 *   4. Enter decelerates, exit accelerates. Things arriving settle; things
 *      leaving get out of the way.
 *   5. The more often a surface is used, the less it moves. Jobs, Tracker
 *      and Resume screens get state feedback only (press, hover, a 200ms
 *      reveal); entrances and flourishes belong to first-run and marketing
 *      surfaces people see once.
 *   6. Feedback is felt, not watched. Every pressable thing squashes to 0.97
 *      on press (`PRESS_SCALE`, already in the shadcn Button) and returns on
 *      release; that is the whole "exaggerated feedback" budget in the app.
 *
 * Deliberately NOT here: springs for anything other than a shared `layoutId`
 * indicator (the nav pill). Springs on content read as bouncy on dense,
 * informational UI.
 */
import type { Transition, Variants } from 'framer-motion';

/* ── Durations (seconds - framer's unit; the CSS tokens are in ms) ───────── */

export const DURATION = {
  /** 120ms - hover, focus, press, colour and icon nudges. */
  fast: 0.12,
  /** 200ms - the default. Panel reveals, expand/collapse, popovers. */
  base: 0.2,
  /** 280ms - the longest allowed: a full-page orchestrated entrance. */
  slow: 0.28,
} as const;

/* ── Easings (mirror --ease-* in index.css) ─────────────────────────────── */

/** Enter + exit in one curve. The safe default when a thing does both. */
export const EASE_STANDARD: [number, number, number, number] = [0.2, 0, 0, 1];
/** Entrances: fast start, long calm settle (= `--ease-out-expo`, `ease-expo`). */
export const EASE_DECELERATE: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** Exits: leave immediately, no lingering. */
export const EASE_ACCELERATE: [number, number, number, number] = [0.3, 0, 1, 1];
/**
 * Follow-through: overshoots a few percent, then settles. Only for a moment
 * worth celebrating (a match lands, an application is logged), never for
 * routine content, where it reads as bouncy.
 */
export const EASE_OVERSHOOT: [number, number, number, number] = [0.34, 1.56, 0.64, 1];

/** The pressed state of anything clickable. */
export const PRESS_SCALE = 0.97;

/* ── Building blocks ────────────────────────────────────────────────────── */

/** How far a "rise" travels. Small on purpose: a big slide reads as a page
 *  transition, and this is content settling in place. */
const RISE_Y = 8;

/** Per-item delay in a staggered list. 6 items = 0.3s to fully land. */
export const STAGGER_STEP = 0.05;
/** Beyond this index every item shares the last delay, so a 40-row list does
 *  not take two seconds to finish arriving. */
const STAGGER_CAP = 6;

export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_CAP) * STAGGER_STEP;
}

/* ── Ready-made props (spread straight onto a motion element) ───────────── */

export interface RiseOptions {
  /** From `useReducedMotion()`. When true the element mounts already settled. */
  reduce?: boolean | null;
  /** Position in a sequence; drives the stagger delay. */
  index?: number;
  /** Override the tween length. Defaults to `DURATION.slow` for entrances. */
  duration?: number;
}

/**
 * The canonical entrance: fade up 8px, decelerating.
 *
 * ```tsx
 * const reduce = useReducedMotion();
 * <motion.section {...rise({ reduce, index: 2 })}>
 * ```
 */
export function rise({ reduce, index = 0, duration = DURATION.slow }: RiseOptions = {}) {
  return {
    initial: reduce ? false : ({ opacity: 0, y: RISE_Y } as const),
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0 : duration,
      delay: reduce ? 0 : staggerDelay(index),
      ease: EASE_DECELERATE,
    } satisfies Transition,
  };
}

/** A plain cross-fade, for content swapping inside a fixed-size slot. */
export function fade({ reduce, duration = DURATION.base }: RiseOptions = {}) {
  return {
    initial: reduce ? false : ({ opacity: 0 } as const),
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduce ? 0 : duration, ease: EASE_STANDARD } satisfies Transition,
  };
}

/**
 * Container/child variants for a list that arrives as a wave. Put
 * `listContainer` on the `<ul>` and `listItem` on each `<li>`; framer handles
 * the delays, so React keys can change without replaying the whole list.
 */
export const listContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_STEP } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: RISE_Y },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_DECELERATE },
  },
};

/**
 * Expand / collapse for a disclosure (the only sanctioned `height` animation,
 * because there is no transform that can do it). Always pair with
 * `overflow-hidden` on the animated element.
 */
export function disclosure(reduce?: boolean | null) {
  if (reduce) {
    return {
      initial: undefined,
      animate: undefined,
      exit: undefined,
      transition: { duration: 0 } satisfies Transition,
    };
  }
  return {
    initial: { height: 0, opacity: 0 } as const,
    animate: { height: 'auto', opacity: 1 } as const,
    exit: { height: 0, opacity: 0 } as const,
    transition: { duration: DURATION.base, ease: EASE_DECELERATE } satisfies Transition,
  };
}

/**
 * Shared-`layoutId` indicator (the nav pill, a tab underline). The ONE place a
 * spring is correct: the indicator is chasing the pointer, so it should feel
 * physical. Overdamped, so it never overshoots into a wobble.
 */
export function indicatorSpring(reduce?: boolean | null): Transition {
  return reduce
    ? { duration: 0 }
    : { type: 'spring', stiffness: 520, damping: 40, mass: 0.7 };
}
