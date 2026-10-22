/**
 * The shared job-title set (`useJobTitles`) is ONE source of truth for the
 * Career-portal panels (Live listings Customize) and the For-you Job feed.
 *
 * These tests cover the contract that used to be four independent stores:
 *  - editing titles in one surface is visible in the other, with no reload
 *  - a saved, user-edited set is never clobbered by a later resume fetch
 *  - the 40-title cap and the thin-resume (< 4) auto-suggest path survive
 *  - the resume seed + LLM synth fire ONCE even when both surfaces mount
 *  - the titles are editable from Job feed (For you) and Live listings Customize
 *
 * Only `apiService` is mocked; the store, hooks, providers and panels run real.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { resetJobTitlesStore } from '@/hooks/useJobTitles';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  CombinedJobsProvider,
  useCombinedJobsCtx,
} from '@/components/job-search/CombinedJobsProvider';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { JobFeedSheet } from '@/components/job-search/JobFeedSheet';
import { WorkdayJobsPanel } from '@/components/job-search/WorkdayJobsPanel';

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: {
    getTitleSeed: vi.fn(),
    getResume: vi.fn(),
    suggestPipelineFilters: vi.fn(),
    searchWorkdayJobs: vi.fn(),
    searchCareerPagesJobs: vi.fn(),
    searchMncJobs: vi.fn(),
    getWorkdayCatalog: vi.fn(),
    getCareerPagesCatalog: vi.fn(),
    getMncCatalog: vi.fn(),
    getSavedJobs: vi.fn(),
    getJobFilters: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

// Must track `useJobTitles.CACHE_KEY`. Bumped to v2 with the title
// canonicalization change, which abandons every v1 cache on purpose - see
// the comment on CACHE_KEY.
const SHARED_CACHE_KEY = 'combined_jobs_prefs_v2';
const SEED_FINGERPRINT = 'fp-resume-set-1';
const RESUME_TITLES = [
  'Backend Engineer',
  'Data Engineer',
  'Platform Engineer',
  'Site Reliability Engineer',
];

function okTitleSeed(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      fingerprint: SEED_FINGERPRINT,
      resume_titles: RESUME_TITLES,
      synth_titles: [],
      resume_count: 1,
      cached: true,
      ...overrides,
    },
    status: 200,
  };
}

/** A full (empty) scan payload - the Careers panel renders every field. */
function okScan() {
  return {
    data: {
      ok: true,
      generated_at: '',
      jobs: [],
      total: 0,
      window_counts: { today: 0, d1: 0, d3: 0, d7: 0, d30: 0 },
      query_terms: [],
      tenants_done: 0,
      tenants_total: 0,
      tenants_with_results: 0,
      industries_available: [],
      cache_hit: false,
      errors: [],
    },
    status: 200,
  };
}

const SEARCH_FNS = ['searchWorkdayJobs', 'searchCareerPagesJobs', 'searchMncJobs'] as const;
const CATALOG_FNS = ['getWorkdayCatalog', 'getCareerPagesCatalog', 'getMncCatalog'] as const;

const JOB_PROPS = {
  isJobSaved: () => false,
  getJobStatus: () => null,
  saveJob: vi.fn(),
  unsaveJob: vi.fn(),
  quickApply: vi.fn(),
};

/** Always-visible opener - CombinedJobsPanel only shows "Open Job feed" before
 *  the first scan finishes, which is too late for most of these tests. */
function JobFeedOpener() {
  const { setCustomizeOpen } = useCombinedJobsCtx();
  return (
    <button type="button" onClick={() => setCustomizeOpen(true)}>
      Open shared Job feed
    </button>
  );
}

/** For you (Job feed drawer) and Careers (Live listings Customize), side by side. */
function renderBothSurfaces() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <CombinedJobsProvider>
          <JobFeedOpener />
          <JobFeedSheet />
          <div data-testid="opportunities">
            <CombinedJobsPanel {...JOB_PROPS} />
          </div>
          <div data-testid="careers">
            <WorkdayJobsPanel {...JOB_PROPS} variant="workday" />
          </div>
        </CombinedJobsProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

const surface = (testId: string) => within(screen.getByTestId(testId));

async function openJobFeed(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /open shared job feed/i }));
  await screen.findByPlaceholderText('Backend Engineer');
}

async function closeJobFeed(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('{Escape}');
  await waitFor(() =>
    expect(screen.queryByPlaceholderText('Backend Engineer')).not.toBeInTheDocument(),
  );
}

async function openCareersCustomize(user: ReturnType<typeof userEvent.setup>) {
  await user.click(surface('careers').getByRole('button', { name: 'Customize' }));
  await screen.findByPlaceholderText(/e\.g\. Backend Engineer/);
}

async function closeCareersCustomize(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('{Escape}');
  await waitFor(() =>
    expect(screen.queryByPlaceholderText(/e\.g\. Backend Engineer/)).not.toBeInTheDocument(),
  );
}

