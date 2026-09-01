import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useJobSearch } from '@/hooks/useJobSearch';
import type { Job } from '@/types/jobs';

const touchJobPipeline = vi.fn();
const updateSavedJob = vi.fn();

vi.mock('@/lib/api', () => ({
  apiService: {
    touchJobPipeline: (...args: unknown[]) => touchJobPipeline(...args),
    updateSavedJob: (...args: unknown[]) => updateSavedJob(...args),
    getSavedJobs: vi.fn(async () => ({ data: { jobs: [] } })),
    getJobFilters: vi.fn(async () => ({ data: { filters: {} } })),
  },
}));

vi.mock('@/lib/jobPosting', () => ({
  openJobPosting: vi.fn(),
}));

const JOB: Job = {
  job_id: 'j-apply-1',
  title: 'Backend Engineer',
  company: 'Acme',
  logo: '',
  location: 'Remote',
  apply_link: 'https://example.com/apply',
  description: 'Build APIs.',
  salary: '',
  employment_type: '',
  date_posted: '',
  is_remote: true,
  h1b_sponsor: false,
  match_score: 80,
  matched_skills: [],
  missing_skills: [],
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useJobSearch apply confirmation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    touchJobPipeline.mockReset();
    updateSavedJob.mockReset();
    touchJobPipeline.mockResolvedValue({
      data: {
        job: {
          job_id: JOB.job_id,
          status: 'applied',
          job_data: JOB,
        },
      },
    });
  });

  test('beginApplyWithTailor marks the job pending immediately', async () => {
    const { result } = renderHook(() => useJobSearch(), { wrapper });

    await act(async () => {
      await result.current.beginApplyWithTailor(JOB);
    });

    expect(result.current.isApplyConfirmPending(JOB.job_id)).toBe(true);
    expect(JSON.parse(sessionStorage.getItem('aspirely.pending-apply-confirm') || '[]'))
      .toContain(JOB.job_id);
  });

  test('confirmApplied uses the job payload when saved jobs are not loaded yet', async () => {
    const { result } = renderHook(() => useJobSearch(), { wrapper });

    await act(async () => {
      await result.current.beginApplyWithTailor(JOB);
    });

    await act(async () => {
      await result.current.confirmApplied(JOB.job_id, JOB);
    });

    expect(touchJobPipeline).toHaveBeenCalledWith(JOB, 'applied');
    expect(updateSavedJob).not.toHaveBeenCalled();
    expect(result.current.isApplyConfirmPending(JOB.job_id)).toBe(false);
  });

  test('confirmApplied restores posting from sessionStorage after remount', async () => {
    const first = renderHook(() => useJobSearch(), { wrapper });
    await act(async () => {
      await first.result.current.beginApplyWithTailor(JOB);
    });
    first.unmount();

    const second = renderHook(() => useJobSearch(), { wrapper });
    await waitFor(() => {
      expect(second.result.current.isApplyConfirmPending(JOB.job_id)).toBe(true);
    });

    await act(async () => {
      await second.result.current.confirmApplied(JOB.job_id);
    });

    expect(touchJobPipeline).toHaveBeenCalledWith(JOB, 'applied');
  });
});
