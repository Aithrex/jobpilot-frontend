/**
 * useCinematic - the pre-upload product tour that drives the hero workspace.
 *
 * It walks the four things Aspirely does - READ, MATCH, TAILOR, TRACK - one
 * scene at a time, and it KEEPS WALKING. A visitor who never touches anything
 * still sees the whole product, because the loop is the demo: a stage that
 * played once and froze meant three quarters of the workflow was only reachable
 * by clicking a tab nobody clicked.
 *
 * Why a loop is affordable here: each tick is one `setTimeout` swapping one
 * small subtree. There is no rAF loop, no canvas, no video, and the whole thing
 * is suspended whenever it is not being watched.
 *
 * Liveness rules (all of them non-negotiable for performance/a11y):
 *  - never starts until the section is on screen AND the tab is visible,
 *  - pauses on the current beat when either goes false, and resumes there,
 *  - under `prefers-reduced-motion` it resolves INSTANTLY to the final beat and
 *    never advances, so nothing moves and nothing is withheld,
 *  - `takeover` (a real file was picked) kills it immediately and permanently,
 *  - `select(beat)` RESUMES the tour from the chosen scene rather than ending
 *    it. Clicking a tab used to stop the loop for good, which quietly punished
 *    the one visitor who engaged with the demo: they poked it once and the
 *    thing they were enjoying died. A click now just says "start here".
 *  - the tour holds while the tablist has keyboard focus, and resumes on blur.
 *    That is the narrow case where "nothing moves under their hands" genuinely
 *    matters: a keyboard user parked on the control would otherwise have the
 *    selection change beneath their focus.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/** The four scenes of the workflow. One tab, one beat, one scene. */
export type CinematicBeat = 'read' | 'match' | 'tailor' | 'track';

export const BEATS: readonly CinematicBeat[] = ['read', 'match', 'tailor', 'track'] as const;

/**
 * How long each scene holds before the tour advances. Not uniform: `tailor`
 * carries the most to look at (two columns plus the integrity guarantee), and
 * `read` has the scanning pass to finish, so both hold longer than the two
 * list-shaped scenes.
 */
const HOLD_MS: Record<CinematicBeat, number> = {
  read: 2900,
  match: 2500,
  tailor: 3100,
  track: 2500,
};

export function beatIndex(beat: CinematicBeat): number {
  return BEATS.indexOf(beat);
}

export interface UseCinematicOptions {
  /** Section is on screen and the tab is visible. */
  live: boolean;
  /** A real resume was picked - stop illustrating, permanently. */
  takeover: boolean;
}

/**
 * Where a reduced-motion visitor lands. There is no tour for them, so they see
 * exactly ONE scene until they use the tabs - which makes this a real editorial
 * choice, not a fallback. It is `tailor` because that scene carries
 * IntegrityGuard, the promise we least want a visitor to have to go looking
 * for: tailoring moves emphasis, never facts.
 */
const STILL_BEAT: CinematicBeat = 'tailor';

export function useCinematic({ live, takeover }: UseCinematicOptions) {
  const reduce = useReducedMotion();
  const stillIndex = BEATS.indexOf(STILL_BEAT);

  const [index, setIndex] = useState(() => (reduce ? stillIndex : 0));
  /** The tablist has keyboard focus - hold, but only until it is given up. */
  const [held, setHeld] = useState(false);

  const autoplay = live && !takeover && !held && !reduce;

  // The preference can flip mid-session (a system setting, or a test).
  useEffect(() => {
    if (reduce) setIndex(stillIndex);
  }, [reduce, stillIndex]);

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(
      () => setIndex((i) => (i + 1) % BEATS.length),
      HOLD_MS[BEATS[index]],
    );
    return () => window.clearTimeout(id);
  }, [autoplay, index]);

  /** Jump the tour to a beat. It keeps running from there: the effect above is
   *  keyed on `index`, so selecting restarts the hold for the chosen scene. */
  const select = useCallback((target: CinematicBeat) => {
    const i = BEATS.indexOf(target);
    if (i < 0) return;
    setIndex(i);
  }, []);

  /** Hold the tour while the controls have keyboard focus. */
  const hold = useCallback((holding: boolean) => setHeld(holding), []);

  return useMemo(
    () => ({
      beat: BEATS[index],
      index,
      count: BEATS.length,
      /** ms the current scene holds - lets the stage draw a progress hairline
       *  that finishes exactly as the scene changes. */
      holdMs: HOLD_MS[BEATS[index]],
      /** The tour is running on its own right now. */
      autoplay,
      reduce: !!reduce,
      select,
      hold,
    }),
    [index, autoplay, reduce, select, hold],
  );
}
