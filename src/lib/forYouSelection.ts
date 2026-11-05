import type { WorkdayJob, WorkdayRecency } from '@/types/jobs';
import {
  inRecencyWindow,
  isAppliedPipelineStatus,
  matchesSeniorityLevels,
  RECENCY_OPTIONS,
  seniorityViewOf,
  SENIORITY_LEVELS,
  sortJobsByMode,
  type SeniorityLevel,
} from '@/lib/careerJobs';
import { isFitScored, isWeakerFit } from '@/components/job-search/fitBands';
import { isHiddenJob } from '@/lib/hiddenJobs';

export interface ForYouFilters {
  recency: WorkdayRecency;
  search: string;
  seniorityLevels: SeniorityLevel[];
  minScore: number;
  sponsorFilter: 'all' | 'friendly' | 'proven';
  showApplied: boolean;
  sortBy: 'score' | 'newest';
  hiddenJobIds: Set<string>;
  getJobStatus: (jobId: string, applyLink?: string) => string | null;
  /** Show weak and unlikely matches too. Default (false/absent): folded away,
   *  except the cards `foldedWeakerMatches` always keeps. */
  showWeaker?: boolean;
  /** End of the user's previous visit (ISO UTC), or null when unknown. */
  seenThrough?: string | null;
  /** Only cards new since the previous visit. Ignored without `seenThrough`. */
  newOnly?: boolean;
  /** Cards passed over on several visits (`lib/boardImpressions`). */
  isPassedOver?: (job: WorkdayJob) => boolean;
}

/** However weak the user's best scores are, this many always stay visible. */
export const ALWAYS_KEEP_TOP_MATCHES = 20;

/** New since the previous visit: first seen by the crawler after it ended.
 *  Unknown on either side means not new - never a guess. */
export function isNewSince(job: Pick<WorkdayJob, 'first_seen_at'>, seenThrough: string | null | undefined): boolean {
  if (!seenThrough || !job.first_seen_at) return false;
  const seen = Date.parse(job.first_seen_at);
  const through = Date.parse(seenThrough);
  return Number.isFinite(seen) && Number.isFinite(through) && seen > through;
}

/**
 * The rows of `rows` the board folds away as weaker matches.
 *
 * A weak or unlikely verdict is folded UNLESS:
 *  - its score is provisional (`score_basis: 'title_only'`): the description
 *    has not been read, so the low number is not yet the verdict;
 *  - it is one of the user's top `ALWAYS_KEEP_TOP_MATCHES` real verdicts in
 *    `rows`, so someone whose best scores are all low still sees their best.
 * An unscored row is never folded: there is nothing to judge it by.
 */
export function foldedWeakerMatches(rows: readonly WorkdayJob[]): Set<WorkdayJob> {
  const candidates = rows.filter((job) => isWeakerFit(job) && job.score_basis !== 'title_only');
  if (!candidates.length) return new Set();
  const top = new Set(
    rows
      .filter((job) => isFitScored(job))
      .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
      .slice(0, ALWAYS_KEEP_TOP_MATCHES),
  );
  return new Set(candidates.filter((job) => !top.has(job)));
}

/** One population for For you, its facets, and Home's preview. Each facet
 * omits only its own filter, so its count describes the result of choosing it.
 * Every count is of what the board would SHOW: weaker matches folded away
 * under the current toggle are not counted. */
export function selectForYouJobs(jobs: WorkdayJob[], filters: ForYouFilters) {
  const { recency, search, seniorityLevels, minScore, sponsorFilter, showApplied, sortBy,
    hiddenJobIds, getJobStatus, showWeaker = false, seenThrough = null, isPassedOver } = filters;
  const newOnly = !!filters.newOnly && !!seenThrough;
  const recencyWindow = RECENCY_OPTIONS.find((option) => option.key === recency) ?? RECENCY_OPTIONS[0];
  const query = search.trim().toLowerCase();
  const isApplied = (job: WorkdayJob) =>
    isAppliedPipelineStatus(getJobStatus(job.job_id, job.apply_link));
  const isNew = (job: WorkdayJob) => isNewSince(job, seenThrough);
  const eligible = jobs.filter((job) =>
    (!query || `${job.title} ${job.company}`.toLowerCase().includes(query)) &&
    (!minScore || (job.match_score ?? 0) >= minScore) &&
    (sponsorFilter !== 'friendly' || job.sponsorship !== 'refused') &&
    (sponsorFilter !== 'proven' || job.sponsorship === 'likely') &&
    !isHiddenJob(hiddenJobIds, job) &&
    (showApplied || !isApplied(job)),
  );

  /** What the board shows of `rows`, which already pass every other filter. */
  const show = (rows: WorkdayJob[]) => {
    const folded = foldedWeakerMatches(rows);
    const unfolded = showWeaker || !folded.size ? rows : rows.filter((job) => !folded.has(job));
    const newCount = seenThrough ? unfolded.filter(isNew).length : 0;
    return { shown: newOnly ? unfolded.filter(isNew) : unfolded, weakerCount: folded.size, newCount };
  };

  const recencyCounts = Object.fromEntries(RECENCY_OPTIONS.map(({ key }) => [key, 0])) as
    Record<WorkdayRecency, number>;
  const leveled = eligible.filter((job) => matchesSeniorityLevels(job, seniorityLevels));
  let current = show([]);
  for (const option of RECENCY_OPTIONS) {
    const result = show(leveled.filter((job) => inRecencyWindow(job, option.maxDays, option.minDays)));
    recencyCounts[option.key] = result.shown.length;
    if (option.key === recencyWindow.key) current = result;
  }

  // Levels: a selected level (and "no level stated") is counted off the list
  // itself, so the breakdown always adds up to the total. An unselected level
  // is counted as if it were added, which is what choosing it would show.
  const levelCounts: Record<SeniorityLevel | 'unknown', number> = {
    intern: 0, entry: 0, mid: 0, senior: 0, staff: 0, unknown: 0,
  };
  for (const job of current.shown) levelCounts[seniorityViewOf(job)] += 1;
  const inWindow = eligible.filter((job) => inRecencyWindow(job, recencyWindow.maxDays, recencyWindow.minDays));
  for (const level of SENIORITY_LEVELS) {
    if (!seniorityLevels.length || seniorityLevels.includes(level)) continue;
    const widened = [...seniorityLevels, level];
    const { shown } = show(inWindow.filter((job) => matchesSeniorityLevels(job, widened)));
    levelCounts[level] = shown.filter((job) => seniorityViewOf(job) === level).length;
  }

  return {
    visibleJobs: sortJobsByMode(current.shown, sortBy, { isApplied, isPassedOver }),
    recencyCounts,
    levelCounts,
    /** Weaker matches in this window: folded away now, or shown because the
     *  user asked. Drives "N weaker matches hidden. Show them". */
    weakerMatchCount: current.weakerCount,
    /** Cards new since the previous visit in this window (0 when unknown). */
    newCount: current.newCount,
  };
}
