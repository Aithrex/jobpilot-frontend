import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { CombinedJobsProvider, THIN_TODAY, useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { useJobSearch } from '@/hooks/useJobSearch';
import type { WorkdayJob } from '@/types/jobs';

/**
 * Employers barely post on weekends, so a board that opens on Today read as
 * "no jobs" every Saturday. Thin Today -> the last 3 days, said out loud, and
 * never over a window the user picked.
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

test('a thin Today opens on the last 3 days and says why', async () => {
  state.jobs = [...rows(4, 0, 't'), ...rows(30, 2, 'w')];
  mount();
  await waitFor(() => expect(feed.recency).toBe('3d'));
  expect(feed.recencyWidened).toBe(true);
  expect(screen.getByTestId('recency-widened')).toHaveTextContent('Few roles were posted today');
});

test('"Show today only" is the user\'s choice and sticks', async () => {
  state.jobs = [...rows(4, 0, 't'), ...rows(30, 2, 'w')];
  mount();
  await waitFor(() => expect(feed.recency).toBe('3d'));
  await userEvent.click(screen.getByRole('button', { name: 'Show today only' }));
  await waitFor(() => expect(feed.recency).toBe('today'));
  expect(feed.recencyWidened).toBe(false);
  expect(screen.queryByTestId('recency-widened')).not.toBeInTheDocument();
});

test('a full Today stays on Today', async () => {
  state.jobs = [...rows(THIN_TODAY, 0, 't'), ...rows(30, 2, 'w')];
  mount();
  await new Promise((r) => setTimeout(r, 50));
  expect(feed.recency).toBe('today');
  expect(feed.recencyWidened).toBe(false);
});

test('nothing more in 3 days than today: no pointless widening', async () => {
  state.jobs = rows(3, 0, 't');
  mount();
  await new Promise((r) => setTimeout(r, 50));
  expect(feed.recency).toBe('today');
});
