import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useJobTitles } from '@/hooks/useJobTitles';
import { apiService } from '@/lib/api';
import { currentAccountKey, ownedByAnotherAccount } from '@/lib/accountKey';
import { mergeJobs } from '@/lib/careerJobs';
import { mergePolicies } from '@/lib/employerPolicy';
import type { PolicyBlock } from '@/types/employerPolicy';
import type { BoardSnapshot, WorkdayJob, WorkdayJobsParams, WorkdayJobsResult } from '@/types/jobs';
import type { SyncOutcome, SyncReason } from '@/hooks/useAutoSync';

/**
 * Combined Job feed scan (Workday + career pages + MNC).
 *
 * Title chips (from resume analysis / user edits) classify into role families
 * on the server. Sync returns the whole family for those titles, and drops
 * off-family rows (e.g. Systems Engineer when chips are Software Engineer).
 * See docs/job-feed-title-filtering.md.
 */

type SourceKey = 'workday' | 'careers' | 'mncs';

interface SourceState {
  loading: boolean;
  tenantsDone: number;
  tenantsTotal: number;
  withResults: number;
  cacheHit: boolean;
  error: string | null;
}

const SOURCE_LABELS: Record<SourceKey, string> = {
  workday: 'Enterprise (Workday)',
  careers: 'Startups & scale-ups',
  mncs: 'MNCs · Big Tech',
};

const EMPTY_STATE: SourceState = {
  loading: false,
  tenantsDone: 0,
  tenantsTotal: 0,
  withResults: 0,
  cacheHit: false,
  error: null,
};

const INIT_SOURCES: Record<SourceKey, WorkdayJob[]> = { workday: [], careers: [], mncs: [] };
const INIT_POLICIES: Record<SourceKey, PolicyBlock | null> = { workday: null, careers: null, mncs: null };
const INIT_STATES: Record<SourceKey, SourceState> = {
  workday: { ...EMPTY_STATE },
  careers: { ...EMPTY_STATE },
  mncs: { ...EMPTY_STATE },
};

// ── Saved scan params (dedicated versioned key) ─────────────────────────────
// The combined feed persists its location/remote scan params per browser so
// reopening the tab restores the setup instantly. TITLES are NOT stored here:
// they live in the shared `useJobTitles` store (which writes them through to
// the same key), so Careers and Opportunities always search the same set.
const COMBINED_PREFS_KEY = 'combined_jobs_prefs_v1';

export interface CombinedJobsPrefs {
  titles?: string[];
  location?: string;
  remoteOnly?: boolean;
  /** Server-side US country facet. Defaults to true when unset. */
  usOnly?: boolean;
  /** US-only narrowing: selected state name / "Remote" / "" for anywhere. */
  usState?: string;
  /** US-only narrowing: optional city. */
  city?: string;
  /** Where to work: ISO country code or "ANY" (src/lib/places.ts). */
  country?: string;
  /** A state, province or region of `country`. */
  region?: string;
  /** `accountKey.currentAccountKey()` of the account that saved it. */
  owner?: string;
}

/** The saved scan scope - unless another account saved it on this browser,
 *  in which case it is not this seeker's and reads as nothing saved. */
export function loadCombinedPrefs(): CombinedJobsPrefs {
  try {
    const raw = window.localStorage.getItem(COMBINED_PREFS_KEY);
    const prefs = raw ? (JSON.parse(raw) as CombinedJobsPrefs) : {};
    return ownedByAnotherAccount(prefs.owner) ? {} : prefs;
  } catch {
    return {};
  }
}

/** Merges into the stored object so the shared title set is never dropped. */
export function saveCombinedPrefs(prefs: CombinedJobsPrefs): void {
  try {
    const prev = loadCombinedPrefs();
    window.localStorage.setItem(
      COMBINED_PREFS_KEY,
      JSON.stringify({ ...prev, ...prefs, owner: currentAccountKey() || prev.owner }),
    );
  } catch {
    /* storage full/unavailable - non-fatal */
  }
}

/** Case-insensitive, order-independent set equality. */
function sameTitleSet(a: string[], b: string[]): boolean {
  const setA = new Set(a.map((t) => t.toLowerCase()));
  const setB = new Set(b.map((t) => t.toLowerCase()));
  if (setA.size !== setB.size) return false;
  for (const t of setA) if (!setB.has(t)) return false;
  return true;
}