function jobFeedTitlesInput() {
  return screen.getByPlaceholderText('Backend Engineer');
}

function careersTitlesInput() {
  return screen.getByPlaceholderText(/e\.g\. Backend Engineer/);
}

function cachedTitles(): string[] {
  return JSON.parse(localStorage.getItem(SHARED_CACHE_KEY) ?? '{}').titles ?? [];
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  resetJobTitlesStore();
  api.getTitleSeed.mockResolvedValue(okTitleSeed());
  api.getResume.mockResolvedValue({
    data: { resume: { job_titles: RESUME_TITLES } },
    status: 200,
  });
  api.suggestPipelineFilters.mockResolvedValue({
    data: { suggestions: { workday_titles: [] } },
    status: 200,
  });
  for (const fn of SEARCH_FNS) api[fn].mockResolvedValue(okScan());
  for (const fn of CATALOG_FNS) {
    api[fn].mockResolvedValue({ data: { total: 0, industries: [] }, status: 200 });
  }
  api.getSavedJobs.mockResolvedValue({ data: { jobs: [] }, status: 200 });
  api.getJobFilters.mockResolvedValue({ data: { filters: null }, status: 200 });
});

describe('shared job titles', () => {
  test('1. a title added in Job feed appears in Careers with no reload', async () => {
    const user = userEvent.setup();
    renderBothSurfaces();

    await openJobFeed(user);
    await user.type(jobFeedTitlesInput(), 'Machine Learning Engineer{Enter}');
    await closeJobFeed(user);

    await openCareersCustomize(user);
    expect(await screen.findByLabelText('Remove Machine Learning Engineer')).toBeInTheDocument();
  });

  test('2. a title removed in Careers disappears from Job feed with no reload', async () => {
    const user = userEvent.setup();
    renderBothSurfaces();

    await openCareersCustomize(user);
    await screen.findByLabelText('Remove Data Engineer');
    await user.click(screen.getByLabelText('Remove Data Engineer'));
    await closeCareersCustomize(user);

    await openJobFeed(user);
    await waitFor(() =>
      expect(screen.queryByLabelText('Remove Data Engineer')).not.toBeInTheDocument(),
    );
  });

  test('3. both surfaces mounting fires the title seed and the synth once', async () => {
    api.getTitleSeed.mockResolvedValue(
      okTitleSeed({ resume_titles: ['Backend Engineer'], resume_count: 1 }),
    );
    api.suggestPipelineFilters.mockResolvedValue({
      data: { suggestions: { workday_titles: ['Platform Engineer'] }, cached: false },
      status: 200,
    });

    renderBothSurfaces();

    await waitFor(() => expect(api.suggestPipelineFilters).toHaveBeenCalledTimes(1));
    expect(api.getTitleSeed).toHaveBeenCalledTimes(1);
    expect(api.getResume).not.toHaveBeenCalled();
  });

  test('4. a saved user-edited set is not clobbered when the fingerprint is unchanged', async () => {
    const user = userEvent.setup();
    const first = renderBothSurfaces();

    await openCareersCustomize(user);
    await screen.findByLabelText('Remove Backend Engineer');
    await user.type(careersTitlesInput(), 'Custom Role X{Enter}');
    await waitFor(() => expect(cachedTitles()).toContain('Custom Role X'));

    first.unmount();
    resetJobTitlesStore();

    api.getTitleSeed.mockResolvedValue(
      okTitleSeed({ resume_titles: ['Completely Different'] }),
    );
    renderBothSurfaces();

    await openJobFeed(user);
    expect(await screen.findByLabelText('Remove Custom Role X')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Completely Different')).not.toBeInTheDocument();
    expect(api.suggestPipelineFilters).not.toHaveBeenCalled();
  });

  test('4a. saved chips the server names as off-domain are dropped on load', async () => {
    // An electrical engineer's chips after the old "Suggest from resume":
    // software and IT-support titles saved alongside her own.
    localStorage.setItem(
      SHARED_CACHE_KEY,
      JSON.stringify({
        titles: ['Electrical Engineer', 'Software Development Engineer', 'IT Support Technician'],
        fingerprint: SEED_FINGERPRINT,
      }),
    );
    api.getTitleSeed.mockResolvedValue(
      okTitleSeed({
        resume_titles: ['Electrical Design Trainee'],
        match_titles: ['Electrical Engineer', 'Power Systems Engineer'],
        off_domain_titles: ['Software Development Engineer', 'IT Support Technician'],
      }),
    );
    const user = userEvent.setup();
    renderBothSurfaces();

    await openJobFeed(user);
    expect(await screen.findByLabelText('Remove Electrical Engineer')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Software Development Engineer')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove IT Support Technician')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(cachedTitles()).not.toContain('Software Development Engineer'),
    );
  });

  test('4b. a changed fingerprint merges new resume titles into the saved set', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      SHARED_CACHE_KEY,
      JSON.stringify({
        titles: ['Backend Engineer', 'Custom Role X'],
        fingerprint: SEED_FINGERPRINT,
      }),
    );

    api.getTitleSeed.mockResolvedValue(
      okTitleSeed({
        fingerprint: 'fp-after-upload',
        resume_titles: [
          'Backend Engineer',
          'Registered Nurse',
          'Data Engineer',
          'Clinical Nurse',
        ],
        resume_count: 3,
      }),
    );

    renderBothSurfaces();
    await openJobFeed(user);

    expect(await screen.findByLabelText('Remove Custom Role X')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Backend Engineer')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Registered Nurse')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Data Engineer')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Clinical Nurse')).toBeInTheDocument();
    expect(api.suggestPipelineFilters).not.toHaveBeenCalled();
  });

  test('5. the 40-title cap holds across surfaces (39 + paste 3 => exactly 40)', async () => {
    const seed = Array.from({ length: 39 }, (_, i) => `Seed Title ${i + 1}`);
    localStorage.setItem(
      SHARED_CACHE_KEY,
      JSON.stringify({ titles: seed, fingerprint: SEED_FINGERPRINT }),
    );

    const user = userEvent.setup();
    renderBothSurfaces();

    await openCareersCustomize(user);
    await screen.findByLabelText('Remove Seed Title 1');

    await user.click(careersTitlesInput());
    await user.paste('Extra One, Extra Two, Extra Three');

    expect(await screen.findByLabelText('Remove Extra One')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Extra Two')).not.toBeInTheDocument();
    expect(screen.getByText('40 / 40')).toBeInTheDocument();

    await closeCareersCustomize(user);
    await openJobFeed(user);
    expect((await screen.findAllByText('40 / 40')).length).toBeGreaterThanOrEqual(1);
  });

  test('6. a thin resume (< 4 titles) auto-suggests once and merges deduped', async () => {
    api.getTitleSeed.mockResolvedValue(
      okTitleSeed({ resume_titles: ['Backend Engineer'], synth_titles: [] }),
    );
    api.suggestPipelineFilters.mockResolvedValue({
      data: {
        suggestions: {
          workday_titles: ['Platform Engineer', 'backend engineer', 'Data Engineer'],
        },
        cached: false,
      },
      status: 200,
    });

    const user = userEvent.setup();
    renderBothSurfaces();

    await waitFor(() => expect(api.suggestPipelineFilters).toHaveBeenCalledTimes(1));
    await openCareersCustomize(user);

    expect(await screen.findByLabelText('Remove Backend Engineer')).toBeInTheDocument();
    expect(await screen.findByLabelText('Remove Platform Engineer')).toBeInTheDocument();
    expect(await screen.findByLabelText('Remove Data Engineer')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove backend engineer')).not.toBeInTheDocument();
  });

  test('7. a resume with 4+ titles does NOT auto-suggest', async () => {
    renderBothSurfaces();

    expect(await screen.findByRole('heading', { name: /live listings/i })).toBeInTheDocument();
    await waitFor(() => expect(api.getTitleSeed).toHaveBeenCalled());
    expect(api.suggestPipelineFilters).not.toHaveBeenCalled();
  });

  test('7b. cached synth_titles skip the suggest-filters call', async () => {
    api.getTitleSeed.mockResolvedValue(
      okTitleSeed({
        resume_titles: ['Backend Engineer'],
        synth_titles: ['Platform Engineer', 'Data Engineer'],
      }),
    );

    const user = userEvent.setup();
    renderBothSurfaces();
    await openCareersCustomize(user);

    expect(await screen.findByLabelText('Remove Backend Engineer')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Platform Engineer')).toBeInTheDocument();
    expect(api.suggestPipelineFilters).not.toHaveBeenCalled();
  });

  test('8. Job feed drawer shows shared titles and Career Portals note', async () => {
    const user = userEvent.setup();
    renderBothSurfaces();

    await openJobFeed(user);
    for (const title of RESUME_TITLES) {
      expect(await screen.findByLabelText(`Remove ${title}`)).toBeInTheDocument();
    }
    expect(screen.getByText(/titles are shared with career portals/i)).toBeInTheDocument();
  });

  test('9. Job feed is the For-you editor; Careers Customize sees the same set', async () => {
    const user = userEvent.setup();
    renderBothSurfaces();

    await openJobFeed(user);
    expect(await screen.findByLabelText('Remove Backend Engineer')).toBeInTheDocument();
    await user.type(jobFeedTitlesInput(), 'Staff Engineer{Enter}');
    await closeJobFeed(user);

    await openCareersCustomize(user);
    expect(await screen.findByLabelText('Remove Staff Engineer')).toBeInTheDocument();
  });
});
