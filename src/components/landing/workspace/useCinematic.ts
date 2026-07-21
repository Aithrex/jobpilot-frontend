/**
 * useCinematic — the pre-upload product sequence timeline.
 *
 * ONE settling run of roughly 7.5s, then it parks on `settled` forever. It
 * deliberately does NOT loop: an infinitely replaying hero is a battery tax and
 * a distraction from the real upload control sitting next to it. After it
 * settles, only ambient environmental motion remains.
 *
 * Liveness rules (all of them non-negotiable for performance/a11y):
 *  - never starts until the section is on screen AND the tab is visible,
 *  - pauses (holds its beat) when either goes false,
 *  - under `prefers-reduced-motion` it resolves INSTANTLY to `settled`, so the
 *    reduced-motion user sees the finished composition rather than nothing,
 *  - `takeover` (a real file was picked) kills it immediately and permanently.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Beats A–F from the product sequence, plus the terminal settle. */
export type CinematicBeat =
  | "arrive"
  | "scan"
  | "profile"
  | "match"
  | "tailor"
  | "settled";

/** Cumulative start time (ms) of each beat. */
const TIMELINE: ReadonlyArray<readonly [CinematicBeat, number]> = [
  ["arrive", 0],
  ["scan", 900],
  ["profile", 2600],
  ["match", 4200],
  ["tailor", 5900],
  ["settled", 7500],
] as const;

export const CINEMATIC_DURATION_MS = 7500;

const ORDER: CinematicBeat[] = TIMELINE.map(([b]) => b);

export function beatIndex(beat: CinematicBeat): number {
  return ORDER.indexOf(beat);
}

/** True once the sequence has reached (or passed) `target`. */
export function atOrPast(current: CinematicBeat, target: CinematicBeat): boolean {
  return beatIndex(current) >= beatIndex(target);
}

export interface UseCinematicOptions {
  /** Section is on screen and the tab is visible. */
  live: boolean;
  /** A real résumé was picked — stop illustrating, permanently. */
  takeover: boolean;
}

export function useCinematic({ live, takeover }: UseCinematicOptions) {
  const reduce = useReducedMotion();
  const [beat, setBeat] = useState<CinematicBeat>(() =>
    reduce ? "settled" : "arrive",
  );
  /** ms of timeline already played — lets pause/resume keep its place. */
  const elapsed = useRef(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (takeover) return;
    if (reduce) {
      setBeat("settled");
      return;
    }
    if (!live) {
      // Bank the time played so far, then hold this beat.
      if (startedAt.current !== null) {
        elapsed.current += performance.now() - startedAt.current;
        startedAt.current = null;
      }
      return;
    }
    if (elapsed.current >= CINEMATIC_DURATION_MS) {
      setBeat("settled");
      return;
    }

    startedAt.current = performance.now();
    const timers: number[] = [];
    for (const [name, at] of TIMELINE) {
      const delay = at - elapsed.current;
      if (delay <= 0) {
        setBeat(name);
        continue;
      }
      timers.push(window.setTimeout(() => setBeat(name), delay));
    }
    return () => {
      timers.forEach(window.clearTimeout);
      if (startedAt.current !== null) {
        elapsed.current += performance.now() - startedAt.current;
        startedAt.current = null;
      }
    };
  }, [live, reduce, takeover]);

  return useMemo(
    () => ({
      beat,
      /** The illustrative sequence is finished (or was never animated). */
      settled: beat === "settled",
      reduce: !!reduce,
    }),
    [beat, reduce],
  );
}
