import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAutoSync } from '@/hooks/useAutoSync';
import {
  loadCombinedPrefs,
  saveCombinedPrefs,
  useCombinedJobs,
  type CombinedJobsController,
} from '@/hooks/useCombinedJobs';
import { useJobTitles } from '@/hooks/useJobTitles';
import { EMPLOYER_PREFERENCES_CHANGED_EVENT } from '@/hooks/useEmployerPreferences';
import { SENIORITY_LEVELS, type SeniorityLevel } from '@/lib/careerJobs';
import type { ExperienceView, WorkdayRecency } from '@/types/jobs';

const AUTO_SYNC_MS = 30 * 60 * 1000;

/** A level choice the user made on purpose, and the default it replaced. */
const SENIORITY_KEY = 'combined_jobs_seniority_v1';
interface SeniorityOverride {
  levels: SeniorityLevel[];
  /** `levels.join('|')` of the default this replaced. When the default moves
   *  (a new resume, a changed onboarding level) the override is stale. */
  basis: string;
}

function readSeniorityOverride(): SeniorityOverride | null {
  try {
    const raw = window.localStorage.getItem(SENIORITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SeniorityOverride>;
    if (!Array.isArray(parsed.levels) || typeof parsed.basis !== 'string') return null;
    return {
      levels: SENIORITY_LEVELS.filter((l) => parsed.levels!.includes(l)),
      basis: parsed.basis,
    };
  } catch {
    return null;
  }
}

function writeSeniorityOverride(v: SeniorityOverride | null): void {
  try {
    if (v) window.localStorage.setItem(SENIORITY_KEY, JSON.stringify(v));
    else window.localStorage.removeItem(SENIORITY_KEY);
  } catch {
    /* storage unavailable: the choice lasts for this session only */
  }
}

const basisOf = (view: ExperienceView | null) => (view?.levels ?? []).join('|');

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
  /** Levels the board shows. `[]` = every level. Opens on the candidate's
   *  own (`experienceView`); a deliberate change is remembered. */
  seniorityLevels: SeniorityLevel[];
  setSeniorityLevels: (v: SeniorityLevel[]) => void;
  /** Back to the candidate's own levels. */
  resetSeniorityLevels: () => void;
  /** Where the default came from, for the "Showing ... because ..." line. */
  experienceView: ExperienceView | null;
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
  // Freshest first: open on today's postings. What made this look broken was
  // never the window - undated rows were dropped client-side and the server's
  // own candidate window was ~1 day wide, so "today" was a slice of a slice.
  // Both are fixed; the segmented control shows per-window counts so widening
  // to 1/3/7/30 days stays one click.
  const [recency, setRecency] = useState<WorkdayRecency>('today');
  // Opens on the candidate's OWN levels. It opened on every level until
  // 2026-10-02, and every current user is early-career: a zero-year user's
  // first screen held an architect role and two executive ones.
  const { experienceView } = useJobTitles(started);
  const [seniorityLevels, setSeniorityState] = useState<SeniorityLevel[]>(
    () => readSeniorityOverride()?.levels ?? [],
  );
  useEffect(() => {
    if (!experienceView) return;
    const saved = readSeniorityOverride();
    if (saved && saved.basis === basisOf(experienceView)) {
      setSeniorityState(saved.levels);
      return;
    }
    if (saved) writeSeniorityOverride(null); // the default moved under it
    setSeniorityState(experienceView.levels);
  }, [experienceView]);
  const setSeniorityLevels = useCallback(
    (levels: SeniorityLevel[]) => {
      const ordered = SENIORITY_LEVELS.filter((l) => levels.includes(l));
      setSeniorityState(ordered);
      writeSeniorityOverride({ levels: ordered, basis: basisOf(experienceView) });
    },
    [experienceView],
  );
  const resetSeniorityLevels = useCallback(() => {
    writeSeniorityOverride(null);
    setSeniorityState(experienceView?.levels ?? []);
  }, [experienceView]);
  const [minScore, setMinScore] = useState(0);
  const [sponsorFilter, setSponsorFilter] = useState<SponsorFilter>('friendly');
  // Discovery default: hide already-applied so the list stays actionable.
  const [showApplied, setShowApplied] = useState(false);
  // Best match first. Newest-first put whatever was posted last at the top
  // regardless of fit: replaying every user's board on 2026-10-02, the
  // best-match first screen had a median match of ~80 against ~50-70, and far
  // fewer postings asking for years the candidate does not have.
  const [sortBy, setSortBy] = useState<SortBy>('score');
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

  // A saved employer-type choice changes what the SERVER serves, so re-run the
  // scan once it lands. Not forced: the choice is applied when the list is
  // served, so there is no reason to re-crawl every board for it.
  const resyncRef = useRef<() => void>(() => {});
  resyncRef.current = () => {
    if (started && feed.hasResult && !feed.loading) autoSync.sync(false);
  };
  useEffect(() => {
    const onChange = () => resyncRef.current();
    window.addEventListener(EMPLOYER_PREFERENCES_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(EMPLOYER_PREFERENCES_CHANGED_EVENT, onChange);
  }, []);

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
    seniorityLevels,
    setSeniorityLevels,
    resetSeniorityLevels,
    experienceView,
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
