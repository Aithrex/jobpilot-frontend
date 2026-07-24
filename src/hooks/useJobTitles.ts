/**
 * The single source of truth for the user's searchable job titles.
 *
 * Before this hook the same title list was duplicated across four independent
 * stores (one per Career-portal variant, plus the combined Opportunities feed),
 * so editing titles in one surface had zero effect on the others and every
 * panel re-fired its own resume fetch + LLM title synth on mount.
 *
 * This module owns all of it exactly once:
 *   - the title list (capped at JOB_TITLES_CAP)
 *   - hydration from the parsed-resume seed
 *   - the thin-resume smart-suggest merge
 *   - persistence
 *
 * It is a module-level store read through `useSyncExternalStore` rather than a
 * React context on purpose: the Careers panels and the Opportunities feed sit
 * in different subtrees (and different lazy routes), so a provider would have
 * to be hoisted to the app root AND still would not survive a subtree that
 * renders standalone. A module store gives every surface the same value with
 * no mounting contract, and gives hydration a natural once-per-session guard.
 *
 * Persistence today is the browser cache below. The durable home is the
 * server-side `job_filter_preferences` document (unique per user_email), but
 * its `/api/jobs/filters` writer whitelists a fixed set of keys and would drop
 * a `job_titles` field, so server sync is deliberately not wired here yet.
 * `persistTitles` is the single seam to swap once the backend accepts it.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { apiService } from '@/lib/api';

/** Hard ceiling on the title set. The scan endpoints fan out per title, so an
 *  unbounded list is a slow scan, not a better one. */
export const JOB_TITLES_CAP = 40;

/** Parsed resumes often carry only 1-2 messy past titles, which is a weak
 *  search seed. Below this we auto-run the LLM title synthesizer once. */
const THIN_RESUME_TITLES = 4;

/** Browser cache key. Kept as the pre-existing combined-feed key so saved
 *  setups survive this refactor untouched. */
const CACHE_KEY = 'combined_jobs_prefs_v1';

/** The retired per-panel keys. Read once, for migration only, so a user who
 *  only ever used Career portals keeps the titles they curated there. */
const LEGACY_CACHE_KEYS = [
  'workday_jobs_prefs_v1',
  'career_pages_prefs_v1',
  'mnc_jobs_prefs_v1',
];

/** Case-insensitive merge of `extra` into `prev`, capped at JOB_TITLES_CAP. */
export function mergeTitles(prev: string[], extra: string[]): string[] {
  const seen = new Set(prev.map((t) => t.toLowerCase()));
  return [...prev, ...extra.filter((t) => !seen.has(t.toLowerCase()))].slice(0, JOB_TITLES_CAP);
}

interface JobTitlesState {
  /** Titles currently driving every scan (user-editable). */
  titles: string[];
  /** Original resume-derived titles: the ChipsInput "Reset" target. */
  resumeTitles: string[];
  /** True once hydration settled, so writers know the empty initial set is
   *  no longer live and cannot clobber a saved one. */
  ready: boolean;
  /** True while the LLM title synthesizer is running. */
  suggesting: boolean;
}

const INITIAL: JobTitlesState = {
  titles: [],
  resumeTitles: [],
  ready: false,
  suggesting: false,
};

let state: JobTitlesState = INITIAL;
const listeners = new Set<() => void>();
let hydration: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<JobTitlesState>) {
  state = { ...state, ...patch };
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): JobTitlesState {
  return state;
}

// ── Persistence ─────────────────────────────────────────────────────────────

interface CachedPrefs {
  titles?: string[];
  [key: string]: unknown;
}

function readCache(key: string): CachedPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as CachedPrefs) : {};
  } catch {
    return {};
  }
}

/** Saved titles, falling back to the retired per-panel keys once. */
function readCachedTitles(): string[] {
  const own = (readCache(CACHE_KEY).titles ?? []).filter(Boolean);
  if (own.length) return own;
  for (const key of LEGACY_CACHE_KEYS) {
    const legacy = (readCache(key).titles ?? []).filter(Boolean);
    if (legacy.length) return legacy;
  }
  return [];
}

/**
 * Write-through persistence. Merges into the existing prefs object so the
 * scan params stored alongside (location, remoteOnly) are never dropped.
 */
function persistTitles(titles: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...readCache(CACHE_KEY), titles }),
    );
  } catch {
    /* storage full or unavailable: non-fatal, the set stays in memory */
  }
}

