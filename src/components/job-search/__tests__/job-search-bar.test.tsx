/**
 * The Jobs search bar: every control that decides what is on the board, as a
 * labelled segment that is always on screen.
 *
 * What it replaced was a "Job feed" drawer. The sponsorship filter lived only
 * in that drawer and was ON by default, so the board was being filtered by a
 * setting nobody could see. These tests pin the opposite: the state of every
 * filter is readable without opening anything, each editor says what its
 * choices do in plain words, and changing what is searched runs the search
 * exactly once.
 */
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { CombinedJobsProvider, useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { JobSearchBar } from '@/components/job-search/JobSearchBar';
import { FIT_BANDS } from '@/components/job-search/fitBands';
import type { WorkdayJob } from '@/types/jobs';

const state = vi.hoisted(() => ({
  jobs: [] as unknown[],
  titles: ['Data Analyst', 'Product Analyst'],
  titlesPending: false,
  sync: vi.fn(),
  // One object for the whole file: the provider re-reads the default levels
  // whenever this identity changes.
  experienceView: { levels: ['entry', 'mid'], source: 'resume', years: 2 },
}));

vi.mock('@/hooks/useJobTitles', () => ({
  JOB_TITLES_CAP: 40,
  useJobTitles: () => ({
    experienceView: state.experienceView,
    reviewTitles: [], resolveReview: vi.fn(),
    resumeSync: null, undoResumeSync: vi.fn(), syncRevision: 0,
  }),
}));
vi.mock('@/hooks/useCombinedJobs', () => ({
  loadCombinedPrefs: () => ({}), saveCombinedPrefs: vi.fn(),
  useCombinedJobs: () => ({
    jobs: state.jobs, ready: true, loading: false, hasResult: true, canSearch: true,
    titles: state.titles, setTitles: vi.fn(), resumeTitles: [], lastScanTitles: state.titles,
    titlesPending: state.titlesPending, smartSuggestTitles: vi.fn(), suggestingTitles: false,
    resumeSkillCount: 5, progress: { done: 3, total: 3 },
    states: { workday: {}, careers: {}, mncs: {} }, run: vi.fn(), builtAt: 1, seenThrough: null,
  }),
}));
vi.mock('@/hooks/useAutoSync', () => ({ useAutoSync: () => ({ lastSyncedAt: 1, sync: state.sync }) }));
vi.mock('@/lib/api', () => ({ apiService: {
  getSavedJobs: vi.fn(async () => ({ data: { jobs: [] } })),
} }));

const row = (id: string, over: Partial<WorkdayJob> = {}) => ({
  job_id: id, title: `Role ${id}`, company: `Company ${id}`, tenant: `t-${id}`, seniority: 'entry',
  days_ago: 0, match_score: 85, score_version: 'fit-v2.9',
  apply_link: `https://example.com/jobs/${id}`, ...over,
} as WorkdayJob);

let feed: ReturnType<typeof useCombinedJobsCtx>;
function Probe() {
  feed = useCombinedJobsCtx();
  return null;
}

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <CombinedJobsProvider>
          <Probe />
          <JobSearchBar />
        </CombinedJobsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const bar = () => screen.getByRole('group', { name: /your job search/i });

beforeEach(() => {
  window.localStorage.clear();
  state.sync.mockClear();
  state.titles = ['Data Analyst', 'Product Analyst'];
  state.titlesPending = false;
  state.jobs = [
    row('likely', { sponsorship: 'likely' }),
    row('refused', { sponsorship: 'refused' }),
    row('unknown', { sponsorship: 'unknown', match_score: 55 }),
  ];
});

describe('the bar states the search without opening anything', () => {
  test('each segment shows its question and its current answer', async () => {
    mount();
    await waitFor(() => expect(feed.seniorityLevels).toEqual(['entry', 'mid']));

    const segment = (name: RegExp) => within(bar()).getByRole('button', { name });
    expect(segment(/^Roles: Data Analyst, Product Analyst$/)).toHaveTextContent('Data Analyst +1');
    expect(segment(/^Where: United States$/)).toHaveTextContent('United States');
    expect(segment(/^Experience level: Entry \+ Mid$/)).toHaveTextContent('Entry + Mid');
    expect(segment(/^Visa sponsorship: Skip no-visa jobs$/)).toHaveTextContent('Skip no-visa jobs');
    expect(segment(/^Filter by company$/)).toHaveTextContent('All companies');
    expect(segment(/^Match: Any match$/)).toHaveTextContent('Any match');
  });

  test('the default sponsorship filter is visible, and says what it hides', async () => {
    const user = userEvent.setup();
    mount();
    // On by default: the posting that refuses sponsorship is already hidden.
    await waitFor(() => expect(feed.visibleJobs.map((j) => j.job_id)).toEqual(['likely', 'unknown']));

    await user.click(within(bar()).getByRole('button', { name: /^Visa sponsorship/ }));
    expect(screen.getByText('Need visa sponsorship?')).toBeInTheDocument();
    const chosen = screen.getByRole('radio', { name: /skip jobs that won't sponsor/i });
    expect(chosen).toBeChecked();
    expect(chosen).toHaveTextContent('hides 1');
    // The promise never made: a record is not a guarantee.
    expect(screen.getByText(/a track record, not a promise/i)).toBeInTheDocument();
  });
});

describe('filters apply as they are chosen', () => {
  test('visa: each choice changes the board and the segment at once', async () => {
    const user = userEvent.setup();
    mount();
    await waitFor(() => expect(feed.visibleJobs).toHaveLength(2));

    await user.click(within(bar()).getByRole('button', { name: /^Visa sponsorship/ }));
    await user.click(screen.getByRole('radio', { name: /only known sponsors/i }));
    expect(feed.sponsorFilter).toBe('proven');
    expect(feed.visibleJobs.map((j) => j.job_id)).toEqual(['likely']);
    expect(within(bar()).getByRole('button', { name: 'Visa sponsorship: Known sponsors' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /^all jobs/i }));
    expect(feed.sponsorFilter).toBe('all');
    expect(feed.visibleJobs).toHaveLength(3);
    // Filters never start a new search of employer sites.
    expect(state.sync).not.toHaveBeenCalled();
  });

  test('match: the choices are the scoring bands printed on the cards', async () => {
    const user = userEvent.setup();
    mount();
    await waitFor(() => expect(feed.visibleJobs).toHaveLength(2));
    const good = FIT_BANDS.find((b) => b.key === 'good')!.min;

    await user.click(within(bar()).getByRole('button', { name: /^Match:/ }));
    await user.click(screen.getByRole('radio', { name: /good match or better/i }));
    expect(feed.minScore).toBe(good);
    // The 55 is a possible match: below the bar just set.
    expect(feed.visibleJobs.map((j) => j.job_id)).toEqual(['likely']);
    expect(within(bar()).getByRole('button', { name: 'Match: Good or better' })).toBeInTheDocument();
  });

  test('Reset appears only when a filter moved, and puts every filter back', async () => {
    const user = userEvent.setup();
    mount();
    await waitFor(() => expect(feed.visibleJobs).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();

    act(() => {
      feed.setSponsorFilter('all');
      feed.setMinScore(80);
      feed.setSeniorityLevels(['senior']);
    });
    await user.click(await screen.findByRole('button', { name: 'Reset' }));

    expect(feed.sponsorFilter).toBe('friendly');
    expect(feed.minScore).toBe(0);
    expect(feed.seniorityLevels).toEqual(['entry', 'mid']);
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
  });
});

describe('changing what is searched runs the search exactly once', () => {
  test('closing Where after a change the server reads searches once; closing it unchanged does not', async () => {
    const user = userEvent.setup();
    mount();
    await waitFor(() => expect(feed.visibleJobs).toHaveLength(2));

    // Opened and closed without a change: nothing to search for.
    await user.click(within(bar()).getByRole('button', { name: /^Where:/ }));
    await user.keyboard('{Escape}');
    expect(state.sync).not.toHaveBeenCalled();

    // Remote-only is asked of the server, so it needs a search: the stored
    // board for those settings first (not forced).
    await user.click(within(bar()).getByRole('button', { name: /^Where:/ }));
    await user.click(screen.getByRole('switch', { name: /remote jobs only/i }));
    expect(within(bar()).getByRole('button', { name: 'Where: Remote · United States' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(state.sync).toHaveBeenCalledTimes(1);
    expect(state.sync).toHaveBeenCalledWith(false);

    // Reopened and closed with nothing new: no second search.
    await user.click(within(bar()).getByRole('button', { name: /^Where:/ }));
    await user.keyboard('{Escape}');
    expect(state.sync).toHaveBeenCalledTimes(1);
  });

  test('a city filters the board at once and never starts a search', async () => {
    const user = userEvent.setup();
    mount();
    await waitFor(() => expect(feed.visibleJobs).toHaveLength(2));

    await user.click(within(bar()).getByRole('button', { name: /^Where:/ }));
    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Austin');
    await user.keyboard('{Escape}');
    expect(within(bar()).getByRole('button', { name: /^Where: Austin/ })).toBeInTheDocument();
    expect(state.sync).not.toHaveBeenCalled();
  });

  test('titles changed but not searched are flagged, and closing the editor searches', async () => {
    state.titlesPending = true;
    const user = userEvent.setup();
    mount();
    await waitFor(() => expect(feed.visibleJobs).toHaveLength(2));

    await user.click(within(bar()).getByRole('button', { name: /^Roles:/ }));
    expect(screen.getByText('Titles changed. Press Search to apply them.')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    expect(state.sync).toHaveBeenCalledTimes(1);
    expect(state.sync).toHaveBeenCalledWith(true);
  });
});
