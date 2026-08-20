import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { isAppliedSavedJob } from '@/lib/savedJobs';

export const SAVED_JOBS_QUERY_KEY = ['jobs', 'saved'] as const;

/**
 * Counts for the Jobs Saved / Applied section pills. Quiet on error (zeros)
 * so the tab strip never surfaces a fetch failure.
 */
export function useSavedJobTabCounts(): { saved: number; applied: number } {
  const { data } = useQuery({
    queryKey: SAVED_JOBS_QUERY_KEY,
    queryFn: async () => {
      const res = await apiService.getSavedJobs();
      if (res.error || !res.data?.jobs) return [];
      return res.data.jobs;
    },
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

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
