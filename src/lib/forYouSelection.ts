import type { WorkdayJob, WorkdayRecency } from '@/types/jobs';
import {
  inRecencyWindow,
  isAppliedPipelineStatus,
  matchesSeniorityLevels,
  RECENCY_OPTIONS,
  seniorityViewOf,
  sortJobsByMode,
  type SeniorityLevel,
} from '@/lib/careerJobs';
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
}

/** One population for For you, its facets, and Home's preview. Each facet
 * omits only its own filter, so its count describes the result of choosing it. */
export function selectForYouJobs(jobs: WorkdayJob[], filters: ForYouFilters) {
  const { recency, search, seniorityLevels, minScore, sponsorFilter, showApplied, sortBy,
    hiddenJobIds, getJobStatus } = filters;
  const recencyWindow = RECENCY_OPTIONS.find((option) => option.key === recency) ?? RECENCY_OPTIONS[0];
  const query = search.trim().toLowerCase();
  const isApplied = (job: WorkdayJob) =>
    isAppliedPipelineStatus(getJobStatus(job.job_id, job.apply_link));
  const eligible = jobs.filter((job) =>
    (!query || `${job.title} ${job.company}`.toLowerCase().includes(query)) &&
    (!minScore || (job.match_score ?? 0) >= minScore) &&
    (sponsorFilter !== 'friendly' || job.sponsorship !== 'refused') &&
    (sponsorFilter !== 'proven' || job.sponsorship === 'likely') &&
    !isHiddenJob(hiddenJobIds, job) &&
    (showApplied || !isApplied(job)),
  );

  const recencyCounts = Object.fromEntries(RECENCY_OPTIONS.map(({ key }) => [key, 0])) as
    Record<WorkdayRecency, number>;
  const levelCounts: Record<SeniorityLevel | 'unknown', number> = {
    intern: 0, entry: 0, mid: 0, senior: 0, staff: 0, unknown: 0,
  };
  const visible: WorkdayJob[] = [];
  for (const job of eligible) {
    const inWindow = inRecencyWindow(job, recencyWindow.maxDays, recencyWindow.minDays);
    const inLevel = matchesSeniorityLevels(job, seniorityLevels);
    if (inWindow) levelCounts[seniorityViewOf(job)] += 1;
    if (inLevel) {
      for (const option of RECENCY_OPTIONS) {
        if (inRecencyWindow(job, option.maxDays, option.minDays)) recencyCounts[option.key] += 1;
      }
      if (inWindow) visible.push(job);
    }
  }
  return { visibleJobs: sortJobsByMode(visible, sortBy, { isApplied }), recencyCounts, levelCounts };
}
