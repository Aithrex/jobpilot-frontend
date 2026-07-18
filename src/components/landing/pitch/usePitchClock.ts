import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The pitch player's clock — a requestAnimationFrame accumulator.
 *
 * Runs ONLY while `playing && active` (the caller derives `active` from
 * section-in-view + document visibility), so scrolling away or switching tabs
 * freezes the clock and it resumes exactly where it left off. Elapsed time is
 * plain state updated per frame; every scene is a pure function of it, which
 * is what makes scrubbing back and forth deterministic.
 */
export interface PitchClock {
  /** seconds elapsed, 0..total */
  elapsed: number;
  playing: boolean;
  /** jump to an absolute time (clamped) without changing play state */
  seek: (t: number) => void;
  /** play/pause; playing again from the end restarts from 0 */
  toggle: () => void;
}

export function usePitchClock({ total, active }: { total: number; active: boolean }): PitchClock {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Ref mirror so the rAF loop and seek() never race a stale closure.
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!playing || !active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Clamp huge deltas (background-tab wakeups) so the story never skips.
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const next = Math.min(elapsedRef.current + dt, total);
      elapsedRef.current = next;
      setElapsed(next);
      if (next >= total) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, active, total]);

  const seek = useCallback(
    (t: number) => {
      const clamped = Math.min(Math.max(t, 0), total);
      elapsedRef.current = clamped;
      setElapsed(clamped);
    },
    [total],
  );

  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && elapsedRef.current >= total) {
        elapsedRef.current = 0;
        setElapsed(0);
      }
      return !p;
    });
  }, [total]);

  return { elapsed, playing, seek, toggle };
}
