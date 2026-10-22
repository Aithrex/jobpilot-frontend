/**
 * The user's direct-employer exclusions (contract `employer-policy-1.0.0`).
 *
 * Server-owned: GET/PUT /api/jobs/tech-feed/employer-preferences. The server
 * ENFORCES them on every list it serves, so a save is followed by a refresh of
 * the feeds - the client never filters by policy itself, it renders what the
 * server sent and the counts of what it excluded.
 *
 * Writes are optimistic: the toggle moves at once, and a failed save rolls it
 * back to the last stored choice and says so. A 404 means the backend predates
 * the endpoint; the control then hides itself rather than offering a setting
 * that would do nothing.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiService } from '@/lib/api';
import { preferencesOf } from '@/lib/employerPolicy';
import type { EmployerPreferences } from '@/types/employerPolicy';

export const EMPLOYER_PREFERENCES_QUERY_KEY = ['employer-preferences'] as const;

/**
 * Fired on `window` after a save lands, with the stored preferences as
 * `detail`. Feeds that are not React Query (the For-you scan) listen for it and
 * re-run, so the server re-filters with the new choice.
 */
export const EMPLOYER_PREFERENCES_CHANGED_EVENT = 'aspirely:employer-preferences-changed';

export class EmployerPreferencesError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'EmployerPreferencesError';
    this.status = status;
  }
}

export interface UseEmployerPreferencesResult {
  preferences: EmployerPreferences | null;
  isLoading: boolean;
  /** A load failure the user should see. Null while loading and when unavailable. */
  error: string | null;
  /** The backend does not serve this endpoint (404) - hide the control. */
  unavailable: boolean;
  saving: boolean;
  save: (next: EmployerPreferences) => Promise<boolean>;
  refetch: () => void;
}

export function useEmployerPreferences({ enabled = true }: { enabled?: boolean } = {}): UseEmployerPreferencesResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: EMPLOYER_PREFERENCES_QUERY_KEY,
    enabled,
    queryFn: async (): Promise<EmployerPreferences> => {
      const resp = await apiService.getEmployerPreferences();
      if (resp.error) throw new EmployerPreferencesError(resp.error, resp.status);
      const prefs = preferencesOf(resp.data);
      if (!prefs) throw new EmployerPreferencesError('The server sent unreadable employer preferences.');
      return prefs;
    },
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: async (next: EmployerPreferences): Promise<EmployerPreferences> => {
      const resp = await apiService.saveEmployerPreferences({
        preset: next.preset,
        exclude: next.exclude,
      });
      if (resp.error) throw new EmployerPreferencesError(resp.error, resp.status);
      // A 2xx with no readable body still stored what we sent.
      return preferencesOf(resp.data) ?? { ...next, set_by: 'user' };
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: EMPLOYER_PREFERENCES_QUERY_KEY });
      const previous = queryClient.getQueryData<EmployerPreferences>(EMPLOYER_PREFERENCES_QUERY_KEY);
      queryClient.setQueryData(EMPLOYER_PREFERENCES_QUERY_KEY, next);
      return { previous };
    },
    onError: (err, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(EMPLOYER_PREFERENCES_QUERY_KEY, context.previous);
      } else {
        void queryClient.invalidateQueries({ queryKey: EMPLOYER_PREFERENCES_QUERY_KEY });
      }
      toast.error("Couldn't save your employer filters", {
        description: `${err instanceof Error ? err.message : 'Network error'}. Your previous choice is still in effect.`,
      });
    },
    onSuccess: (stored) => {
      queryClient.setQueryData(EMPLOYER_PREFERENCES_QUERY_KEY, stored);
      // The server re-filters on the next read; make that read happen now.
      void queryClient.invalidateQueries({ queryKey: ['tech-feed', 'search'] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EMPLOYER_PREFERENCES_CHANGED_EVENT, { detail: stored }));
      }
    },
  });

  const { mutateAsync } = mutation;
  const save = useCallback(
    async (next: EmployerPreferences) => {
      try {
        await mutateAsync(next);
        return true;
      } catch {
        return false; // already rolled back and reported in onError
      }
    },
    [mutateAsync],
  );

  const status = query.error instanceof EmployerPreferencesError ? query.error.status : undefined;
  const unavailable = status === 404;
  const { refetch: refetchQuery } = query;
  const refetch = useCallback(() => {
    void refetchQuery();
  }, [refetchQuery]);

  return {
    preferences: query.data ?? null,
    isLoading: query.isLoading,
    error: !unavailable && query.error instanceof Error ? query.error.message : null,
    unavailable,
    saving: mutation.isPending,
    save,
    refetch,
  };
}
