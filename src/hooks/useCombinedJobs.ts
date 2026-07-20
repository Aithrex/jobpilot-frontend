import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '@/lib/api';
import { mergeJobs } from '@/lib/careerJobs';
import type { WorkdayJob, WorkdayJobsParams } from '@/types/jobs';

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
  loading: false, tenantsDone: 0, tenantsTotal: 0, withResults: 0, cacheHit: false, error: null,
};

const INIT_SOURCES: Record<SourceKey, WorkdayJob[]> = { workday: [], careers: [], mncs: [] };
const INIT_STATES: Record<SourceKey, SourceState> = {
  workday: { ...EMPTY_STATE }, careers: { ...EMPTY_STATE }, mncs: { ...EMPTY_STATE },
};

// ── Saved setup (dedicated versioned key) ───────────────────────────────────
// The combined feed persists its search seed per browser so reopening the tab
// restores the user's titles/location instantly. The resume fetch afterwards
// only refreshes the Reset defaults — it NEVER clobbers a saved, user-edited
// title set (mirrors the per-catalog WorkdayJobsPanel prefs pattern).
const COMBINED_PREFS_KEY = 'combined_jobs_prefs_v1';

export interface CombinedJobsPrefs {
  titles?: string[];
  location?: string;
  remoteOnly?: boolean;
}

export function loadCombinedPrefs(): CombinedJobsPrefs {
  try {
    const raw = window.localStorage.getItem(COMBINED_PREFS_KEY);
    return raw ? (JSON.parse(raw) as CombinedJobsPrefs) : {};
  } catch {
    return {};
  }
}

