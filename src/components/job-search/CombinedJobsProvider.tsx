import { createContext, useCallback, useContext, useState } from 'react';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useCombinedJobs, type CombinedJobsController } from '@/hooks/useCombinedJobs';
import type { WorkdayRecency } from '@/types/jobs';

const AUTO_SYNC_MS = 30 * 60 * 1000;

export type SponsorFilter = 'all' | 'friendly' | 'proven';
export type SortBy = 'score' | 'newest';

interface CombinedJobsContextValue extends CombinedJobsController {
  /** Live countdown / freshness from the background auto-sync. */
  lastSyncedAt: number | null;
  secondsUntilNext: number | null;
  sync: (force: boolean) => void;
  /** Begin scanning (called the first time the Jobs tab opens). Idempotent. */
  ensureStarted: () => void;

  // Server-side scan params (drive the next sync).
  location: string;
  setLocation: (v: string) => void;
  remoteOnly: boolean;
  setRemoteOnly: (v: boolean) => void;
  customizeOpen: boolean;
  setCustomizeOpen: (v: boolean | ((p: boolean) => boolean)) => void;

  // Client-side view filters (persist across navigation).
  search: string;
  setSearch: (v: string) => void;
  recency: WorkdayRecency;
  setRecency: (v: WorkdayRecency) => void;
  seniority: string;
  setSeniority: (v: string) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  sponsorFilter: SponsorFilter;
  setSponsorFilter: (v: SponsorFilter) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  page: number;
  setPage: (v: number | ((p: number) => number)) => void;
}

const CombinedJobsContext = createContext<CombinedJobsContextValue | null>(null);

/**
 * Hosts the combined job feed ABOVE the router outlet so the scan (and its
 * 30-min background auto-sync) survive navigating between pages — clicking
 * "Sync now" and leaving the tab no longer aborts it. Lazy: nothing fetches
 * until `ensureStarted()` fires (the Jobs tab mounting), so users who never
 * open Jobs pay nothing.
 */
export function CombinedJobsProvider({ children }: { children: React.ReactNode }) {
  const [started, setStarted] = useState(false);
  const feed = useCombinedJobs(started);

  const [location, setLocation] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recency, setRecency] = useState<WorkdayRecency>('3d');
  const [seniority, setSeniority] = useState('any');
  const [minScore, setMinScore] = useState(0);
  const [sponsorFilter, setSponsorFilter] = useState<SponsorFilter>('friendly');
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [page, setPage] = useState(1);

  const ensureStarted = useCallback(() => setStarted(true), []);

  const autoSync = useAutoSync({
    enabled: started && feed.ready,
    intervalMs: AUTO_SYNC_MS,
    isBusy: feed.loading,
    onSync: (force) => feed.run(force, { location, remoteOnly }),
  });

  const value: CombinedJobsContextValue = {
    ...feed,
    lastSyncedAt: autoSync.lastSyncedAt,
    secondsUntilNext: autoSync.secondsUntilNext,
    sync: autoSync.sync,
    ensureStarted,
    location, setLocation,
    remoteOnly, setRemoteOnly,
    customizeOpen, setCustomizeOpen,
    search, setSearch,
    recency, setRecency,
    seniority, setSeniority,
    minScore, setMinScore,
    sponsorFilter, setSponsorFilter,
    sortBy, setSortBy,
    page, setPage,
  };

  return <CombinedJobsContext.Provider value={value}>{children}</CombinedJobsContext.Provider>;
}

export function useCombinedJobsCtx(): CombinedJobsContextValue {
  const ctx = useContext(CombinedJobsContext);
  if (!ctx) throw new Error('useCombinedJobsCtx must be used within CombinedJobsProvider');
  return ctx;
}
