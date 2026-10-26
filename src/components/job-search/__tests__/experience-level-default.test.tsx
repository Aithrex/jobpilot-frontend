/**
 * The "For you" board opens on the candidate's OWN experience levels.
 *
 * It opened on every level until 2026-10-02, and every current user is
 * early-career: replaying their boards, a zero-year user's first screen held
 * an architect role and two executive ones. The levels come from the server
 * (`experience_view` on GET /api/jobs/title-seed); "All levels" is one tap
 * away and a deliberate choice is remembered - until the default it replaced
 * moves (a new resume, a changed onboarding level).
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { resetJobTitlesStore } from '@/hooks/useJobTitles';
import {
  CombinedJobsProvider,
  useCombinedJobsCtx,
} from '@/components/job-search/CombinedJobsProvider';
import { matchesSeniorityLevels, seniorityOf } from '@/lib/careerJobs';
import { ExperienceLevelPicker } from '@/components/job-search/ExperienceLevelPicker';
import userEvent from '@testing-library/user-event';
import type { ExperienceView, WorkdayJob } from '@/types/jobs';

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: {
    getTitleSeed: vi.fn(),
    getResume: vi.fn(),
    suggestPipelineFilters: vi.fn(),
    searchWorkdayJobs: vi.fn(),
    searchCareerPagesJobs: vi.fn(),
    searchMncJobs: vi.fn(),
    getSavedJobs: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

const JUNIOR_3Y: ExperienceView = {
  levels: ['entry', 'mid'],
  source: 'preference+resume',
  years: 3,
  preference: 'Junior',
};

function seed(view?: ExperienceView) {
  api.getTitleSeed.mockResolvedValue({
    data: {
      fingerprint: 'fp',
      resume_titles: ['Backend Engineer'],
      synth_titles: [],
      match_titles: ['Software Engineer'],
      resume_count: 1,
      cached: true,
      ...(view ? { experience_view: view } : {}),
    },
    status: 200,
  });
}

let ctx: ReturnType<typeof useCombinedJobsCtx>;
function Probe() {
  ctx = useCombinedJobsCtx();
  const { ensureStarted } = ctx;
  useEffect(() => ensureStarted(), [ensureStarted]);
  return <div data-testid="levels">{ctx.seniorityLevels.join(',') || 'ALL'}</div>;
}

function mount() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
    <CombinedJobsProvider>
      <Probe />
    </CombinedJobsProvider>
    </QueryClientProvider>,
  );
}

const levelsShown = () => screen.getByTestId('levels').textContent;

beforeEach(() => {
  vi.clearAllMocks();
  resetJobTitlesStore();
  window.localStorage.clear();
  api.getSavedJobs.mockResolvedValue({ data: { jobs: [] } });
  const empty = { data: { ok: true, jobs: [], total: 0, errors: [] }, status: 200 };
  for (const fn of ['searchWorkdayJobs', 'searchCareerPagesJobs', 'searchMncJobs']) {
    api[fn].mockResolvedValue(empty);
  }
});

describe("the board opens on the candidate's own levels", () => {
  test("the server's experience view is the default", async () => {
    seed(JUNIOR_3Y);
    mount();
    await waitFor(() => expect(levelsShown()).toBe('entry,mid'));
  });

  test('"All levels" is remembered across a reload', async () => {
    seed(JUNIOR_3Y);
    const first = mount();
    await waitFor(() => expect(levelsShown()).toBe('entry,mid'));
    act(() => ctx.setSeniorityLevels([]));
    expect(levelsShown()).toBe('ALL');
    first.unmount();

    resetJobTitlesStore();
    mount();
    await waitFor(() => expect(api.getTitleSeed).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(levelsShown()).toBe('ALL'));
  });

  test('a choice is dropped when the default it replaced moves', async () => {
    seed(JUNIOR_3Y);
    const first = mount();
    await waitFor(() => expect(levelsShown()).toBe('entry,mid'));
    act(() => ctx.setSeniorityLevels(['senior']));
    first.unmount();

    resetJobTitlesStore();
    seed({ ...JUNIOR_3Y, levels: ['mid', 'senior'], years: 4, preference: 'Mid-level' });
    mount();
    await waitFor(() => expect(levelsShown()).toBe('mid,senior'));
  });

  test('"My level" restores the default', async () => {
    seed(JUNIOR_3Y);
    mount();
    await waitFor(() => expect(levelsShown()).toBe('entry,mid'));
    act(() => ctx.setSeniorityLevels(['intern']));
    act(() => ctx.resetSeniorityLevels());
    expect(levelsShown()).toBe('entry,mid');
  });

  test('an older backend with no view shows every level, not an empty board', async () => {
    seed(undefined);
    mount();
    await waitFor(() => expect(api.getTitleSeed).toHaveBeenCalled());
    expect(levelsShown()).toBe('ALL');
  });
});

describe('level matching', () => {
  const job = (over: Partial<WorkdayJob>) =>
    ({ job_id: 'j', title: 'Software Engineer', company: 'Acme', ...over }) as WorkdayJob;

  test('rung two of a numbered ladder is mid, not entry', () => {
    expect(seniorityOf(job({ title: 'Software Engineer II' }))).toBe('mid');
    expect(seniorityOf(job({ title: 'Program Manager 2' }))).toBe('mid');
    expect(seniorityOf(job({ title: 'Software Engineer I' }))).toBe('entry');
  });

  test('principal postings belong to Staff+, not to mid or senior', () => {
    expect(matchesSeniorityLevels(job({ seniority: 'principal' }), ['mid'])).toBe(false);
    expect(matchesSeniorityLevels(job({ seniority: 'principal' }), ['mid', 'senior'])).toBe(false);
    expect(matchesSeniorityLevels(job({ seniority: 'principal' }), ['staff'])).toBe(true);
    expect(matchesSeniorityLevels(job({ seniority: 'senior' }), ['staff'])).toBe(false);
  });

  test('several levels at once, and [] is every level', () => {
    expect(matchesSeniorityLevels(job({ seniority: 'entry' }), ['entry', 'mid'])).toBe(true);
    expect(matchesSeniorityLevels(job({ seniority: 'senior' }), ['entry', 'mid'])).toBe(false);
    expect(matchesSeniorityLevels(job({ seniority: 'senior' }), [])).toBe(true);
    expect(matchesSeniorityLevels(job({ seniority: 'unknown' }), ['entry'])).toBe(true);
  });
});

describe('the experience control on the board', () => {
  function mountPicker() {
    return render(
      <QueryClientProvider client={new QueryClient()}>
      <CombinedJobsProvider>
        <Probe />
        <ExperienceLevelPicker />
      </CombinedJobsProvider>
      </QueryClientProvider>,
    );
  }

  test('says what is applied and that it is the candidate\'s own level', async () => {
    seed(JUNIOR_3Y);
    mountPicker();
    const trigger = await screen.findByRole('button', { name: /Experience level: Entry \+ Mid/ });
    expect(trigger).toHaveTextContent('Your level');
  });

  test('each level says what it means, and the candidate\'s level is one tap away', async () => {
    seed(JUNIOR_3Y);
    const user = userEvent.setup();
    mountPicker();
    await user.click(await screen.findByRole('button', { name: /Experience level: Entry \+ Mid/ }));
    expect(screen.getByText('Matched to you: Entry + Mid')).toBeInTheDocument();
    expect(screen.getByText('Junior - 3 yrs on your resume')).toBeInTheDocument();
    expect(screen.getByText('0-2 years')).toBeInTheDocument();
    expect(screen.getByText('8+ years, leads, managers')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Entry level/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Senior/ })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Show all levels' }));
    expect(levelsShown()).toBe('ALL');
    expect(screen.getByText('Showing every level.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Use my level' }));
    expect(levelsShown()).toBe('entry,mid');
  });

  test('ticking a level adds it', async () => {
    seed(JUNIOR_3Y);
    const user = userEvent.setup();
    mountPicker();
    await user.click(await screen.findByRole('button', { name: /Experience level/ }));
    await user.click(screen.getByRole('checkbox', { name: /Internship/ }));
    expect(levelsShown()).toBe('intern,entry,mid');
  });
});
