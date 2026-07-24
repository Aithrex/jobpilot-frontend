/**
 * Combined-feed role titles - behavior tests for useCombinedJobs +
 * CombinedJobsProvider + CombinedJobsPanel + ChipsInput:
 * hydration (saved prefs vs resume seed vs LLM synth), editing (add/remove/
 * paste-dedup/cap-40/reset), persistence (combined_jobs_prefs_v1), and the
 * titles contract with all three scan endpoints.
 *
 * Only `apiService` is mocked; the hook, provider, panel and chips run real.
 * NOTE: useAutoSync fires ONE initial scan as soon as hydration completes  -
 * tests that assert call counts settle (and clear) that first scan.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { resetJobTitlesStore } from '@/hooks/useJobTitles';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CombinedJobsProvider } from '@/components/job-search/CombinedJobsProvider';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: {
    getResume: vi.fn(),
    suggestPipelineFilters: vi.fn(),
    searchWorkdayJobs: vi.fn(),
    searchCareerPagesJobs: vi.fn(),
    searchMncJobs: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

const PREFS_KEY = 'combined_jobs_prefs_v1';
const RESUME_TITLES = [
  'Backend Engineer',
  'Data Engineer',
  'Platform Engineer',
  'Site Reliability Engineer',
];

function okScan() {
  return {
    data: {
      jobs: [],
      tenants_done: 0,
      tenants_total: 0,
      tenants_with_results: 0,
      cache_hit: false,
    },
    status: 200,
  };
}

const SEARCH_FNS = ['searchWorkdayJobs', 'searchCareerPagesJobs', 'searchMncJobs'] as const;

function renderPanel() {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <CombinedJobsProvider>
          <CombinedJobsPanel
            isJobSaved={() => false}
            getJobStatus={() => null}
            saveJob={vi.fn()}
            unsaveJob={vi.fn()}
            quickApply={vi.fn()}
          />
        </CombinedJobsProvider>
      </TooltipProvider>
    </MemoryRouter>,
  );
}

/** Wait for the auto-fired initial scan to finish (lastSyncedAt stamped). */
async function settleInitialScan() {
  await screen.findByText(/Updated just now/);
}

async function openCustomize(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Customize' }));
}

function titlesInput() {
  return screen.getByPlaceholderText(/e\.g\. Backend Engineer/);
}

function savedPrefs(): { titles?: string[] } {
  return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // Titles now live in a module-level shared store (one source of truth for
  // Careers + Opportunities), so each test starts from a clean, unhydrated one.
  resetJobTitlesStore();
  api.getResume.mockResolvedValue({
    data: { resume: { job_titles: RESUME_TITLES } },
    status: 200,
  });
  api.suggestPipelineFilters.mockResolvedValue({
    data: { suggestions: { workday_titles: [] } },
    status: 200,
  });
  for (const fn of SEARCH_FNS) api[fn].mockResolvedValue(okScan());
});

