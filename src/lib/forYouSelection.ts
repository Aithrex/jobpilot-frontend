import type { CompanyType, WorkdayJob, WorkdayRecency } from '@/types/jobs';
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
  /** Companies the board is narrowed to (`companyKeyOf`). Empty = all. */
  companies?: ReadonlySet<string>;
  /** Fold likely reposts (same company + title + city) under their first card. */
  collapseReposts?: boolean;
}

/** One company on the board, for the grouped company checklist. */
export interface CompanyFacet {
  key: string;
  name: string;
  type: CompanyType;
  basis: string;
  count: number;
}

/** The key a company is filtered by: its display name, case-folded. */
export function companyKeyOf(job: Pick<WorkdayJob, 'company'>): string {
  return (job.company || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** A card the board folds under an earlier card as a likely repost. */
export function isFoldedRepost(job: Pick<WorkdayJob, 'possible_duplicate_of'>): boolean {
  return !!job.possible_duplicate_of;
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
    hiddenJobIds, getJobStatus, showWeaker = false, seenThrough = null, isPassedOver,
    companies, collapseReposts = false } = filters;
  const newOnly = !!filters.newOnly && !!seenThrough;
  const recencyWindow = RECENCY_OPTIONS.find((option) => option.key === recency) ?? RECENCY_OPTIONS[0];
  const query = search.trim().toLowerCase();
  const isApplied = (job: WorkdayJob) =>
    isAppliedPipelineStatus(getJobStatus(job.job_id, job.apply_link));
  const isNew = (job: WorkdayJob) => isNewSince(job, seenThrough);
  // Every filter but the company one, so the company checklist can count
  // what choosing a company would show.
  const beforeCompany = jobs.filter((job) =>
    (!query || `${job.title} ${job.company}`.toLowerCase().includes(query)) &&
    (!minScore || (job.match_score ?? 0) >= minScore) &&
    (sponsorFilter !== 'friendly' || job.sponsorship !== 'refused') &&
    (sponsorFilter !== 'proven' || job.sponsorship === 'likely') &&
    !isHiddenJob(hiddenJobIds, job) &&
    (showApplied || !isApplied(job)),
  );
  // A repost folds only under a card the board still shows: if the earlier
  // copy was hidden or applied to, this one is the only copy left.
  const present = new Set(beforeCompany.map((job) => job.job_id));
  const folds = (job: WorkdayJob) =>
    isFoldedRepost(job) && present.has(job.possible_duplicate_of as string);
  const unfoldedReposts = collapseReposts ? beforeCompany.filter((job) => !folds(job)) : beforeCompany;
  const repostsFolded = beforeCompany.length - unfoldedReposts.length;
  const companyFilterOn = !!companies && companies.size > 0;
  const eligible = companyFilterOn
    ? unfoldedReposts.filter((job) => companies!.has(companyKeyOf(job)))
    : unfoldedReposts;

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

  // The company checklist: every company in this window at these levels,
  // counted as the board would show it, whatever companies are ticked.
  const facetRows = companyFilterOn
    ? show(unfoldedReposts.filter((job) =>
      matchesSeniorityLevels(job, seniorityLevels)
      && inRecencyWindow(job, recencyWindow.maxDays, recencyWindow.minDays))).shown
    : current.shown;
  const byCompany = new Map<string, CompanyFacet>();
  for (const job of facetRows) {
    const key = companyKeyOf(job);
    if (!key) continue;
    const prev = byCompany.get(key);
    if (prev) prev.count += 1;
    else {
      byCompany.set(key, {
        key,
        name: (job.company || '').trim(),
        type: job.company_type?.type ?? 'unknown',
        basis: job.company_type?.basis ?? '',
        count: 1,
      });
    }
  }
  // A ticked company the window no longer holds stays listed (at 0), so it
  // can always be unticked.
  for (const key of companies ?? []) {
    if (!byCompany.has(key)) byCompany.set(key, { key, name: key, type: 'unknown', basis: '', count: 0 });
  }
  const companyFacets = [...byCompany.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    visibleJobs: sortJobsByMode(current.shown, sortBy, { isApplied, isPassedOver }),
    /** Every company in the window with its type and card count. */
    companyFacets,
    /** Likely reposts folded under their first card (0 when not folding). */
    repostsFolded,
    recencyCounts,
    levelCounts,
    /** Weaker matches in this window: folded away now, or shown because the
     *  user asked. Drives "N weaker matches hidden. Show them". */
    weakerMatchCount: current.weakerCount,
    /** Cards new since the previous visit in this window (0 when unknown). */
    newCount: current.newCount,
  };
}
