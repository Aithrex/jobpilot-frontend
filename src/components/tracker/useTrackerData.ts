/**
 * All tracker network state in one place: the records themselves, the
 * auxiliary intelligence panels, and the two mutations (change stage, patch
 * fields). Lifted out of the old ApplicationsTab so the view components stay
 * presentational.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { apiService } from '@/lib/api';
import type { ApplicationStatus, TailoringRecord } from '@/types/resume';

export interface FunnelData {
  counts: Record<string, number>;
  conversions: Record<string, number>;
  insight?: { headline: string; insight: string; action_items: string[] };
}

export interface StaleApp {
  record_id: string;
  job_title: string;
  company: string;
  days_stale: number;
}

export interface Reframe {
  acknowledgement: string;
  what_went_right: string;
  next_actions: string[];
  silver_lining: string;
}

export type ApplicationPatch = Parameters<typeof apiService.updateApplication>[1];

export function useTrackerData() {
  const [records, setRecords] = useState<TailoringRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(true);
  const [staleApps, setStaleApps] = useState<StaleApp[]>([]);
  const [reframe, setReframe] = useState<Reframe | null>(null);

  /**
   * Silent mode re-fetches in place without toggling the page skeleton, so a
   * post-action refresh (applying a Gmail suggestion, say) doesn't blank the
   * screen for a second. Only the first load shows the skeleton.
   */
  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setFunnelLoading(true);
      setLoadError(null);
    }

    // Records are all the list needs — resolve them first and clear the
    // page-level loading flag the moment they land, rather than waiting on the
    // slowest of three endpoints.
    const recordsPromise = apiService.listTailoringRecords().then((resp) => {
      if (resp.error) {
        // Track the failure so the page can offer a retry instead of
        // masquerading as an empty pipeline.
        setLoadError(resp.error);
        if (silent) toast.error("Couldn't refresh applications");
      } else if (resp.data) {
        setRecords((resp.data.records || []) as TailoringRecord[]);
        setLoadError(null);
      }
      if (!silent) setLoading(false);
    });

    const auxPromise = Promise.all([
      apiService.getFunnelAnalytics(),
      apiService.getStaleApplications(5),
    ]).then(([funnelResp, staleResp]) => {
      if (funnelResp.data?.ok) {
        setFunnel({
          counts: funnelResp.data.counts || {},
          conversions: funnelResp.data.conversions || {},
          insight: funnelResp.data.insight,
        });
      }
      if (staleResp.data?.stale_applications) {
        setStaleApps(staleResp.data.stale_applications as StaleApp[]);
      }
      if (!silent) setFunnelLoading(false);
    });

    await Promise.all([recordsPromise, auxPromise]);
  }, []);

  const refetch = useCallback(() => load(), [load]);
  const refetchSilent = useCallback(() => load({ silent: true }), [load]);
  useEffect(() => {
    load();
  }, [load]);

  const updateRecord = useCallback(
    (id: string, patcher: (r: TailoringRecord) => TailoringRecord) => {
      setRecords((prev) => prev.map((r) => (r.record_id === id ? patcher(r) : r)));
    },
    [],
  );

  // Keeps the server-side funnel counts in lockstep with the local sections
  // after a stage change. Fire-and-forget; a failure here is not worth a toast.
  const refreshFunnel = useCallback(async () => {
    try {
      const r = await apiService.getFunnelAnalytics();
      if (r.data) {
        setFunnel({
          counts: r.data.counts || {},
          conversions: r.data.conversions || {},
          insight: r.data.insight,
        });
      }
    } catch {
      /* best effort */
    }
  }, []);

  /** Optimistic stage change with rollback. Used by drag, the pane and the row. */
  const setStatus = useCallback(
    async (id: string, status: ApplicationStatus) => {
      const current = records.find((r) => r.record_id === id);
      if (!current) return;
      const previous = (current.application?.status || 'draft') as ApplicationStatus;
      if (previous === status) return;

      updateRecord(id, (r) => ({ ...r, application: { ...(r.application || {}), status } }));
      setSavingId(id);
      const resp = await apiService.updateApplication(id, { status });
      setSavingId(null);

      if (resp.error) {
        updateRecord(id, (r) => ({
          ...r,
          application: { ...(r.application || {}), status: previous },
        }));
        toast.error("Couldn't move that application. Reverted.");
        return;
      }

      updateRecord(id, (r) => ({
        ...r,
        application: { ...(r.application || {}), ...resp.data!.application },
      }));
      refreshFunnel();

      if (status === 'rejected') {
        const refr = await apiService.reframeRejection(id);
        if (refr.data?.reframe) setReframe(refr.data.reframe);
      }
    },
    [records, updateRecord, refreshFunnel],
  );

  /** Field-level save. `quiet` suppresses the toast for one-tap prompt answers. */
  const patch = useCallback(
    async (id: string, body: ApplicationPatch, { quiet = false }: { quiet?: boolean } = {}) => {
      setSavingId(id);
      const resp = await apiService.updateApplication(id, body);
      setSavingId(null);
      if (resp.error) {
        toast.error("Couldn't save those changes");
        return;
      }
      updateRecord(id, (r) => ({
        ...r,
        application: { ...(r.application || {}), ...resp.data!.application },
      }));
      if (body.status) refreshFunnel();
      if (!quiet) toast.success('Saved');
    },
    [updateRecord, refreshFunnel],
  );

  const dismissStale = useCallback(async (recordId: string) => {
    const r = await apiService.dismissIntelligenceFollowup(recordId);
    if (r.error) {
      toast.error(r.error);
      return false;
    }
    setStaleApps((prev) => prev.filter((x) => x.record_id !== recordId));
    return true;
  }, []);

  return {
    records,
    loading,
    loadError,
    savingId,
    funnel,
    funnelLoading,
    staleApps,
    reframe,
    setReframe,
    refetch,
    refetchSilent,
    setStatus,
    patch,
    dismissStale,
  };
}
