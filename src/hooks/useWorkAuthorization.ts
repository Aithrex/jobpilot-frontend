/**
 * The signed-in person's work-authorization answer.
 *
 * React Query over the one API boundary in `lib/api.ts`. Three rules the UI
 * depends on:
 *
 *  - the default is `unset` and `unset` is rendered as "not answered", never
 *    as "authorized". Everything downstream treats it as no opinion;
 *  - a save that the server did not echo back is reported as NOT saved. The
 *    preference key is new and a server that drops unknown keys must not leave
 *    the user believing their feed has been adjusted;
 *  - nothing here gates anything. There is no loading gate, no blocking state
 *    and no error that stops the page working - the worst case is that the
 *    question is still on screen.
 */
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiService } from '@/lib/api';
import type {
  WorkAuthorizationPreference,
  WorkAuthorizationStatus,
} from '@/types/workAuthorization';

export const WORK_AUTHORIZATION_QUERY_KEY = ['work-authorization'] as const;

const UNANSWERED: WorkAuthorizationPreference = {
  status: 'unset',
  updated_at: null,
  persisted: false,
};

export interface UseWorkAuthorizationResult {
  status: WorkAuthorizationStatus;
  updatedAt: string | null;
  /** False when the answer exists only in this browser (a save did not land). */
  persisted: boolean;
  isLoading: boolean;
  isSaving: boolean;
  /** The last save error, verbatim from the server. Null when there is none. */
  error: string | null;
  save: (status: WorkAuthorizationStatus) => Promise<boolean>;
}

export function useWorkAuthorization(enabled = true): UseWorkAuthorizationResult {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: WORK_AUTHORIZATION_QUERY_KEY,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<WorkAuthorizationPreference> => {
      const res = await apiService.getWorkAuthorization();
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not read the preference');
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (status: WorkAuthorizationStatus): Promise<WorkAuthorizationPreference> => {
      const res = await apiService.saveWorkAuthorization(status);
      if (res.error || !res.data) throw new Error(res.error ?? 'Could not save the preference');
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(WORK_AUTHORIZATION_QUERY_KEY, data);
    },
  });

  const save = useCallback(
    async (status: WorkAuthorizationStatus) => {
      try {
        const saved = await mutation.mutateAsync(status);
        return saved.persisted;
      } catch {
        return false;
      }
    },
    [mutation],
  );

  const current = query.data ?? UNANSWERED;

  return {
    status: current.status,
    updatedAt: current.updated_at,
    persisted: current.persisted,
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
    save,
  };
}
