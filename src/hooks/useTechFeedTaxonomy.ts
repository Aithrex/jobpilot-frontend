/**
 * The tech feed filter tree. Static per deploy, so it is fetched once and kept
 * for the whole session rather than re-fetched every time the rail mounts.
 */
import { useQuery } from '@tanstack/react-query';

import { apiService } from '@/lib/api';
import type { TechFeedTaxonomy } from '@/types/techFeed';

export const TECH_FEED_TAXONOMY_KEY = ['tech-feed', 'taxonomy'] as const;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function useTechFeedTaxonomy() {
  const query = useQuery<TechFeedTaxonomy>({
    queryKey: TECH_FEED_TAXONOMY_KEY,
    queryFn: async () => {
      const resp = await apiService.getTechFeedTaxonomy();
      if (resp.error) throw new Error(resp.error);
      if (!resp.data) throw new Error('Taxonomy unavailable');
      return resp.data;
    },
    staleTime: ONE_DAY_MS,
    gcTime: ONE_DAY_MS,
    // A missing taxonomy degrades the rail to its non-tree controls; it is not
    // worth hammering the endpoint.
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    taxonomy: query.data ?? null,
    families: query.data?.families ?? [],
    taxonomyVersion: query.data?.taxonomy_version ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
