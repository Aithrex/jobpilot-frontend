import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import { CombinedJobsProvider } from '@/components/job-search/CombinedJobsProvider';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { JobsRefineBar } from '@/components/job-search/JobsRefineBar';
import { useJobSearch } from '@/hooks/useJobSearch';
import { BOARD_IMPRESSIONS_KEY, PASSED_OVER_VISITS } from '@/lib/boardImpressions';
import type { WorkdayJob } from '@/types/jobs';

/**
 * "The best job is not missed, the unmatched not appeared": the For-you board
 * folds weak matches behind one quiet line, marks what is new since the last
 * visit, and moves cards the user keeps passing down their band.
 */
const state = vi.hoisted(() => ({ jobs: [] as WorkdayJob[], seenThrough: null as string | null }));
vi.mock('@/hooks/useJobTitles', () => ({ useJobTitles: () => ({
  experienceView: null, reviewTitles: [], resolveReview: vi.fn(),
  resumeSync: null, undoResumeSync: vi.fn(), syncRevision: 0,
}) }));
vi.mock('@/hooks/useCombinedJobs', () => ({
  loadCombinedPrefs: () => ({}), saveCombinedPrefs: vi.fn(),
  useCombinedJobs: () => ({ jobs: state.jobs, ready: true, loading: false, hasResult: true,
    canSearch: true, resumeSkillCount: 5, progress: { done: 3, total: 3 },
    states: { workday: {}, careers: {}, mncs: {} }, run: vi.fn(), builtAt: 1,
    seenThrough: state.seenThrough }),
}));
vi.mock('@/hooks/useAutoSync', () => ({ useAutoSync: () => ({ lastSyncedAt: 1, sync: vi.fn() }) }));
vi.mock('@/lib/api', () => ({ apiService: {
  getSavedJobs: vi.fn(async () => ({ data: { jobs: [] } })),
  getJobFilters: vi.fn(async () => ({ data: { filters: {} } })),
  saveJob: vi.fn(async (job: { job_id: string }) => ({ data: { job: { job_id: job.job_id, status: 'saved' } } })),
} }));
vi.mock('@/components/job-search/JobCard', () => ({
  JOB_FEED_GRID_CLASS: '', JOB_CARD_CLASS: '', ApplyConfirmDialog: () => null,
  JobCard: ({ job, isNew, onSave }: { job: { job_id: string }; isNew?: boolean; onSave: () => void }) => (
    <div data-testid="job-card" data-new={isNew ? 'yes' : 'no'}>
      {job.job_id}
      <button type="button" onClick={onSave}>Save {job.job_id}</button>
    </div>
  ),
}));
vi.mock('@/components/CompanyLogo', () => ({ CompanyLogo: () => null }));
vi.mock('@/components/job-search/JobFitDetails', () => ({ WhyThisScoreButton: () => null }));

function Board() {
  const actions = useJobSearch();
  return <><JobsRefineBar /><CombinedJobsPanel {...actions} /></>;
}

const row = (id: string, over: Partial<WorkdayJob> = {}) => ({
  job_id: id, title: `Role ${id}`, company: `Company ${id}`, tenant: `t-${id}`, seniority: 'entry',
  days_ago: 0, match_score: 85, score_version: 'fit-v2.9',
  apply_link: `https://example.com/jobs/${id}`, ...over,
} as WorkdayJob);
const strong = (count: number) => Array.from({ length: count }, (_, i) => row(`s${i}`));
const cardIds = () => screen.queryAllByTestId('job-card').map((el) => el.firstChild?.textContent);

function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><CombinedJobsProvider><Board /></CombinedJobsProvider></MemoryRouter>
  </QueryClientProvider>);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  state.seenThrough = null;
  state.jobs = [];
});

test('weaker matches are hidden behind one line, and the choice is remembered', async () => {
  state.jobs = [...strong(20), row('weak', { match_score: 40 }), row('unlikely', { match_score: 10 })];
  const view = mount();
  await waitFor(() => expect(screen.getByTestId('jobs-weaker-matches')).toHaveTextContent('2 weaker matches hidden.'));
  expect(cardIds()).not.toContain('weak');
  expect(screen.getByRole('radio', { name: /^Today 20$/ })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Show them' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: /^Today 22$/ })).toBeInTheDocument());
  expect(screen.getByTestId('jobs-weaker-matches')).toHaveTextContent('Showing 2 weaker matches.');
  expect(localStorage.getItem('aspirely.board.showWeaker.v1')).toBe('1');

  view.unmount();
  mount();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Hide them' })).toBeInTheDocument());
});

test('no line when nothing is folded', async () => {
  state.jobs = strong(3);
  mount();
  await waitFor(() => expect(screen.getAllByTestId('job-card')).toHaveLength(3));
  expect(screen.queryByTestId('jobs-weaker-matches')).not.toBeInTheDocument();
});

test('New (N) marks and filters cards first seen since the last visit', async () => {
  state.seenThrough = '2026-11-03T12:00:00Z';
  state.jobs = [
    row('fresh', { first_seen_at: '2026-11-03T18:00:00Z' }),
    row('known', { first_seen_at: '2026-11-01T18:00:00Z' }),
    row('dateless'),
  ];
  mount();
  const chip = await screen.findByRole('button', { name: /^New \(1\)$/ });
  expect(screen.getAllByTestId('job-card').filter((el) => el.dataset.new === 'yes')).toHaveLength(1);
  await userEvent.click(chip);
  await waitFor(() => expect(cardIds()).toEqual(['fresh']));
  expect(screen.getByRole('button', { name: /^New \(1\)$/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('radio', { name: /^Today 1$/ })).toBeInTheDocument();
});

test('no previous visit known: no New chip and no badges', async () => {
  state.jobs = [row('fresh', { first_seen_at: '2026-11-03T18:00:00Z' })];
  mount();
  await waitFor(() => expect(screen.getAllByTestId('job-card')).toHaveLength(1));
  expect(screen.queryByRole('button', { name: /^New/ })).not.toBeInTheDocument();
  expect(screen.getByTestId('job-card').dataset.new).toBe('no');
});

test('the first page is counted once per visit, and an action clears the card', async () => {
  state.jobs = strong(3);
  mount();
  await waitFor(() => expect(localStorage.getItem(BOARD_IMPRESSIONS_KEY)).not.toBeNull());
  const stored = JSON.parse(localStorage.getItem(BOARD_IMPRESSIONS_KEY)!);
  expect(Object.keys(stored).sort()).toEqual(['s0', 's1', 's2']);
  expect(stored.s0.n).toBe(1);

  await userEvent.click(screen.getByRole('button', { name: 'Save s1' }));
  const after = JSON.parse(localStorage.getItem(BOARD_IMPRESSIONS_KEY)!);
  expect(after.s1).toBeUndefined();
  expect(after.s0.n).toBe(1);
});

test('a strong card passed over on earlier visits sits after the other strong cards, above good ones', async () => {
  localStorage.setItem(BOARD_IMPRESSIONS_KEY, JSON.stringify({
    passed: { n: PASSED_OVER_VISITS, t: Date.now() },
  }));
  state.jobs = [
    row('passed', { match_score: 95 }),
    row('strong', { match_score: 81 }),
    row('good', { match_score: 70 }),
  ];
  mount();
  await waitFor(() => expect(cardIds()).toEqual(['strong', 'passed', 'good']));
});
