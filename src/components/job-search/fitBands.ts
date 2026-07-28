/**
 * Fit-score bands - the ONE client-side reading of the server's 0-100 number.
 *
 * These thresholds are not a design choice: they are copied from the scoring
 * engine, `shared/python/services/fit_score.py::BANDS`
 *
 *     (80, "strong match") (65, "good match") (50, "possible match")
 *     (35, "weak match")   (0,  "unlikely match")
 *
 * 65 is also the gate Auto-Apply uses to decide a posting is worth queueing
 * (AUTOAPPLY_REPAIR_SPEC section 5), so "good match" is a load-bearing word in
 * this product, not a vibe. If the engine's bands ever move, move them HERE and
 * nowhere else.
 *
 * Because these words belong to ONE engine, they may only be applied to that
 * engine's numbers: use `fitBandOf(row)` / `isFitScored(row)` for anything the
 * server sent, and keep the bare `fitBand(score)` for a number already known to
 * be a fit score.
 *
 * Colour policy (docs/DESIGN_SYSTEM_MAP.md section 3): `success` is reserved
 * for positive evidence, `warning` for caution, and the brand `primary` for
 * "we recommend this". Colour is never the only cue - every consumer renders
 * the band LABEL next to the number.
 */

export type FitBandKey = 'strong' | 'good' | 'possible' | 'weak' | 'unlikely' | 'unscored';

export interface FitBand {
  key: FitBandKey;
  /** Server wording, title-cased for display ("Strong match"). */
  label: string;
  /** Plain-language "what this means for me". */
  meaning: string;
  /** Tailwind text colour token class. */
  text: string;
  /** Chip recipe: hairline border + light tint + AA foreground. */
  chip: string;
  /** Stroke for the SVG progress ring (a raw `hsl(var(--token))` string). */
  stroke: string;
  /** Inclusive lower bound of the band. */
  min: number;
}

const STRONG: FitBand = {
  key: 'strong',
  label: 'Strong match',
  meaning: 'Your evidence covers most of what this posting asks for.',
  text: 'text-success',
  chip: 'border-success/30 bg-success/10 text-success',
  stroke: 'hsl(var(--success))',
  min: 80,
};

const GOOD: FitBand = {
  key: 'good',
  label: 'Good match',
  meaning: 'Worth applying to. This is the bar Auto-Apply uses to queue a role.',
  text: 'text-primary',
  chip: 'border-primary/30 bg-primary/10 text-primary',
  stroke: 'hsl(var(--primary))',
  min: 65,
};

const POSSIBLE: FitBand = {
  key: 'possible',
  label: 'Possible match',
  meaning: 'Reachable, but you will need to make the case in a tailored resume.',
  text: 'text-warning',
  chip: 'border-warning/30 bg-warning/10 text-warning',
  stroke: 'hsl(var(--warning))',
  min: 50,
};

const WEAK: FitBand = {
  key: 'weak',
  label: 'Weak match',
  meaning: 'Several stated requirements are missing from your resume.',
  text: 'text-muted-foreground',
  chip: 'border-border bg-muted text-muted-foreground',
  stroke: 'hsl(var(--muted-foreground))',
  min: 35,
};

const UNLIKELY: FitBand = {
  key: 'unlikely',
  label: 'Unlikely match',
  meaning: 'This posting asks for a different background.',
  text: 'text-muted-foreground',
  chip: 'border-border bg-muted text-muted-foreground',
  stroke: 'hsl(var(--muted-foreground))',
  min: 0,
};

/**
 * The "we have no number" state. A score of 0 out of the scoring engine means
 * it declined to score (no readable resume, or a posting whose body it could
 * not read) - it does NOT mean "you are a 0% fit". Showing a grey zero as if it
 * were a verdict is the single most dishonest thing this UI could do, so it
 * gets its own band with its own copy.
 */
