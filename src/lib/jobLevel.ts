import { seniorityViewOf } from '@/lib/careerJobs';
import type { LevelEstimate, WorkdayJob } from '@/types/jobs';

/**
 * What a card says about the role's level.
 *
 * Three answers, never blurred together:
 *  - `stated`: the title, the description or the years the posting asks for
 *    put it in a band (the server's `seniority`);
 *  - `estimated`: the posting states no level or years, and the server read a
 *    likely band from softer wording ("you will mentor junior engineers"). It
 *    is shown lighter and prefixed "Likely", and the level FILTER still treats
 *    the card as "no level stated", so a wrong estimate can never hide a job;
 *  - `unstated`: neither. The card says so plainly.
 */
export type JobLevelKind = 'stated' | 'estimated' | 'unstated';

export interface JobLevelLabel {
  kind: JobLevelKind;
  /** Short chip text: "Mid level", "Likely Senior", "Level not stated". */
  text: string;
  /** Hover / screen-reader explanation. */
  title: string;
}

const NAME: Record<LevelEstimate['level'], string> = {
  intern: 'Internship',
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior',
  staff: 'Staff+',
};

const SHORT: Record<LevelEstimate['level'], string> = {
  intern: 'Intern',
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  staff: 'Staff+',
};

export function jobLevelLabel(job: Pick<WorkdayJob, 'seniority' | 'title' | 'level_estimate'>): JobLevelLabel {
  const view = seniorityViewOf(job as WorkdayJob);
  if (view !== 'unknown') {
    return { kind: 'stated', text: NAME[view], title: `${NAME[view]}, from the posting` };
  }
  const est = job.level_estimate;
  if (est && est.level in SHORT) {
    return {
      kind: 'estimated',
      text: `Likely ${SHORT[est.level]}`,
      title: est.basis
        ? `Estimated. The posting states no level or years; it says: "${est.basis}"`
        : 'Estimated. The posting states no level or years.',
    };
  }
  return {
    kind: 'unstated',
    text: 'Level not stated',
    title: 'The posting states no level and no years of experience.',
  };
}
