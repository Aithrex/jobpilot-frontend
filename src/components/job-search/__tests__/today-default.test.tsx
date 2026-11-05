import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { CombinedJobsProvider, useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { useJobSearch } from '@/hooks/useJobSearch';
import type { WorkdayJob } from '@/types/jobs';

/**
 * The board always opens on Today, however few roles it holds (owner's call,
 * 2026-11-04). It used to widen itself to the last 3 days below 20 roles.
 */
const state = vi.hoisted(() => ({ jobs: [] as WorkdayJob[] }));
vi.mock('@/hooks/useJobTitles', () => ({ useJobTitles: () => ({
  experienceView: null, reviewTitles: [], resolveReview: vi.fn(),
  resumeSync: null, undoResumeSync: vi.fn(), syncRevision: 0,
}) }));
vi.mock('@/hooks/useCombinedJobs', () => ({
  loadCombinedPrefs: () => ({}), saveCombinedPrefs: vi.fn(),
  useCombinedJobs: () => ({ jobs: state.jobs, ready: true, loading: false, hasResult: true,
    canSearch: true, resumeSkillCount: 5, progress: { done: 3, total: 3 },
    states: { workday: {}, careers: {}, mncs: {} }, run: vi.fn(), builtAt: 1 }),
}));
vi.mock('@/hooks/useAutoSync', () => ({ useAutoSync: () => ({ lastSyncedAt: 1, sync: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ apiService: {
  getSavedJobs: vi.fn(async () => ({ data: { jobs: [] } })),
  getJobFilters: vi.fn(async () => ({ data: { filters: {} } })),
} }));
vi.mock('@/components/job-search/JobCard', () => ({
  JOB_FEED_GRID_CLASS: '', JOB_CARD_CLASS: '', ApplyConfirmDialog: () => null,
  JobCard: ({ job }: { job: { job_id: string } }) => <div data-testid="job-card">{job.job_id}</div>,
}));
vi.mock('@/components/CompanyLogo', () => ({ CompanyLogo: () => null }));
vi.mock('@/components/job-search/JobFitDetails', () => ({ WhyThisScoreButton: () => null }));

let feed: ReturnType<typeof useCombinedJobsCtx>;
function Board() {
  feed = useCombinedJobsCtx();
  const actions = useJobSearch();
  return <CombinedJobsPanel {...actions} />;
}

const rows = (n: number, daysAgo: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => ({
    job_id: `${prefix}${i}`, title: `Role ${prefix}${i}`, company: `Company ${prefix}${i}`,
    seniority: 'entry', days_ago: daysAgo, match_score: 80,
    apply_link: `https://example.com/jobs/${prefix}${i}`,
  } as WorkdayJob));

function mount() {
  return render(<QueryClientProvider client={new QueryClient()}>
    <MemoryRouter><CombinedJobsProvider><Board /></CombinedJobsProvider></MemoryRouter>
  </QueryClientProvider>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test('a thin Today still opens on Today, with no widening notice', async () => {
  state.jobs = [...rows(4, 0, 't'), ...rows(30, 2, 'w')];
  mount();
  await new Promise((r) => setTimeout(r, 50));
  expect(feed.recency).toBe('today');
  expect(screen.queryByText(/Few roles were posted today/)).not.toBeInTheDocument();
  expect(screen.getAllByTestId('job-card')).toHaveLength(4);
});

test('an empty Today stays on Today', async () => {
  state.jobs = rows(30, 2, 'w');
  mount();
  await new Promise((r) => setTimeout(r, 50));
  expect(feed.recency).toBe('today');
});