describe('combined jobs role titles', () => {
  test('1. resume-derived titles appear in the compact summary', async () => {
    renderPanel();

    await screen.findByText(/Searching roles:/);
    expect(
      screen.getByText('Backend Engineer, Data Engineer, Platform Engineer'),
    ).toBeInTheDocument();
    expect(screen.getByText(/\+1/)).toBeInTheDocument();
    // Resume was the seed - no saved prefs, enough titles → no LLM synth.
    expect(api.getResume).toHaveBeenCalled();
    expect(api.suggestPipelineFilters).not.toHaveBeenCalled();
  });

  test('2. titles appear as chips inside Customize', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Searching roles:/);

    await openCustomize(user);
    for (const title of RESUME_TITLES) {
      expect(await screen.findByLabelText(`Remove ${title}`)).toBeInTheDocument();
    }
  });

  test('3. adding a title (type + Enter) and removing (chip X) works', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Searching roles:/);
    await openCustomize(user);
    await screen.findByLabelText('Remove Backend Engineer');

    await user.type(titlesInput(), 'Machine Learning Engineer{Enter}');
    expect(await screen.findByLabelText('Remove Machine Learning Engineer')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Remove Machine Learning Engineer'));
    await waitFor(() =>
      expect(screen.queryByLabelText('Remove Machine Learning Engineer')).not.toBeInTheDocument(),
    );

    // Removing an original chip works too.
    await user.click(screen.getByLabelText('Remove Data Engineer'));
    await waitFor(() =>
      expect(screen.queryByLabelText('Remove Data Engineer')).not.toBeInTheDocument(),
    );
  });

  test('4. pasting "Alpha, Beta, alpha" dedups case-insensitively', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Searching roles:/);
    await openCustomize(user);
    await screen.findByLabelText('Remove Backend Engineer');

    await user.click(titlesInput());
    await user.paste('Alpha, Beta, alpha');

    expect(await screen.findByLabelText('Remove Alpha')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Beta')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Remove Alpha')).toHaveLength(1);
    expect(screen.queryByLabelText('Remove alpha')).not.toBeInTheDocument();
  });

  test('5. the 40-title cap is enforced (39 + paste 3 → exactly 40)', async () => {
    const seed = Array.from({ length: 39 }, (_, i) => `Seed Title ${i + 1}`);
    localStorage.setItem(PREFS_KEY, JSON.stringify({ titles: seed }));

    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Searching roles:/);
    await openCustomize(user);
    await screen.findByLabelText('Remove Seed Title 1');

    await user.click(titlesInput());
    await user.paste('Extra One, Extra Two, Extra Three');

    expect(await screen.findByLabelText('Remove Extra One')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Extra Two')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Extra Three')).not.toBeInTheDocument();
    expect(screen.getByText('40 / 40')).toBeInTheDocument();
  });

  test('6. Reset restores the resume-derived titles', async () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ titles: ['Custom One', 'Custom Two'] }));

    const user = userEvent.setup();
    renderPanel();
    await screen.findByText(/Searching roles:/);
    await openCustomize(user);
    await screen.findByLabelText('Remove Custom One');

    // Reset only appears once resume titles (the Reset target) hydrated.
    await user.click(await screen.findByRole('button', { name: 'Reset' }));

    for (const title of RESUME_TITLES) {
      expect(await screen.findByLabelText(`Remove ${title}`)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText('Remove Custom One')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Custom Two')).not.toBeInTheDocument();
  });

  test('7. with <4 resume titles, LLM suggestions are fetched on hydrate and merged (deduped)', async () => {
    api.getResume.mockResolvedValue({
      data: { resume: { job_titles: ['Backend Engineer'] } },
      status: 200,
    });
    api.suggestPipelineFilters.mockResolvedValue({
      data: {
        suggestions: {
          workday_titles: ['Platform Engineer', 'backend engineer', 'Site Reliability Engineer'],
        },
      },
      status: 200,
    });

    const user = userEvent.setup();
    renderPanel();

    await waitFor(() => expect(api.suggestPipelineFilters).toHaveBeenCalledTimes(1));
    await openCustomize(user);
    expect(await screen.findByLabelText('Remove Backend Engineer')).toBeInTheDocument();
    expect(await screen.findByLabelText('Remove Platform Engineer')).toBeInTheDocument();
    expect(await screen.findByLabelText('Remove Site Reliability Engineer')).toBeInTheDocument();
    // Case-insensitive merge: the duplicate suggestion never becomes a chip.
    expect(screen.queryByLabelText('Remove backend engineer')).not.toBeInTheDocument();
  });

  test('8. saved titles survive remount and are not clobbered by resume titles', async () => {
    const user = userEvent.setup();
    const first = renderPanel();
    await screen.findByText(/Searching roles:/);
    await openCustomize(user);
    await screen.findByLabelText('Remove Backend Engineer');

    await user.type(titlesInput(), 'Custom Role X{Enter}');
    await screen.findByLabelText('Remove Custom Role X');
    await waitFor(() => expect(savedPrefs().titles).toContain('Custom Role X'));

    first.unmount();

    // The resume now claims something different - saved prefs must win.
    api.getResume.mockResolvedValue({
      data: { resume: { job_titles: ['Completely Different'] } },
      status: 200,
    });
    renderPanel();
    await screen.findByText(/Searching roles:/);
    await openCustomize(user);

    expect(await screen.findByLabelText('Remove Custom Role X')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Completely Different')).not.toBeInTheDocument();
  });

  test('9. Apply titles and sync sends the edited titles to all three scans', async () => {
    const user = userEvent.setup();
    renderPanel();
    await settleInitialScan();
    await openCustomize(user);
    await screen.findByLabelText('Remove Backend Engineer');

    await user.type(titlesInput(), 'Extra Title{Enter}');
    await screen.findByLabelText('Remove Extra Title');

    // Isolate the manual sync from the auto-fired initial scan.
    for (const fn of SEARCH_FNS) api[fn].mockClear();
    await user.click(screen.getByRole('button', { name: /Apply titles and sync/i }));

    const expected = [...RESUME_TITLES, 'Extra Title'];
    for (const fn of SEARCH_FNS) {
      await waitFor(() => expect(api[fn]).toHaveBeenCalledTimes(1));
      const params = api[fn].mock.calls[0][0];
      expect(params.titles).toEqual(expected);
      expect(params.force_refresh).toBe(true);
    }
  });

  test('10. editing titles after a scan shows the not-yet-applied indicator until re-sync', async () => {
    const user = userEvent.setup();
    renderPanel();
    await settleInitialScan();
    expect(screen.queryByText(/Title changes not yet applied/)).not.toBeInTheDocument();

    await openCustomize(user);
    await screen.findByLabelText('Remove Backend Engineer');
    await user.type(titlesInput(), 'Another Role{Enter}');

    expect(await screen.findByText(/Title changes not yet applied/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Apply titles and sync/i }));
    await waitFor(() =>
      expect(screen.queryByText(/Title changes not yet applied/)).not.toBeInTheDocument(),
    );
  });

  test('11. clearing all titles disables sync with guidance, and no scan fires', async () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ titles: ['Backend Engineer'] }));

    const user = userEvent.setup();
    renderPanel();
    await settleInitialScan();
    await openCustomize(user);
    await screen.findByLabelText('Remove Backend Engineer');

    for (const fn of SEARCH_FNS) api[fn].mockClear();
    await user.click(screen.getByLabelText('Remove Backend Engineer'));

    expect(await screen.findByText(/Add at least one role title/)).toBeInTheDocument();
    const applyBtn = screen.getByRole('button', { name: /Apply titles and sync/i });
    expect(applyBtn).toBeDisabled();
    await user.click(applyBtn); // disabled - must be a no-op
    for (const fn of SEARCH_FNS) expect(api[fn]).not.toHaveBeenCalled();
  });

  test('12. compact summary truncates visually but exposes the full list', async () => {
    renderPanel();
    await screen.findByText(/Searching roles:/);

    const summaryBtn = await screen.findByTitle(RESUME_TITLES.join(', '));
    expect(summaryBtn.tagName).toBe('BUTTON');
    // Full list is exposed via title attribute; the visible span truncates.
    expect(summaryBtn).toHaveAttribute('title', RESUME_TITLES.join(', '));
    const truncated = summaryBtn.querySelector('span.truncate');
    expect(truncated).not.toBeNull();
    expect(within(summaryBtn).getByText(/Searching roles:/)).toBeInTheDocument();
  });
});
