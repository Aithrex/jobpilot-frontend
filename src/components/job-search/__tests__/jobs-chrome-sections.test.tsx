/**
 * Jobs chrome is section-aware: For you keeps the merged Job feed drawer;
 * Career Portals keeps Live listings + Customize and must not mount Job feed.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { resetJobTitlesStore } from '@/hooks/useJobTitles';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CombinedJobsProvider } from '@/components/job-search/CombinedJobsProvider';
import { WorkdayJobsPanel } from '@/components/job-search/WorkdayJobsPanel';
import DiscoverPage from '@/app-shell/pages/DiscoverPage';

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: {
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

  test('For you shows Job feed button and title filter', () => {
    renderDiscover('/app/jobs/for-you');
    expect(screen.getByRole('button', { name: /job feed/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filter jobs by title or company/i)).toBeInTheDocument();
    expect(screen.queryByText(/scan one catalog at a time/i)).not.toBeInTheDocument();
  });

  test('Career Portals hides Job feed button and combined search', () => {
    renderDiscover('/app/jobs/portals');
    expect(screen.queryByRole('button', { name: /job feed/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/filter jobs by title or company/i)).not.toBeInTheDocument();
    expect(screen.getByText(/scan one catalog at a time/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see merged feed/i })).toHaveAttribute(
      'href',
      '/app/jobs/for-you',
    );
  });

  test('Saved keeps Job feed chrome without portals copy', () => {
    renderDiscover('/app/jobs/saved');
    expect(screen.getByRole('button', { name: /job feed/i })).toBeInTheDocument();
    expect(screen.queryByText(/scan one catalog at a time/i)).not.toBeInTheDocument();
  });

  test('Saved and Applied pills show counts as superscripts', async () => {
    api.getSavedJobs.mockResolvedValue({
      data: {
        jobs: [
          { job_id: 'a', status: 'interested' },
          { job_id: 'b', status: 'interested' },
          { job_id: 'c', status: 'applied' },
        ],
      },
      status: 200,
    });
    renderDiscover('/app/jobs/for-you');
    expect(await screen.findByRole('link', { name: 'Saved 2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Applied 1' })).toBeInTheDocument();
  });
});

describe('WorkdayJobsPanel Live listings', () => {
  beforeEach(() => {
    resetJobTitlesStore();
    window.localStorage.clear();
    api.getResume.mockResolvedValue({ data: { target_titles: ['Backend Engineer'] }, status: 200 });
    api.suggestPipelineFilters.mockResolvedValue({ data: { titles: [] }, status: 200 });
    api.searchWorkdayJobs.mockResolvedValue(okScan());
    api.getWorkdayCatalog.mockResolvedValue({ data: { total: 0, industries: [] }, status: 200 });
  });

  test('renders Live listings bar and Customize without CombinedJobsCtx', () => {
    render(
      <MemoryRouter>
        <TooltipProvider>
          <WorkdayJobsPanel
            variant="workday"
            isJobSaved={() => false}
            getJobStatus={() => null}
            saveJob={vi.fn()}
            unsaveJob={vi.fn()}
            quickApply={vi.fn()}
          />
        </TooltipProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /live listings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /customize/i })).toBeInTheDocument();
    expect(
      screen.getByText(/scanning workday career sites only/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /job feed/i })).not.toBeInTheDocument();
  });
});
