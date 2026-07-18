/**
 * The pitch script — the single source of truth for "Aspirely in 60 seconds".
 *
 * Seven beats over a 60-second clock. Everything else (scenes, captions,
 * scrubber ticks, the reduced-motion stepper, the sr-only transcript) derives
 * from this array, so the timeline can never drift out of sync with the copy.
 *
 * Copy rules (hard): no em-dashes, no accented characters ("resume", never
 * the accented spelling) anywhere in this feature.
 */

export interface PitchBeat {
  id: string;
  /** short chapter title (chrome label, stepper dots, transcript) */
  title: string;
  /** chapter start time in seconds */
  at: number;
  /** the caption line shown under the scene */
  caption: string;
}

/** Total runtime in seconds. */
export const PITCH_TOTAL = 60;

export const BEATS: PitchBeat[] = [
  {
    id: 'trap',
    title: 'The clock and the trap',
    at: 0,
    caption:
      'On OPT, ninety days unemployed ends your visa. The tools promising rescue make it worse. Mass applying gets accounts banned, and 39% fewer positive responses.',
  },
  {
    id: 'five-max',
    title: 'Five, max',
    at: 10,
    caption:
      'Aspirely sends you five vetted jobs each morning. Five, max. At companies that actually sponsor.',
  },
  {
    id: 'you-submit',
    title: 'You approve. You submit.',
    at: 16,
    caption:
      'You approve each one. It fills the form in your own browser. You hit submit. Nothing runs at volume, everything is logged. There is nothing to ban.',
  },
  {
    id: 'the-loop',
    title: 'The loop nobody has',
    at: 27,
    caption:
      'Sponsorship data is free. A capped, human-approved apply loop does not exist anywhere else.',
  },
  {
    id: 'quality-wins',
    title: 'Quality wins, and we measure',
    at: 31,
    caption:
      'The ATS auto-reject is a myth. Recruiters read ninety percent. Fewer, better applications win, and we instrument every one to find out.',
  },
  {
    id: 'campus',
    title: 'Free wedge, campus business',
    at: 41,
    caption:
      'Free for students. The per-campus license is the business. As campuses ban cheating copilots, we are the tool a career center can endorse.',
  },
  {
    id: 'live',
    title: 'Live, and the exhale',
    at: 52,
    caption:
      'Live in production. Fewer, better, verified. That is how you land the job and keep your integrity.',
  },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Derive the active scene + its local 0..1 progress from the clock. */
export function sceneAt(elapsed: number): { index: number; progress: number; duration: number } {
  let index = 0;
  for (let i = BEATS.length - 1; i >= 0; i--) {
    if (elapsed >= BEATS[i].at) {
      index = i;
      break;
    }
  }
  const start = BEATS[index].at;
  const end = index + 1 < BEATS.length ? BEATS[index + 1].at : PITCH_TOTAL;
  const duration = end - start;
  return { index, progress: duration > 0 ? clamp01((elapsed - start) / duration) : 1, duration };
}

/** Chapter duration in seconds (for the reduced-motion stepper). */
export function beatDuration(index: number): number {
  const start = BEATS[index].at;
  const end = index + 1 < BEATS.length ? BEATS[index + 1].at : PITCH_TOTAL;
  return end - start;
}

/** 7.3 → "0:07" */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
