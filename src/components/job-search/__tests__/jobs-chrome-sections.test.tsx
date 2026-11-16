/**
 * Jobs chrome is section-aware.
 *
 * For you carries the search bar: every control that decides what is on the
 * board (roles, place, experience, visa, company, match), each one a labelled
 * segment that is always on screen. It replaced a "Job feed" button that hid
 * half of them in a drawer.
 *
 * Saved and Applied are lists of the user's own roles. The board's search and
 * filters do not apply to them, so they are not shown there.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { resetJobTitlesStore } from '@/hooks/useJobTitles';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CombinedJobsProvider } from '@/components/job-search/CombinedJobsProvider';
import DiscoverPage from '@/app-shell/pages/DiscoverPage';

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

function renderDiscover(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <TooltipProvider>
          <CombinedJobsProvider>
            <Routes>
              <Route path="/app/jobs" element={<DiscoverPage />}>
                <Route path="for-you" element={<div data-testid="outlet-for-you" />} />
                <Route path="portals" element={<div data-testid="outlet-portals" />} />
                <Route path="saved" element={<div data-testid="outlet-saved" />} />
              </Route>
            </Routes>
          </CombinedJobsProvider>
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DiscoverPage section-aware Jobs chrome', () => {
  beforeEach(() => {
    resetJobTitlesStore();
    window.localStorage.clear();
    api.getTitleSeed.mockResolvedValue({
      data: {
        fingerprint: 'fp-chrome',
        resume_titles: ['Backend Engineer'],
        synth_titles: [],
        resume_count: 1,
        cached: true,
      },
      status: 200,
    });
    api.getResume.mockResolvedValue({ data: { target_titles: ['Backend Engineer'] }, status: 200 });
    api.suggestPipelineFilters.mockResolvedValue({ data: { titles: [] }, status: 200 });
    for (const fn of ['searchWorkdayJobs', 'searchCareerPagesJobs', 'searchMncJobs'] as const) {
      api[fn].mockResolvedValue(okScan());
    }
    for (const fn of ['getWorkdayCatalog', 'getCareerPagesCatalog', 'getMncCatalog'] as const) {
      api[fn].mockResolvedValue({ data: { total: 0, industries: [] }, status: 200 });
    }
    api.getSavedJobs.mockResolvedValue({ data: { jobs: [] }, status: 200 });
  });

  test('For you shows every search control as a labelled segment, and the title filter', () => {
    renderDiscover('/app/jobs/for-you');
    const bar = screen.getByRole('group', { name: /your job search/i });
    // The question each segment answers is its visible label.
    for (const label of ['Roles', 'Where', 'Experience', 'Visa', 'Company', 'Match']) {
      expect(within(bar).getByText(label)).toBeInTheDocument();
    }
    // The sponsorship filter is on by default; it must be visible, not buried.
    expect(within(bar).getByRole('button', { name: /visa sponsorship: sponsor-friendly/i })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /where: united states/i })).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: /match: any match/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filter jobs by title or company/i)).toBeInTheDocument();
    // The drawer with the vague name is gone.
    expect(screen.queryByRole('button', { name: /^job feed$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/scan one catalog at a time/i)).not.toBeInTheDocument();
  });

  test('a phone gets one summary button that opens every editor', () => {
    renderDiscover('/app/jobs/for-you');
    expect(
      screen.getByRole('button', { name: /edit your job search and filters/i }),
    ).toHaveAttribute('aria-controls', 'job-feed-sheet');
  });

  test('Career Portals hides the search bar and combined search', () => {
    renderDiscover('/app/jobs/portals');
    expect(screen.queryByRole('group', { name: /your job search/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/filter jobs by title or company/i)).not.toBeInTheDocument();
    expect(screen.getByText(/scan one catalog at a time/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see merged feed/i })).toHaveAttribute(
      'href',
      '/app/jobs/for-you',
    );
  });

  test('Saved shows the tabs but not the board search, which does not apply to it', () => {
    renderDiscover('/app/jobs/saved');
    expect(screen.getByRole('navigation', { name: /jobs sections/i })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /your job search/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/filter jobs by title or company/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scan one catalog at a time/i)).not.toBeInTheDocument();
  });

  test('Saved and Applied pills count only what needs action', async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
    api.getSavedJobs.mockResolvedValue({
      data: {
        jobs: [
          { job_id: 'a', status: 'interested', next_step: { posting_state: 'open' } },
          { job_id: 'b', status: 'interested', next_step: { posting_state: 'closed' } },
          { job_id: 'c', status: 'applied', next_step: { posting_state: 'open', applied_at: tenDaysAgo } },
          { job_id: 'd', status: 'applied', next_step: { posting_state: 'open', applied_at: new Date().toISOString() } },
        ],
      },
      status: 200,
    });
    renderDiscover('/app/jobs/for-you');
    // Saved: the open one only - a closed posting is not something to apply to.
    expect(await screen.findByTestId('subnav-badge-saved')).toHaveTextContent('1to apply');
    // Applied: the application with no update for 10 days is a follow-up.
    expect(screen.getByTestId('subnav-badge-applied')).toHaveTextContent('1follow-up');
    expect(screen.queryByText('99+')).not.toBeInTheDocument();
  });

  test('a tab with nothing to act on shows no number', async () => {
    api.getSavedJobs.mockResolvedValue({
      data: { jobs: [{ job_id: 'c', status: 'applied', next_step: { posting_state: 'open' } }] },
      status: 200,
    });
    renderDiscover('/app/jobs/for-you');
    await screen.findByRole('link', { name: /Applied/ });
    expect(screen.queryByTestId('subnav-badge-applied')).not.toBeInTheDocument();
    expect(screen.queryByTestId('subnav-badge-saved')).not.toBeInTheDocument();
  });
});