export function saveCombinedPrefs(prefs: CombinedJobsPrefs): void {
  try {
    window.localStorage.setItem(COMBINED_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full/unavailable — non-fatal */
  }
}

/** Case-insensitive merge of `extra` into `prev`, capped at 40 titles. */
function mergeTitles(prev: string[], extra: string[]): string[] {
  const seen = new Set(prev.map((t) => t.toLowerCase()));
  return [...prev, ...extra.filter((t) => !seen.has(t.toLowerCase()))].slice(0, 40);
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
  /** Role titles currently driving all three scans (user-editable). */
  titles: string[];
  setTitles: (next: string[]) => void;
  /** Original resume-derived titles — the ChipsInput Reset target. */
  resumeTitles: string[];
  /** LLM title synthesizer — merges suggestions into the current set (cap 40). */
  smartSuggestTitles: () => Promise<void>;
  suggestingTitles: boolean;
  /** False when there are no titles — run() would be a meaningless scan. */
  canSearch: boolean;
  /** Snapshot of the titles the most recent scan actually used. */
  lastScanTitles: string[] | null;
  /** True when results exist but the title set changed since that scan. */
  titlesPending: boolean;
  /** Fire all three scans. `force` bypasses the server cache. */
  run: (force: boolean, opts?: { location?: string; remoteOnly?: boolean }) => Promise<void>;
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
  const [titles, setTitles] = useState<string[]>([]);
  const [resumeTitles, setResumeTitles] = useState<string[]>([]);
  const [suggestingTitles, setSuggestingTitles] = useState(false);
  const [lastScanTitles, setLastScanTitles] = useState<string[] | null>(null);
  const [resumeSkillCount, setResumeSkillCount] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const titlesRef = useRef<string[]>([]);
  const hydratedRef = useRef(false);
  titlesRef.current = titles;

  // Hydrate the search seed once — only after the feed is actually enabled
  // (i.e. the user opened Jobs), so no resume fetch / LLM title-synth fires
  // for users who never visit the tab. Saved prefs win: a user-edited title
  // set is restored as-is and the resume fetch only refreshes the Reset
  // defaults. Otherwise seed from the parsed resume, with an LLM-synth
  // fallback when the resume's own titles are too thin — mirroring the
  // per-catalog panel so the combined feed is seeded the same way.
  useEffect(() => {
    if (!enabled || hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;
    void (async () => {
      const savedTitles = (loadCombinedPrefs().titles ?? []).filter(Boolean);
      if (savedTitles.length) {
        setTitles(savedTitles.slice(0, 40));
        setReady(true);
        const resume = await apiService.getResume();
        if (!cancelled) setResumeTitles(resume.data?.resume?.job_titles ?? []);
        return;
      }
      const resume = await apiService.getResume();
      if (cancelled) return;
      const fromResume: string[] = resume.data?.resume?.job_titles ?? [];
      setResumeTitles(fromResume);
      if (fromResume.length) setTitles(fromResume.slice(0, 40));
      if (fromResume.length < 4) {
        const sugg = await apiService.suggestPipelineFilters();
        if (cancelled) return;
        const synth: string[] = sugg.data?.suggestions?.workday_titles ?? [];
        if (synth.length) setTitles((prev) => mergeTitles(prev, synth));
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  // Same LLM synthesizer the per-catalog panel's smart-suggest uses; merges
  // case-insensitively into whatever the user already has, capped at 40.
  const smartSuggestTitles = useCallback(async () => {
    setSuggestingTitles(true);
    const resp = await apiService.suggestPipelineFilters();
    setSuggestingTitles(false);
    const suggested: string[] = resp.data?.suggestions?.workday_titles ?? [];
    if (suggested.length) setTitles((prev) => mergeTitles(prev, suggested));
  }, []);

  const runOne = useCallback(async (
    key: SourceKey,
    fn: typeof apiService.searchWorkdayJobs,
    params: WorkdayJobsParams,
  ) => {
    setStates((s) => ({ ...s, [key]: { ...EMPTY_STATE, loading: true } }));
    const resp = await fn(params, (partial) => {
      if (partial?.jobs?.length) {
        setSources((s) => ({ ...s, [key]: partial.jobs }));
      }
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
      setStates((s) => ({ ...s, [key]: { ...s[key], loading: false, error: resp.error ?? 'Scan failed' } }));
      return;
    }
    const data = resp.data;
    if (data) {
      setSources((s) => ({ ...s, [key]: data.jobs }));
      setStates((s) => ({
        ...s,
        [key]: {
          loading: false,
          tenantsDone: data.tenants_done,
          tenantsTotal: data.tenants_total,
          withResults: data.tenants_with_results,
          cacheHit: data.cache_hit,
          error: null,
        },
      }));
      if (data.resume_skill_count != null) setResumeSkillCount(data.resume_skill_count);
      setHasResult(true);
    }
  }, []);

  const run = useCallback(async (force: boolean, opts?: { location?: string; remoteOnly?: boolean }) => {
    // Snapshot the ref the moment the scan starts so all three sources search
    // the exact same title set, even if the user keeps editing mid-scan.
    const titlesSnapshot = titlesRef.current;
    if (titlesSnapshot.length === 0) return; // nothing to search — skip the fan-out
    setLastScanTitles(titlesSnapshot);
    const params: WorkdayJobsParams = {
      titles: titlesSnapshot,
      location: opts?.location ?? '',
      remote_only: opts?.remoteOnly ?? false,
      force_refresh: force,
    };
    await Promise.all([
      runOne('workday', apiService.searchWorkdayJobs.bind(apiService), params),
      runOne('careers', apiService.searchCareerPagesJobs.bind(apiService), params),
      runOne('mncs', apiService.searchMncJobs.bind(apiService), params),
    ]);
  }, [runOne]);

  const jobs = useMemo(
    () => mergeJobs(sources.workday, sources.careers, sources.mncs),
    [sources],
  );

  const loading = states.workday.loading || states.careers.loading || states.mncs.loading;
  const progress = useMemo(() => {
    const done = states.workday.tenantsDone + states.careers.tenantsDone + states.mncs.tenantsDone;
    const total = states.workday.tenantsTotal + states.careers.tenantsTotal + states.mncs.tenantsTotal;
    return { done, total };
  }, [states]);

  const canSearch = titles.length > 0;
  const titlesPending = useMemo(
    () => hasResult && lastScanTitles != null && !sameTitleSet(titles, lastScanTitles),
    [hasResult, lastScanTitles, titles],
  );

  return {
    jobs, loading, states, sourceLabels: SOURCE_LABELS, progress,
    ready, resumeSkillCount, hasResult,
    titles, setTitles, resumeTitles,
    smartSuggestTitles, suggestingTitles,
    canSearch, lastScanTitles, titlesPending,
    run,
  };
}