const UNSCORED: FitBand = {
  key: 'unscored',
  label: 'Not scored',
  meaning: 'We could not compare this posting to your resume yet.',
  text: 'text-muted-foreground',
  chip: 'border-dashed border-border bg-muted/50 text-muted-foreground',
  stroke: 'hsl(var(--muted-foreground))',
  min: 0,
};

export const FIT_BANDS: FitBand[] = [STRONG, GOOD, POSSIBLE, WEAK, UNLIKELY];

/** The score at or above which Auto-Apply will queue a posting. */
export const AUTO_APPLY_GATE = GOOD.min;

/**
 * Band for a raw score. `null`/`undefined`/`0` resolve to the honest
 * "not scored" band rather than to "unlikely".
 *
 * Takes a NUMBER, so it cannot tell whether that number came from the engine
 * whose cut-offs are written above. Prefer `fitBandOf(row)` on any surface that
 * renders a server row - see below.
 */
export function fitBand(score: number | null | undefined): FitBand {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return UNSCORED;
  return FIT_BANDS.find((b) => score >= b.min) ?? UNLIKELY;
}

/** True when the number is a real verdict we can talk about. */
export function isScored(score: number | null | undefined): boolean {
  return fitBand(score).key !== 'unscored';
}

/**
 * A row that carries the scoring engine's own version stamp.
 *
 * The backend writes it in two shapes: nested under `fit` (`inventory_feed`,
 * `job_service.match_jobs`, the guest path) and flat on the row
 * (`workday_jobs_service._score_jobs`). Either proves the number beside it came
 * from `fit_score`.
 */
export interface ScoredRow {
  match_score?: number | null;
  score_version?: string | null;
  fit?: { score_version?: string | null } | null;
}

/**
 * Did THIS row's number come from the engine these bands describe?
 *
 * The words above ("Good match", "This is the bar Auto-Apply uses to queue a
 * role") are copied from `shared/python/services/fit_score.py`. For a while they
 * were being applied to whatever integer happened to arrive as `match_score`,
 * and three different backend engines wrote that key: `/api/jobs/search` ran a
 * `title*35 + skill*30 + domain*20 + experience*15` blend plus flat bonuses, the
 * career-portal scans post-processed fit_score's output, and a résumé-less
 * account got a hardcoded-skill-list score that reached 100. On identical
 * (résumé, posting) pairs that meant 66 here and 98 there - and a green "Strong
 * match" on a posting the platform itself rated "unlikely".
 *
 * The engines are consolidated server-side now. This is the guard that keeps it
 * that way: a row with no version stamp gets NO band words, because we cannot
 * say what its number means. It reads as "Not scored", which is the truth.
 */
export function isFitScored(row: ScoredRow | null | undefined): boolean {
  if (!row) return false;
  const stamp = row.fit?.score_version ?? row.score_version;
  return typeof stamp === 'string' && stamp.trim().length > 0;
}

/** `fitBand`, but gated on the row actually carrying a fit_score verdict. */
export function fitBandOf(row: ScoredRow | null | undefined): FitBand {
  if (!isFitScored(row)) return UNSCORED;
  return fitBand(row?.match_score);
}

/** Seniority band labels for career-portal rows (`WorkdayJob.seniority`). */
export const SENIORITY_LABEL: Record<string, string> = {
  intern: 'Internship level',
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior level',
};

/**
 * How honestly a base resume can be tailored into this JD
 * (`WorkdayJob.tailor_feasibility`). Distinct from the fit score: fit is
 * "do you match", feasibility is "can we write it without inventing facts".
 */
export const FEASIBILITY_META: Record<string, { label: string; chip: string }> = {
  strong: { label: 'Tailors cleanly', chip: 'border-success/30 bg-success/10 text-success' },
  possible: { label: 'Tailors with work', chip: 'border-primary/30 bg-primary/10 text-primary' },
  stretch: { label: 'A stretch to tailor', chip: 'border-warning/30 bg-warning/10 text-warning' },
  skip: { label: 'Hard to tailor honestly', chip: 'border-border bg-muted text-muted-foreground' },
};