export interface CombinedJobsController {
  /** Deduped, ranked merge of all three catalogs (updates live while scanning). */
  jobs: WorkdayJob[];
  /** True while ANY of the three scans is in flight. */
  loading: boolean;
  /** Per-catalog progress (for the source-chip readout). */
  states: Record<SourceKey, SourceState>;
  sourceLabels: Record<SourceKey, string>;
  /** Aggregate scan progress across all three. */
  progress: { done: number; total: number };
  /** Whether resume titles have hydrated (search seed is ready). */
  ready: boolean;
  /** 0 = no parsed resume on this account (scores unavailable). */
  resumeSkillCount: number | null;
  /** Whether any scan has completed at least once. */
  hasResult: boolean;
  /** Role titles currently driving all three scans (user-editable). Shared
   *  with the Career-portal panels via the `useJobTitles` store. */
  titles: string[];
  setTitles: (next: string[] | ((prev: string[]) => string[])) => void;
  /** Original resume-derived titles - the ChipsInput Reset target. */
  resumeTitles: string[];
  /** LLM title synthesizer - merges suggestions into the current set (cap 40). */
  smartSuggestTitles: () => Promise<void>;
  suggestingTitles: boolean;
  /** False when there are no titles - run() would be a meaningless scan. */
  canSearch: boolean;
  /** Snapshot of the titles the most recent scan actually used. */
  lastScanTitles: string[] | null;
  /** True when results exist but the title set changed since that scan. */
  titlesPending: boolean;
  /**
   * The direct-employer policy the server applied across the three scans,
   * with its exclusion counts summed. Null on an older backend.
   */
  policy: PolicyBlock | null;
  /** Epoch ms the board on screen was BUILT (by the server's refresh or by a
   *  scan), or null before any. Drives "Updated N min ago". */
  builtAt: number | null;
  /**
   * ISO UTC end of this user's previous visit, from the stored board, or null
   * when unknown (first visit, older backend, no snapshot read yet). The first
   * value this session receives is kept for the whole session, so "New since
   * your last visit" does not shrink under the user at a 30-minute refresh.
   */
  seenThrough: string | null;
  /**
   * Bring the board up to date. Reads the server's stored board first
   * (`/jobs/board/snapshot`): a fresh one is the answer and nothing scans; a
   * stale one is shown at once while the three scans replace it. A forced
   * manual sync (Sync now) always scans. `force` bypasses the server cache.
   */
  run: (
    force: boolean,
    opts?: { location?: string; remoteOnly?: boolean; usOnly?: boolean },
    reason?: SyncReason,
  ) => Promise<SyncOutcome>;
  /**
   * A background refresh found roles that are not on screen. They wait here
   * instead of reshuffling the list under the reader; `applyPending` shows
   * them. Null when nothing is waiting.
   */
  pendingNewCount: number;
  applyPending: () => void;
  /** Roles that just arrived from `applyPending`, for a one-time highlight. */
  arrivedIds: ReadonlySet<string>;
  /** A quiet background refresh is running (the list is not changing). */
  refreshing: boolean;
}

/**
 * Combined career-portal feed: fans out the Workday, career-pages and MNC
 * scans in parallel, streams each catalog's partials, and merges them into one
 * deduped, ranked list. The same free engine backs all three, so this is the
 * "everything, in one feed" view (vs. the per-catalog CareerPortals tab).
 */
