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
  /** Fire all three scans. `force` bypasses the server cache. */
  run: (force: boolean, opts?: { location?: string; remoteOnly?: boolean }) => Promise<void>;
}

/**
 * Combined career-portal feed: fans out the Workday, career-pages and MNC
 * scans in parallel, streams each catalog's partials, and merges them into one
 * deduped, ranked list. The same free engine backs all three, so this is the
 * "everything, in one feed" view (vs. the per-catalog CareerPortals tab).
 */
export function useCombinedJobs(): CombinedJobsController {
  const [sources, setSources] = useState<Record<SourceKey, WorkdayJob[]>>(INIT_SOURCES);
  const [states, setStates] = useState<Record<SourceKey, SourceState>>(INIT_STATES);
  const [titles, setTitles] = useState<string[]>([]);
  const [resumeSkillCount, setResumeSkillCount] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const titlesRef = useRef<string[]>([]);
  titlesRef.current = titles;

  // Hydrate the search seed from the parsed resume once (with an LLM-synth
  // fallback when the resume's own titles are too thin), mirroring the
  // per-catalog panel so the combined feed is seeded the same way.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resume = await apiService.getResume();
      if (cancelled) return;
      const fromResume: string[] = resume.data?.resume?.job_titles ?? [];
      if (fromResume.length) setTitles(fromResume.slice(0, 40));
      if (fromResume.length < 4) {
        const sugg = await apiService.suggestPipelineFilters();
        if (cancelled) return;
        const synth: string[] = sugg.data?.suggestions?.workday_titles ?? [];
        if (synth.length) {
          setTitles((prev) => {
            const seen = new Set(prev.map((t) => t.toLowerCase()));
            return [...prev, ...synth.filter((t) => !seen.has(t.toLowerCase()))].slice(0, 40);
          });
        }
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
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
    const params: WorkdayJobsParams = {
      titles: titlesRef.current,
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

  return {
    jobs, loading, states, sourceLabels: SOURCE_LABELS, progress,
    ready, resumeSkillCount, hasResult, run,
  };
}
