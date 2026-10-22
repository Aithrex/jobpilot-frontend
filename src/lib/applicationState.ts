/**
 * The words for where a posting sits in the user's application funnel.
 *
 * The distinction this exists for: clicking Apply opens the employer's page,
 * which is NOT an application. The tracker records that as `opened` /
 * `interested` (backend `job_service._PIPELINE_INTENTS`), and only the user's
 * own "Yes, I applied" moves it to `applied`. So:
 *  - opened, not confirmed  -> "Opened application - not confirmed"
 *  - applied                -> "Applied (you confirmed)"
 * and auto-apply's own outcomes, where a row carries them, keep their names:
 * submitted, failed and needs-input are different facts and are never merged
 * into "Applied".
 */
export type ApplicationTone = 'neutral' | 'positive' | 'caution' | 'danger';

export interface ApplicationStateLabel {
  label: string;
  tone: ApplicationTone;
  /** True for the pre-application states (saved / opened). */
  preApplication: boolean;
}

const LABELS: Record<string, Omit<ApplicationStateLabel, 'preApplication'> & { pre?: boolean }> = {
  applied: { label: 'Applied (you confirmed)', tone: 'positive' },
  interview: { label: 'Interviewing', tone: 'positive' },
  interviewing: { label: 'Interviewing', tone: 'positive' },
  offer: { label: 'Offer', tone: 'positive' },
  rejected: { label: 'Rejected', tone: 'neutral' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
  ghosted: { label: 'No response yet', tone: 'neutral' },
  // Auto-apply outcomes (v2, paused) - named exactly, never "Applied".
  submitted: { label: 'Submitted (confirmation received)', tone: 'positive' },
  failed: { label: 'Submission failed', tone: 'danger' },
  needs_input: { label: 'Needs your input', tone: 'caution' },
  // Pre-application.
  interested: { label: 'Saved, not applied', tone: 'neutral', pre: true },
  saved: { label: 'Saved, not applied', tone: 'neutral', pre: true },
  draft: { label: 'Draft, not applied', tone: 'neutral', pre: true },
};

/**
 * The label for a tracker status, or null when there is none.
 *
 * `opened` is true when this session opened the posting and is waiting for
 * the user to say whether they applied; a pre-application status then reads
 * as "Opened application - not confirmed".
 */
export function applicationStateLabel(
  status: string | null | undefined,
  opts: { opened?: boolean } = {},
): ApplicationStateLabel | null {
  const key = (status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const known = key ? LABELS[key] : undefined;
  if (opts.opened && (!known || known.pre)) {
    return { label: 'Opened application - not confirmed', tone: 'caution', preApplication: true };
  }
  if (!known) return null;
  return { label: known.label, tone: known.tone, preApplication: !!known.pre };
}
