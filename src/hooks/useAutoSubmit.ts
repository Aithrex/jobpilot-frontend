import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type {
  AutoSubmitApproveBody,
  AutoSubmitApproveResult,
  AutoSubmitApprovalView,
  AutoSubmitPending,
  AutoSubmitSettings,
  AutoSubmitUsage,
} from "@/types/autoSubmit";

/**
 * Minimal mirror of the apiService response envelope. We type the six
 * auto-submit calls through a local interface and cast `apiService` to it so
 * this hook compiles cleanly WITHOUT editing src/lib/api.ts (owned by the main
 * agent). The exact methods to add to ApiService are reported alongside this
 * file; once they land the cast is a no-op.
 */
interface ApiResp<T> {
  data?: T;
  error?: string;
  status?: number;
  errorPayload?: Record<string, unknown>;
}

interface AutoSubmitApi {
  getAutoSubmitSettings(): Promise<ApiResp<AutoSubmitSettings>>;
  updateAutoSubmitSettings(
    enabled: boolean,
    autonomyThreshold?: number,
  ): Promise<ApiResp<AutoSubmitSettings>>;
  approveAutoSubmit(
    body: AutoSubmitApproveBody,
  ): Promise<ApiResp<AutoSubmitApproveResult>>;
  cancelAutoSubmit(
    applicationId: string,
  ): Promise<ApiResp<{ approval: AutoSubmitApprovalView }>>;
  getAutoSubmitPending(): Promise<ApiResp<AutoSubmitPending>>;
  markAutoSubmitSubmitted(
    applicationId: string,
  ): Promise<ApiResp<{ approval: AutoSubmitApprovalView }>>;
}

const api = apiService as unknown as AutoSubmitApi;

const SETTINGS_KEY = ["auto-submit", "settings"] as const;
const PENDING_KEY = ["auto-submit", "pending"] as const;

/** Result surface for the approve action so the UI can branch on business states. */
export interface ApproveOutcome {
  ok: boolean;
  /** True when the backend needs the user to opt in first (403). */
  needsOptIn?: boolean;
  /** Present when the daily quota is exhausted (429). */
  quota?: AutoSubmitUsage;
  usage?: AutoSubmitUsage;
  created?: boolean;
  error?: string;
}

interface SettingsState {
  unavailable: boolean;
  settings?: AutoSubmitSettings;
}

/**
 * Wraps the opt-in auto-submit endpoints with loading/error state and the
 * master-flag-off (404) → `available: false` signal. All reads go through React
 * Query; the pending queue self-refreshes so the undo countdowns stay in sync
 * with the server.
 */
export function useAutoSubmit() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [savingSettings, setSavingSettings] = useState(false);

  const settingsQuery = useQuery<SettingsState>({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const res = await api.getAutoSubmitSettings();
      // Feature master-flag off - hide the whole surface.
      if (res.status === 404) return { unavailable: true };
      if (res.error) throw new Error(res.error);
      return { unavailable: false, settings: res.data };
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
    retry: false,
  });

  // undefined while we don't yet know; false when the flag is off.
  const available: boolean | undefined = settingsQuery.data
    ? !settingsQuery.data.unavailable
    : undefined;
  const enabled = settingsQuery.data?.settings?.auto_submit_enabled ?? false;

  const pendingQuery = useQuery<AutoSubmitPending>({
    queryKey: PENDING_KEY,
    queryFn: async () => {
      const res = await api.getAutoSubmitPending();
      if (res.status === 404) return { pending: [], waiting: [] };
      if (res.error) throw new Error(res.error);
      return res.data ?? { pending: [], waiting: [] };
    },
    enabled: isAuthenticated && available === true,
    // Keep the review queue + undo windows fresh without hammering the API.
    refetchInterval: available === true ? 8_000 : false,
    refetchOnWindowFocus: true,
  });

  const setEnabled = useCallback(
    async (next: boolean): Promise<boolean> => {
      setSavingSettings(true);
      const res = await api.updateAutoSubmitSettings(next);
      setSavingSettings(false);
      if (res.error || !res.data) return false;
      qc.setQueryData<SettingsState>(SETTINGS_KEY, {
        unavailable: false,
        settings: res.data,
      });
      // Opting in may reveal candidates; refresh the queue.
      qc.invalidateQueries({ queryKey: PENDING_KEY });
      return true;
    },
    [qc],
  );

  /**
   * Persist the opt-in flag and/or the confidence threshold together. Used by
   * the Autonomy settings panel where both controls live side by side.
   */
  const saveSettings = useCallback(
    async (next: {
      enabled: boolean;
      autonomyThreshold?: number;
    }): Promise<boolean> => {
      setSavingSettings(true);
      const res = await api.updateAutoSubmitSettings(
        next.enabled,
        next.autonomyThreshold,
      );
      setSavingSettings(false);
      if (res.error || !res.data) return false;
      qc.setQueryData<SettingsState>(SETTINGS_KEY, {
        unavailable: false,
        settings: res.data,
      });
      qc.invalidateQueries({ queryKey: PENDING_KEY });
      return true;
    },
    [qc],
  );

  const approve = useCallback(
    async (body: AutoSubmitApproveBody): Promise<ApproveOutcome> => {
      const res = await api.approveAutoSubmit(body);
      if (res.status === 403) {
        return { ok: false, needsOptIn: true, error: res.error };
      }
      if (res.status === 429) {
        const usage = (res.errorPayload?.usage as AutoSubmitUsage) ?? undefined;
        return { ok: false, quota: usage, error: res.error };
      }
      if (res.error || !res.data) {
        return { ok: false, error: res.error ?? "Could not approve" };
      }
      qc.invalidateQueries({ queryKey: PENDING_KEY });
      return {
        ok: true,
        created: res.data.created,
        usage: res.data.usage,
      };
    },
    [qc],
  );

  const cancel = useCallback(
    async (applicationId: string): Promise<{ ok: boolean; error?: string }> => {
      const res = await api.cancelAutoSubmit(applicationId);
      if (res.error) return { ok: false, error: res.error };
      qc.invalidateQueries({ queryKey: PENDING_KEY });
      return { ok: true };
    },
    [qc],
  );

  const markSubmitted = useCallback(
    async (applicationId: string): Promise<{ ok: boolean; error?: string }> => {
      const res = await api.markAutoSubmitSubmitted(applicationId);
      // 409 = already submitted; treat as success for idempotency.
      if (res.error && res.status !== 409) return { ok: false, error: res.error };
      qc.invalidateQueries({ queryKey: PENDING_KEY });
      return { ok: true };
    },
    [qc],
  );

  return {
    /** undefined = still resolving; false = feature flag off (hide surface). */
    available,
    enabled,
    settings: settingsQuery.data?.settings,
    settingsLoading: settingsQuery.isLoading,
    settingsError: settingsQuery.isError,
    savingSettings,
    setEnabled,
    saveSettings,

    pending: pendingQuery.data?.pending ?? [],
    waiting: pendingQuery.data?.waiting ?? [],
    pendingLoading: pendingQuery.isLoading,
    pendingError: pendingQuery.isError,
    refetchPending: () => qc.invalidateQueries({ queryKey: PENDING_KEY }),

    approve,
    cancel,
    markSubmitted,
  };
}
