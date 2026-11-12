/**
 * The signed-in person's privacy state, through React Query.
 *
 * One cache entry (`PRIVACY_QUERY_KEY`) feeds every surface that reads it:
 * the Settings privacy section, the Your Privacy Choices page and the terms
 * update notice in the app shell. A PUT writes its echo straight back into
 * that entry, so all three agree without a refetch.
 *
 * A 404 means the backend change has not shipped yet. That is reported as
 * `unavailable` rather than as an error, so each surface can say "not
 * available yet" (or render nothing) instead of a failure.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiService } from '@/lib/api';
import type { PrivacyState, PrivacyUpdate } from '@/types/privacy';

export const PRIVACY_QUERY_KEY = ['privacy'] as const;

export interface PrivacyQueryData {
  state: PrivacyState | null;
  /** True when the endpoint answered 404 (not deployed yet). */
  unavailable: boolean;
}

/** An update that did not land. `status` lets callers tell 404 from 400/429. */
export class PrivacyRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'PrivacyRequestError';
    this.status = status;
  }
}

async function fetchPrivacy(): Promise<PrivacyQueryData> {
  const res = await apiService.getPrivacy();
  if (res.data) return { state: res.data, unavailable: false };
  if (res.status === 404) return { state: null, unavailable: true };
  throw new PrivacyRequestError(res.error || 'Could not load your privacy settings.', res.status);
}

export interface UsePrivacyResult {
  state: PrivacyState | null;
  unavailable: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  /** Resolves with the new state; rejects with a PrivacyRequestError. */
  update: (update: PrivacyUpdate) => Promise<PrivacyState>;
  isSaving: boolean;
}

export function usePrivacy(
  enabled = true,
  opts: { refetchOnMount?: boolean | 'always' } = {},
): UsePrivacyResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PRIVACY_QUERY_KEY,
    queryFn: fetchPrivacy,
    enabled,
    // A 404 or a 4xx is an answer, not a flake. Retrying it only delays the
    // degraded state the person should see.
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: opts.refetchOnMount ?? true,
  });

  const mutation = useMutation({
    mutationFn: async (update: PrivacyUpdate) => {
      const res = await apiService.updatePrivacy(update);
      if (res.data) return res.data;
      throw new PrivacyRequestError(res.error || 'We could not save that change.', res.status);
    },
    onSuccess: (state) => {
      queryClient.setQueryData<PrivacyQueryData>(PRIVACY_QUERY_KEY, {
        state,
        unavailable: false,
      });
    },
  });

  return {
    state: query.data?.state ?? null,
    unavailable: query.data?.unavailable ?? false,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
    update: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
