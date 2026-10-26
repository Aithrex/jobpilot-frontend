import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CombinedJobsProvider, useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { JobsRefineBar } from '@/components/job-search/JobsRefineBar';
import { TopMatchesPanel } from '@/app-shell/pages/today/TopMatchesPanel';
import { useJobSearch } from '@/hooks/useJobSearch';
import { JOB_FEED_PAGE_SIZE, toJob } from '@/lib/careerJobs';
import type { WorkdayJob } from '@/types/jobs';

const state = vi.hoisted(() => ({ jobs: [] as WorkdayJob[], saved: [] as unknown[] }));
const view = vi.hoisted(() => ({ levels: ['entry', 'mid'], source: 'preference', years: 3, preference: 'Junior' }));
vi.mock('@/hooks/useJobTitles', () => ({ useJobTitles: () => ({ experienceView: view }) }));
vi.mock('@/hooks/useCombinedJobs', () => ({
  loadCombinedPrefs: () => ({}), saveCombinedPrefs: vi.fn(),
  useCombinedJobs: () => ({ jobs: state.jobs, ready: true, loading: false, hasResult: true,
    canSearch: true, resumeSkillCount: 5, progress: { done: 3, total: 3 },
    states: { workday: {}, careers: {}, mncs: {} }, run: vi.fn() }),
}));
vi.mock('@/hooks/useAutoSync', () => ({ useAutoSync: () => ({ lastSyncedAt: 1, sync: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ apiService: {
  getSavedJobs: vi.fn(async () => ({ data: { jobs: state.saved } })),
  getJobFilters: vi.fn(async () => ({ data: { filters: {} } })),
  touchJobPipeline: vi.fn(async (job, status) => {
    const saved = { job_id: job.job_id, job_data: job, status };
    state.saved = [...state.saved, saved];
    return { data: { job: saved } };
  }),
} }));
vi.mock('@/components/job-search/JobCard', () => ({
  JOB_FEED_GRID_CLASS: '', JOB_CARD_CLASS: '', ApplyConfirmDialog: () => null,
  JobCard: ({ job }: { job: { job_id: string; title: string } }) => <div data-testid="job-card" data-id={job.job_id}>{job.title}</div>,
}));
vi.mock('@/components/CompanyLogo', () => ({ CompanyLogo: () => null }));
vi.mock('@/components/job-search/JobFitDetails', () => ({ WhyThisScoreButton: () => null }));

let feed: ReturnType<typeof useCombinedJobsCtx>;
let actions: ReturnType<typeof useJobSearch>;
function Board() {
  feed = useCombinedJobsCtx();
  actions = useJobSearch();
  return <><JobsRefineBar /><CombinedJobsPanel {...actions} /></>;
}
const row = (id: string, over: Partial<WorkdayJob> = {}) => ({
  job_id: id, title: `Role ${id}`, company: `Company ${id}`, seniority: 'entry',
  days_ago: 0, match_score: 80, apply_link: `https://example.com/jobs/${id}`, ...over,
} as WorkdayJob);

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  state.saved = [];
  state.jobs = [row('1'), row('2'), row('3')];
});

function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><CombinedJobsProvider><Board /><TopMatchesPanel /></CombinedJobsProvider></MemoryRouter>
  </QueryClientProvider>);
}

function expectPopulation(size: number) {
  expect(screen.queryAllByTestId('job-card')).toHaveLength(size);
  expect(screen.getByRole('radio', { name: new RegExp(`^Today ${size}$`) })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Top matches' })).queryAllByRole('listitem')).toHaveLength(size);
}

test('cards, date count and Home change together after hiding and confirming an application', async () => {
  mount();
  await waitFor(() => expectPopulation(3));
  act(() => feed.hideJob('1', state.jobs[0].apply_link));
  await waitFor(() => expectPopulation(2));
  await act(async () => { await actions.confirmApplied('2', toJob(state.jobs[1], 'test')); });
  await waitFor(() => expectPopulation(1));
  act(() => feed.setShowApplied(true));
  await waitFor(() => expectPopulation(2));
});

test('a previously applied URL remains excluded when the feed gives it a new id', async () => {
  state.saved = [{ job_id: 'old-id', job_data: toJob(state.jobs[0], 'test'), status: 'applied' }];
  mount();
  await waitFor(() => expectPopulation(2));
  expect(screen.getAllByTestId('job-card').map((card) => card.getAttribute('data-id'))).toEqual(['2', '3']);
});

test('pagination distinguishes the visible page from the total matching population', async () => {
  state.jobs = Array.from({ length: JOB_FEED_PAGE_SIZE + 3 }, (_, index) => row(String(index)));
  mount();
  await waitFor(() => expect(screen.getAllByTestId('job-card')).toHaveLength(JOB_FEED_PAGE_SIZE));
  expect(screen.getByText(`Showing 1-${JOB_FEED_PAGE_SIZE} of ${state.jobs.length} matching roles`)).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: new RegExp(`^Today ${state.jobs.length}$`) })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Top matches' })).getAllByRole('listitem')).toHaveLength(5);
});

test('experience totals visibly include unspecified levels without dropping or reordering roles', async () => {
  const cohort = (level: string, count: number) => Array.from({ length: count }, (_, index) =>
    row(`${level}-${index}`, { seniority: level, days_ago: index === 0 ? 0 : 2 }));
  const selected = [...cohort('entry', 44), ...cohort('mid', 103), ...cohort('unknown', 60)];
  state.jobs = [...selected, ...cohort('senior', 7), row('older', { days_ago: 5 })];
  const user = userEvent.setup();
  mount();
  act(() => feed.setRecency('3d'));
  await waitFor(() => expect(feed.visibleJobs).toHaveLength(207));

  const equation = '207 roles = 44 Entry + 103 Mid + 60 no level stated';
  expect(screen.getByLabelText('Experience count breakdown')).toHaveTextContent(equation);
  expect(screen.getByRole('radio', { name: '3 days 207' })).toBeChecked();
  const expectedOrder = [...selected.filter((job) => job.days_ago === 0), ...selected.filter((job) => job.days_ago === 2)];
  expect(feed.visibleJobs.map((job) => job.job_id)).toEqual(expectedOrder.map((job) => job.job_id));
  expect(screen.getAllByTestId('job-card')).toHaveLength(JOB_FEED_PAGE_SIZE);
  expect(screen.getByText(`Showing 1-${JOB_FEED_PAGE_SIZE} of 207 matching roles`)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Experience level: Entry + Mid' }));
  expect(screen.getAllByLabelText('Experience count breakdown')).toHaveLength(2);
  expect(screen.getAllByLabelText('Experience count breakdown').every((item) => item.textContent === equation)).toBe(true);
  expect(screen.getByText('No level stated')).toBeInTheDocument();

  act(() => feed.setRecency('today'));
  await waitFor(() => expect(feed.visibleJobs).toHaveLength(3));
  expect(screen.getAllByLabelText('Experience count breakdown').every((item) =>
    item.textContent === '3 roles = 1 Entry + 1 Mid + 1 no level stated')).toBe(true);

  await user.click(screen.getByRole('button', { name: 'Show all levels' }));
  expect(feed.visibleJobs).toHaveLength(4);
  expect(screen.getAllByLabelText('Experience count breakdown').every((item) =>
    item.textContent === '4 roles across all levels, including 1 with no level stated')).toBe(true);
});
