/**
 * Recruiter's Six Seconds — the honest "what a recruiter sees in 6 seconds"
 * read of the user's résumé. Backend: POST /api/resume/six-seconds (async job).
 */

export interface SixSecondsGazeSection {
  key: string;
  label: string;
  /** Relative attention weight 0.0–1.0 — drives the heatmap intensity. */
  weight: number;
  reason: string;
}

export interface SixSecondsGaze {
  sections: SixSecondsGazeSection[];
  focal_points: string[];
  blind_spots: string[];
  pattern: string;
  note: string;
}

export interface SixSecondsImpression {
  headline_read: string;
  level_read: string;
  standout: string;
  missing_or_unclear: string;
  six_second_verdict: string;
}

export interface SixSecondsSuccess {
  gaze: SixSecondsGaze;
  impression: SixSecondsImpression;
}

/** Returned (as the job result) when the user has no parsed résumé yet. */
export interface SixSecondsNoResume {
  error: 'no_resume';
}

export type SixSecondsResult = SixSecondsSuccess | SixSecondsNoResume;

export function isSixSecondsNoResume(
  r: SixSecondsResult | null | undefined,
): r is SixSecondsNoResume {
  return !!r && 'error' in r && r.error === 'no_resume';
}
