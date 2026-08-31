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
 *   - hydration from the parsed-resume seed (ALL parsed resumes, not just active)
 *   - the thin-resume smart-suggest merge
 *   - persistence keyed by a resume-set fingerprint so the LLM synth runs
 *     only when an upload / delete / reparse actually changed the set
 *
 * It is a module-level store read through `useSyncExternalStore` rather than a
 * React context on purpose: the Careers panels and the Opportunities feed sit
 * in different subtrees (and different lazy routes), so a provider would have
 * to be hoisted to the app root AND still would not survive a subtree that
 * renders standalone. A module store gives every surface the same value with
 * no mounting contract, and gives hydration a natural once-per-session guard.
 *
 * Durable cache is two-layer:
 *   - browser `combined_jobs_prefs_v1` (titles + fingerprint) so a refresh
 *     does not re-synth
 *   - server `job_filter_preferences.title_seed` so a new browser / Daily
 *     Pipeline share the same synth and do not pay Bedrock again
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { apiService } from '@/lib/api';
import type { JobTitleSeed } from '@/types/jobs';

/** Hard ceiling on the title set. The scan endpoints fan out per title, so an
 *  unbounded list is a slow scan, not a better one. */
export const JOB_TITLES_CAP = 40;

/** Parsed resumes often carry only 1-2 messy past titles, which is a weak
 *  search seed. Below this we auto-run the LLM title synthesizer once per
 *  fingerprint (server-cached after that). */
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
/** Last fingerprint we synced this session. Cheap GETs with the same
 *  fingerprint skip merge + synth. */
let lastSyncedFingerprint: string | null = null;

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
  fingerprint?: string;
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

function readCachedFingerprint(): string {
  const fp = readCache(CACHE_KEY).fingerprint;
  return typeof fp === 'string' ? fp : '';
}

/**
 * Write-through persistence. Merges into the existing prefs object so the
 * scan params stored alongside (location, remoteOnly) are never dropped.
 */
function persistTitles(titles: string[], fingerprint?: string) {
  if (typeof window === 'undefined') return;
  try {
    const prev = readCache(CACHE_KEY);
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...prev,
        titles,
        fingerprint: fingerprint ?? prev.fingerprint,
      }),
    );
  } catch {
    /* storage full or unavailable: non-fatal, the set stays in memory */
  }
}

// ── Seed fetch ──────────────────────────────────────────────────────────────

async function loadTitleSeed(): Promise<JobTitleSeed> {
  const seed = await apiService.getTitleSeed();
  if (seed.data && Array.isArray(seed.data.resume_titles)) {
    return {
      fingerprint: seed.data.fingerprint ?? '',
      resume_titles: seed.data.resume_titles,
      synth_titles: seed.data.synth_titles ?? [],
      resume_count: seed.data.resume_count ?? 0,
      cached: seed.data.cached ?? true,
    };
  }
  // Deploy skew: older backends have no /title-seed. Fall back to the
  // active-resume GET (may include additive job_titles_all).
  const resume = await apiService.getResume();
  const all =
    resume.data?.resume?.job_titles_all ??
    resume.data?.resume?.job_titles ??
    [];
  return {
    fingerprint: '',
    resume_titles: all,
    synth_titles: [],
    resume_count: all.length ? 1 : 0,
    cached: false,
  };
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
 * Seed the shared set. Concurrent callers (Careers and Opportunities mounting
 * together) share one in-flight promise, so the seed fetch and the synth
 * call fire exactly once.
 *
 * Resume-set fingerprint:
 *   - same fingerprint as last sync / localStorage → reuse chips, no LLM
 *   - fingerprint changed (upload / delete / reparse) → merge new resume
 *     titles into the user-edited set (never wipe custom chips)
 *   - union still thinner than THIN_RESUME_TITLES → use server-cached
 *     synth_titles, and only then call suggest-filters (itself cached)
 */
export function hydrateJobTitles(): Promise<void> {
  if (hydration) return hydration;
  hydration = (async () => {
    try {
      const seed = await loadTitleSeed();
      const fp = seed.fingerprint;
      const resumeTitles = seed.resume_titles.slice(0, JOB_TITLES_CAP);

      if (state.ready && lastSyncedFingerprint === fp && fp) {
        setState({ resumeTitles });
        return;
      }

      const saved = readCachedTitles();
      const cachedFp = readCachedFingerprint();
      const fingerprintUnchanged = Boolean(fp) && cachedFp === fp;

      let titles: string[];
      if (saved.length && fingerprintUnchanged) {
        titles = saved.slice(0, JOB_TITLES_CAP);
      } else if (saved.length) {
        titles = mergeTitles(saved, resumeTitles);
      } else {
        titles = resumeTitles.slice(0, JOB_TITLES_CAP);
      }

      const thin = resumeTitles.length < THIN_RESUME_TITLES;
      const needSynth =
        thin &&
        seed.resume_count > 0 &&
        !(saved.length && fingerprintUnchanged);
      if (needSynth) {
        let synth = seed.synth_titles;
        if (!synth.length) {
          const suggested = await apiService.suggestPipelineFilters();
          synth = suggested.data?.suggestions?.workday_titles ?? [];
        }
        if (synth.length) titles = mergeTitles(titles, synth);
      }

      lastSyncedFingerprint = fp || lastSyncedFingerprint;
      setState({ titles, resumeTitles, ready: true });
      if (titles.length) persistTitles(titles, fp || undefined);
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
 * Drop the in-flight / session fingerprint so the next hydrate re-reads the
 * server seed. Call after a resume upload, delete, or reparse — those are
 * the only events that should ever re-run the (cached) title pipeline.
 */
export function invalidateJobTitleSeed(): void {
  lastSyncedFingerprint = null;
  hydration = null;
  // Only re-sync if a jobs surface already hydrated. Otherwise the next
  // Jobs visit fetches the new seed; no point paying even a cheap GET
  // (or a thin-resume synth) for a user who never searches jobs.
  if (state.ready) void hydrateJobTitles();
}

/**
 * The LLM title synthesizer, merged case-insensitively into whatever the user
 * already has. Same endpoint the Daily Pipeline's Smart Filters use; the
 * backend returns the fingerprint-cached bundle when resumes have not changed.
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
  lastSyncedFingerprint = null;
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('resume:set-changed', () => {
    invalidateJobTitleSeed();
  });
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