// ── Actions ─────────────────────────────────────────────────────────────────

/**
 * Replace the shared title set. Accepts an updater so callers can merge
 * against the freshest value without re-rendering first. Capped, and written
 * through to the cache once hydration has settled (before that the set is
 * still the empty placeholder and must not overwrite a saved one).
 */
export function setJobTitles(next: string[] | ((prev: string[]) => string[])): void {
  const resolved = (typeof next === 'function' ? next(state.titles) : next)
    .slice(0, JOB_TITLES_CAP);
  setState({ titles: resolved });
  if (state.ready) persistTitles(resolved);
}

/**
 * Seed the shared set, once per session. Saved titles win outright: a later
 * resume fetch only refreshes the Reset defaults and NEVER clobbers a
 * user-edited set. With no saved set we seed from the parsed resume, and fall
 * back to the LLM synthesizer when the resume's own titles are too thin.
 *
 * Concurrent callers (Careers and Opportunities mounting together) share one
 * in-flight promise, so the resume fetch and the synth call fire exactly once.
 */
export function hydrateJobTitles(): Promise<void> {
  if (hydration) return hydration;
  hydration = (async () => {
    try {
      const saved = readCachedTitles();
      if (saved.length) {
        setState({ titles: saved.slice(0, JOB_TITLES_CAP), ready: true });
        const resume = await apiService.getResume();
        setState({ resumeTitles: resume.data?.resume?.job_titles ?? [] });
        return;
      }

      const resume = await apiService.getResume();
      const fromResume: string[] = resume.data?.resume?.job_titles ?? [];
      setState({ resumeTitles: fromResume });

      let seeded = fromResume.slice(0, JOB_TITLES_CAP);
      if (fromResume.length < THIN_RESUME_TITLES) {
        const suggested = await apiService.suggestPipelineFilters();
        const synth: string[] = suggested.data?.suggestions?.workday_titles ?? [];
        if (synth.length) seeded = mergeTitles(seeded, synth);
      }
      setState({ titles: seeded, ready: true });
      if (seeded.length) persistTitles(seeded);
    } catch {
      // A failed seed must not leave every panel stuck behind `ready`. Clear
      // the guard so the next mount retries.
      hydration = null;
      setState({ ready: true });
    }
  })();
  return hydration;
}

/**
 * The LLM title synthesizer, merged case-insensitively into whatever the user
 * already has. Same endpoint the Daily Pipeline's Smart Filters use.
 */
export async function smartSuggestJobTitles(): Promise<void> {
  if (state.suggesting) return;
  setState({ suggesting: true });
  try {
    const resp = await apiService.suggestPipelineFilters();
    const suggested: string[] = resp.data?.suggestions?.workday_titles ?? [];
    if (suggested.length) setJobTitles((prev) => mergeTitles(prev, suggested));
  } finally {
    setState({ suggesting: false });
  }
}

/** Test-only: drop the shared set and the once-per-session hydration guard. */
export function resetJobTitlesStore(): void {
  state = INITIAL;
  hydration = null;
  emit();
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface JobTitlesController {
  /** Titles driving every scan, shared across Careers and Opportunities. */
  titles: string[];
  setTitles: (next: string[] | ((prev: string[]) => string[])) => void;
  /** Resume-derived titles: the ChipsInput "Reset" target. */
  resumeTitles: string[];
  /** Whether the shared set finished hydrating (the search seed is ready). */
  ready: boolean;
  smartSuggestTitles: () => Promise<void>;
  suggesting: boolean;
}

/**
 * Read and edit the shared job-title set.
 *
 * @param enabled Defer hydration until the surface is actually in use, so a
 *   user who never opens a jobs surface pays no resume fetch and no LLM call.
 */
export function useJobTitles(enabled = true): JobTitlesController {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (enabled) void hydrateJobTitles();
  }, [enabled]);

  const setTitles = useCallback(
    (next: string[] | ((prev: string[]) => string[])) => setJobTitles(next),
    [],
  );
  const smartSuggestTitles = useCallback(() => smartSuggestJobTitles(), []);

  return {
    titles: snapshot.titles,
    setTitles,
    resumeTitles: snapshot.resumeTitles,
    ready: snapshot.ready,
    smartSuggestTitles,
    suggesting: snapshot.suggesting,
  };
}
