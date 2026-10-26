import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { isAppliedSavedJob } from '@/lib/savedJobs';
import type { SavedJob } from '@/types/jobs';

export const SAVED_JOBS_QUERY_KEY = ['jobs', 'saved'] as const;

export async function fetchSavedJobs(): Promise<SavedJob[]> {
  const res = await apiService.getSavedJobs();
  if (res.error || !res.data?.jobs) throw new Error(res.error || 'Could not load saved jobs');
  return res.data.jobs;
}

/** Shared read for cards, facets, Home, and Saved/Applied tabs. */
export function useSavedJobs(enabled = true) {
  return useQuery({
    queryKey: SAVED_JOBS_QUERY_KEY,
    queryFn: fetchSavedJobs,
    enabled,
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Counts for the Jobs Saved / Applied section pills. Quiet on error (zeros)
 * so the tab strip never surfaces a fetch failure.
 */
export function useSavedJobTabCounts(): { saved: number; applied: number } {
  const { data } = useSavedJobs();

  return useMemo(() => {
    const rows = data ?? [];
    let saved = 0;
    let applied = 0;
    for (const row of rows) {
      if (isAppliedSavedJob(row)) applied += 1;
      else saved += 1;
    }
    return { saved, applied };
  }, [data]);
}