export function useCombinedJobs(enabled = true): CombinedJobsController {
  const [sources, setSources] = useState<Record<SourceKey, WorkdayJob[]>>(INIT_SOURCES);
  const [states, setStates] = useState<Record<SourceKey, SourceState>>(INIT_STATES);
  const [policies, setPolicies] = useState<Record<SourceKey, PolicyBlock | null>>(INIT_POLICIES);
  const [lastScanTitles, setLastScanTitles] = useState<string[] | null>(null);
  const [resumeSkillCount, setResumeSkillCount] = useState<number | null>(null);
  const [hasResult, setHasResult] = useState(false);
  const [builtAt, setBuiltAt] = useState<number | null>(null);
  const [seenThrough, setSeenThrough] = useState<string | null>(null);

  // The search seed is SHARED with the Career-portal panels: one hydration
  // (resume seed + thin-resume synth), one saved set, one cap. Passing
  // `enabled` keeps it lazy, so no resume fetch or LLM call fires for a user
  // who never opens Jobs.
  const {
    titles,
    setTitles,
    resumeTitles,
    ready,
    smartSuggestTitles,
    suggesting: suggestingTitles,
  } = useJobTitles(enabled);

  const titlesRef = useRef<string[]>([]);
  titlesRef.current = titles;

  // A background refresh is STAGED: it fills these instead of the list on
  // screen, and only roles that are new to the reader are offered.
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const hasResultRef = useRef(false);
  const stagingRef = useRef(false);
  const stagedRef = useRef<Record<SourceKey, WorkdayJob[]> | null>(null);
  const stagedBuiltRef = useRef<number | null>(null);
  const [pendingNewIds, setPendingNewIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [arrivedIds, setArrivedIds] = useState<ReadonlySet<string>>(() => new Set());

  /** Render one finished tab - from a scan or from the stored board. */
  const applyResult = useCallback((key: SourceKey, data: WorkdayJobsResult) => {
    if (stagingRef.current && stagedRef.current) {
      stagedRef.current = { ...stagedRef.current, [key]: data.jobs ?? [] };
      return;
    }
    setSources((s) => ({ ...s, [key]: data.jobs ?? [] }));
    // Absent on an older backend - and then it must not keep a previous
    // scan's counts, which would describe a different result set.
    setPolicies((p) => ({ ...p, [key]: data.policy ?? null }));
    setStates((s) => ({
      ...s,
      [key]: {
        loading: false,
        tenantsDone: data.tenants_done ?? 0,
        tenantsTotal: data.tenants_total ?? 0,
        withResults: data.tenants_with_results ?? 0,
        cacheHit: !!data.cache_hit,
        error: null,
      },
    }));
    if (data.resume_skill_count != null) setResumeSkillCount(data.resume_skill_count);
    setHasResult(true);
  }, []);

  const runOne = useCallback(
    async (key: SourceKey, fn: typeof apiService.searchWorkdayJobs, params: WorkdayJobsParams) => {
      // A staged (background) refresh is quiet: the list and its status line
      // stay as they are while it runs.
      const quiet = stagingRef.current;
      if (!quiet) setStates((s) => ({ ...s, [key]: { ...EMPTY_STATE, loading: true } }));
      const resp = await fn(params, (partial) => {
        // A staged refresh never streams into the list on screen.
        if (partial?.jobs?.length && !stagingRef.current) {
          setSources((s) => ({ ...s, [key]: partial.jobs }));
        }
        if (partial?.policy && !quiet) setPolicies((p) => ({ ...p, [key]: partial.policy ?? null }));
        if (quiet) return;
        setStates((s) => ({
          ...s,
          [key]: {
            ...s[key],
            loading: true,
            tenantsDone: partial.progress?.tenants_done ?? s[key].tenantsDone,
            tenantsTotal: partial.progress?.tenants_total ?? s[key].tenantsTotal,
          },
        }));
      });
      if (resp.error) {
        if (quiet) return false;
        setStates((s) => ({
          ...s,
          [key]: { ...s[key], loading: false, error: resp.error ?? 'Scan failed' },
        }));
        return false;
      }
      if (resp.data) applyResult(key, resp.data);
      return true;
    },
    [applyResult],
  );

  /**
   * Show the board the server already built for these params. Returns
   * 'fresh' (it is the answer), 'shown' (rendered, but a scan should follow)
   * or 'none'. Never throws: a failed read is just "nothing stored".
   */
  const loadSnapshot = useCallback(
    async (params: WorkdayJobsParams): Promise<'fresh' | 'shown' | 'none'> => {
      let snap: BoardSnapshot | undefined;
      try {
        snap = (await apiService.getBoardSnapshot(params)).data;
      } catch {
        return 'none';
      }
      const through = snap?.seen_through;
      if (typeof through === 'string' && through.trim()) {
        setSeenThrough((prev) => prev ?? through);
      }
      if (!snap?.available) return 'none';
      let shown = false;
      for (const key of ['workday', 'careers', 'mncs'] as SourceKey[]) {
        const data = snap.sources?.[key];
        if (data && Array.isArray(data.jobs)) {
          applyResult(key, data);
          shown = true;
        }
      }
      if (!shown) return 'none';
      const built = snap.built_at ? Date.parse(snap.built_at) : NaN;
      if (stagingRef.current) stagedBuiltRef.current = Number.isFinite(built) ? built : null;
      else setBuiltAt(Number.isFinite(built) ? built : null);
      return snap.fresh ? 'fresh' : 'shown';
    },
    [applyResult],
  );

  const run = useCallback(
    async (
      force: boolean,
      opts?: { location?: string; remoteOnly?: boolean; usOnly?: boolean },
      reason?: SyncReason,
    ) => {
      // Snapshot the ref the moment the scan starts so all three sources search
      // the exact same title set, even if the user keeps editing mid-scan.
      const titlesSnapshot = titlesRef.current;
      if (titlesSnapshot.length === 0) return; // nothing to search - skip the fan-out
      setLastScanTitles(titlesSnapshot);
      const params: WorkdayJobsParams = {
        titles: titlesSnapshot,
        location: opts?.location ?? '',
        remote_only: opts?.remoteOnly ?? false,
        // US-only is the default posture: the backend drops ambiguous/foreign
        // rows unless the user explicitly opts out. Sent on every scan.
        us_only: opts?.usOnly ?? true,
        // Marks these as the For-you board's scans: the server stores the
        // result as this user's board and keeps it warm every 30 minutes.
        board: 'for_you',
      };
      // Opening the board, the 30-minute tick and the day rollover read the
      // stored board first; only "Sync now" (manual + force) skips it. A
      // fresh board needs no scan at all - which is the whole point: opening
      // Jobs is a read, not three scans.
      //
      // The 30-minute tick is STAGED once something is on screen: what it
      // brings is compared with what the reader is looking at, and only roles
      // they have not seen are offered ("5 new roles"), never reshuffled in.
      const staged = reason === 'interval' && hasResultRef.current;
      stagingRef.current = staged;
      if (staged) setRefreshing(true);
      stagedRef.current = staged ? { ...sourcesRef.current } : null;
      stagedBuiltRef.current = null;
      let outcome: SyncOutcome = 'ok';
      try {
        let snapshot: 'fresh' | 'shown' | 'none' = 'none';
        if (reason !== 'manual' || !force) {
          snapshot = await loadSnapshot(params);
        }
        if (snapshot !== 'fresh') {
          const results = await Promise.all([
            runOne('workday', apiService.searchWorkdayJobs.bind(apiService), { ...params, force_refresh: force }),
            runOne('careers', apiService.searchCareerPagesJobs.bind(apiService), { ...params, force_refresh: force }),
            runOne('mncs', apiService.searchMncJobs.bind(apiService), { ...params, force_refresh: force }),
          ]);
          // Every source failed and nothing stored stood in: a failed refresh.
          if (results.every((ok) => !ok) && snapshot === 'none') outcome = 'error';
          else if (staged) stagedBuiltRef.current = Date.now();
          else setBuiltAt(Date.now());
        }
      } finally {
        stagingRef.current = false;
        setRefreshing(false);
      }
      if (staged && stagedRef.current && outcome !== 'error') {
        const on = new Set(
          mergeJobs(sourcesRef.current.workday, sourcesRef.current.careers, sourcesRef.current.mncs).map((j) => j.job_id),
        );
        const next = stagedRef.current;
        const fresh = mergeJobs(next.workday, next.careers, next.mncs)
          .map((j) => j.job_id)
          .filter((id) => !on.has(id));
        if (fresh.length === 0) {
          // Nothing new to the reader: take the refresh quietly.
          setSources(next);
          if (stagedBuiltRef.current) setBuiltAt(stagedBuiltRef.current);
          stagedRef.current = null;
          setPendingNewIds([]);
        } else {
          setPendingNewIds(fresh);
        }
      }
      return outcome;
    },
    [runOne, loadSnapshot],
  );

  const applyPending = useCallback(() => {
    const next = stagedRef.current;
    if (!next) return;
    setSources(next);
    if (stagedBuiltRef.current) setBuiltAt(stagedBuiltRef.current);
    stagedRef.current = null;
    setArrivedIds(new Set(pendingNewIds));
    setPendingNewIds([]);
  }, [pendingNewIds]);
  // The highlight is a moment, not a state: it clears itself.
  useEffect(() => {
    if (!arrivedIds.size) return;
    const id = window.setTimeout(() => setArrivedIds(new Set()), 8000);
    return () => window.clearTimeout(id);
  }, [arrivedIds]);

  const jobs = useMemo(() => mergeJobs(sources.workday, sources.careers, sources.mncs), [sources]);
  hasResultRef.current = hasResult;
  const policy = useMemo(
    () => mergePolicies([policies.workday, policies.careers, policies.mncs]),
    [policies],
  );

  const loading = states.workday.loading || states.careers.loading || states.mncs.loading;
  const progress = useMemo(() => {
    const done = states.workday.tenantsDone + states.careers.tenantsDone + states.mncs.tenantsDone;
    const total =
      states.workday.tenantsTotal + states.careers.tenantsTotal + states.mncs.tenantsTotal;
    return { done, total };
  }, [states]);

  const canSearch = titles.length > 0;
  const titlesPending = useMemo(
    () => hasResult && lastScanTitles != null && !sameTitleSet(titles, lastScanTitles),
    [hasResult, lastScanTitles, titles],
  );

  return {
    jobs,
    loading,
    states,
    sourceLabels: SOURCE_LABELS,
    progress,
    ready,
    resumeSkillCount,
    hasResult,
    titles,
    setTitles,
    resumeTitles,
    smartSuggestTitles,
    suggestingTitles,
    canSearch,
    lastScanTitles,
    titlesPending,
    policy,
    builtAt,
    seenThrough,
    run,
    pendingNewCount: pendingNewIds.length,
    applyPending,
    arrivedIds,
    refreshing,
  };
}
