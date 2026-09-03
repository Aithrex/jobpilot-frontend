import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAutoSync } from '@/hooks/useAutoSync';
import {
  loadCombinedPrefs,
  saveCombinedPrefs,
  useCombinedJobs,
  type CombinedJobsController,
} from '@/hooks/useCombinedJobs';
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
  /** United States only facet (default ON). Sent to the scan as `us_only`. */
  usOnly: boolean;
  setUsOnly: (v: boolean) => void;
  /** US-only narrowing: full state name / "Remote" / "" for anywhere. */
  usState: string;
  setUsState: (v: string) => void;
  /** US-only narrowing: optional city. */
  city: string;
  setCity: (v: string) => void;
  /** Free-text location, used only when `usOnly` is OFF. */
  location: string;
  setLocation: (v: string) => void;
  /** The effective location string the next scan will send (composed). */
  scanLocation: string;
  remoteOnly: boolean;
  setRemoteOnly: (v: boolean) => void;
  customizeOpen: boolean;
  setCustomizeOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  /** Reset every server-side scope control to its default. */
  resetScope: () => void;

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
  /** When false (default), roles already in the apply funnel are hidden. */
  showApplied: boolean;
  setShowApplied: (v: boolean) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  page: number;
  setPage: (v: number | ((p: number) => number)) => void;
}

const CombinedJobsContext = createContext<CombinedJobsContextValue | null>(null);

/**
 * Hosts the combined job feed ABOVE the router outlet so the scan (and its
 * 30-min background auto-sync) survive navigating between pages - clicking
 * "Sync now" and leaving the tab no longer aborts it. Lazy: nothing fetches
 * until `ensureStarted()` fires (the Jobs tab mounting), so users who never
 * open Jobs pay nothing.
 */
export function CombinedJobsProvider({ children }: { children: React.ReactNode }) {
  const [started, setStarted] = useState(false);
  const feed = useCombinedJobs(started);

  // Scan params hydrate from the same versioned key the hook's titles use, so
  // the whole saved setup survives reloads together.
  const [initialPrefs] = useState(loadCombinedPrefs);
  const [usOnly, setUsOnly] = useState(initialPrefs.usOnly ?? true);
  const [usState, setUsState] = useState(initialPrefs.usState ?? '');
  const [city, setCity] = useState(initialPrefs.city ?? '');
  const [location, setLocation] = useState(initialPrefs.location ?? '');
  const [remoteOnly, setRemoteOnly] = useState(initialPrefs.remoteOnly ?? false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Freshest first, but a WEEK - not a day. Opening on 'today' (maxDays 0)
  // hid all but the last 24 hours of an already-fetched 30-day payload; the
  // segmented control still shows per-window counts so narrowing to today or
  // widening to 30 days is one click.
  const [recency, setRecency] = useState<WorkdayRecency>('7d');
  const [seniority, setSeniority] = useState('any');
  const [minScore, setMinScore] = useState(0);
  const [sponsorFilter, setSponsorFilter] = useState<SponsorFilter>('friendly');
  // Discovery default: hide already-applied so the list stays actionable.
  const [showApplied, setShowApplied] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [page, setPage] = useState(1);

  const ensureStarted = useCallback(() => setStarted(true), []);

  const resetScope = useCallback(() => {
    setUsOnly(true);
    setUsState('');
    setCity('');
    setLocation('');
    setRemoteOnly(false);
  }, []);

  // The effective location the scan sends: when US-only is on we compose the
  // optional "city, state" narrowing; otherwise the raw free-text field wins.
  const scanLocation = usOnly
    ? [city.trim(), usState].filter(Boolean).join(', ')
    : location.trim();

  // Write-through persistence for the scan params only. Titles are persisted
  // by the shared `useJobTitles` store (into the same key), so both surfaces
  // save one set instead of racing two.
  useEffect(() => {
    if (!feed.ready) return;
    saveCombinedPrefs({ location, remoteOnly, usOnly, usState, city });
  }, [feed.ready, location, remoteOnly, usOnly, usState, city]);

  const autoSync = useAutoSync({
    enabled: started && feed.ready,
    intervalMs: AUTO_SYNC_MS,
    isBusy: feed.loading,
    onSync: (force) => feed.run(force, { location: scanLocation, remoteOnly, usOnly }),
  });

  const value: CombinedJobsContextValue = {
    ...feed,
    lastSyncedAt: autoSync.lastSyncedAt,
    secondsUntilNext: autoSync.secondsUntilNext,
    sync: autoSync.sync,
    ensureStarted,
    usOnly,
    setUsOnly,
    usState,
    setUsState,
    city,
    setCity,
    location,
    setLocation,
    scanLocation,
    remoteOnly,
    setRemoteOnly,
    customizeOpen,
    setCustomizeOpen,
    resetScope,
    search,
    setSearch,
    recency,
    setRecency,
    seniority,
    setSeniority,
    minScore,
    setMinScore,
    sponsorFilter,
    setSponsorFilter,
    showApplied,
    setShowApplied,
    sortBy,
    setSortBy,
    page,
    setPage,
  };

  return <CombinedJobsContext.Provider value={value}>{children}</CombinedJobsContext.Provider>;
}

export function useCombinedJobsCtx(): CombinedJobsContextValue {
  const ctx = useContext(CombinedJobsContext);
  if (!ctx) throw new Error('useCombinedJobsCtx must be used within CombinedJobsProvider');
  return ctx;
}
