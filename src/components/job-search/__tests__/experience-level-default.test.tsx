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
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { resetJobTitlesStore } from '@/hooks/useJobTitles';
import {
  CombinedJobsProvider,
  useCombinedJobsCtx,
} from '@/components/job-search/CombinedJobsProvider';
import { levelNote, matchesSeniorityLevels, seniorityOf } from '@/lib/careerJobs';
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
    <CombinedJobsProvider>
      <Probe />
    </CombinedJobsProvider>,
  );
}

const levelsShown = () => screen.getByTestId('levels').textContent;

beforeEach(() => {
  vi.clearAllMocks();
  resetJobTitlesStore();
  window.localStorage.clear();
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

  test('principal postings belong to Senior+, not to mid', () => {
    expect(matchesSeniorityLevels(job({ seniority: 'principal' }), ['mid'])).toBe(false);
    expect(matchesSeniorityLevels(job({ seniority: 'principal' }), ['senior'])).toBe(true);
  });

  test('several levels at once, and [] is every level', () => {
    expect(matchesSeniorityLevels(job({ seniority: 'entry' }), ['entry', 'mid'])).toBe(true);
    expect(matchesSeniorityLevels(job({ seniority: 'senior' }), ['entry', 'mid'])).toBe(false);
    expect(matchesSeniorityLevels(job({ seniority: 'senior' }), [])).toBe(true);
    expect(matchesSeniorityLevels(job({ seniority: 'unknown' }), ['entry'])).toBe(true);
  });
});

describe('the note says why', () => {
  test('explains a default from both inputs', () => {
    expect(levelNote(['entry', 'mid'], JUNIOR_3Y)).toBe(
      'Matched to your level (Junior) and 3 yrs on your resume. Roles that state no level are always shown.',
    );
  });

  test('a manual choice and "all" read differently', () => {
    expect(levelNote(['senior'], JUNIOR_3Y)).toMatch(/^Your selection\./);
    expect(levelNote([], JUNIOR_3Y)).toBe('Showing every level.');
  });
});
