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
import type { ExperienceView, JobTitleSeed } from '@/types/jobs';

/** Hard ceiling on the title set. The scan endpoints fan out per title, so an
 *  unbounded list is a slow scan, not a better one. */
export const JOB_TITLES_CAP = 40;

/** Parsed resumes often carry only 1-2 messy past titles, which is a weak
 *  search seed. Below this we auto-run the LLM title synthesizer once per
 *  fingerprint (server-cached after that). */
const THIN_RESUME_TITLES = 4;

/**
 * Browser cache key.
 *
 * Bumped to v2 deliberately. Every v1 cache holds titles from before the
 * backend canonicalized them - held titles like "Software Engineer, Contract"
 * and synthesized ones like "Cloud Engineer AWS Terraform", which match no
 * real posting. Because a cached set with an unchanged fingerprint is used
 * verbatim and nothing here ever repaired a title, those browsers would keep
 * an empty feed forever. The bump re-seeds every browser exactly once from
 * `match_titles`, after which curation is respected again.
 *
 * v1 is deliberately NOT in `LEGACY_CACHE_KEYS`: migrating it would carry the
 * defective titles straight back in, which is the whole thing being repaired.
 */
const CACHE_KEY = 'combined_jobs_prefs_v2';

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
  /** The levels the board opens on, from the seed. Null until it loads. */
  experienceView: ExperienceView | null;
  /** The last time a resume change re-derived the set, for the "titles
   *  updated" notice and its Undo. Null when nothing changed. */
  resumeSync: ResumeTitleSync | null;
  /** Saved titles that are not from the current resume, on a set saved
   *  before provenance was tracked. Shown once for the seeker to decide;
   *  never removed silently. */
  reviewTitles: string[];
  /** Bumped whenever a resume change replaced titles, so a feed that has
   *  already scanned re-runs with them instead of waiting for "Search". */
  syncRevision: number;
}

export interface ResumeTitleSync {
  id: number;
  added: string[];
  removed: string[];
  /** The set before the sync - what Undo restores. */
  previous: string[];
}

const INITIAL: JobTitlesState = {
  titles: [],
  resumeTitles: [],
  ready: false,
  suggesting: false,
  experienceView: null,
  resumeSync: null,
  reviewTitles: [],
  syncRevision: 0,
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
  /** The titles that came FROM the resume (the seed, plus "Suggest from
   *  resume") when `titles` was derived. Anything in `titles` outside it was
   *  typed by the seeker; anything in it but missing from `titles` was
   *  deleted by them. Absent on a set saved before 2026-10-26. */
  seed?: string[];
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

/**
 * Saved titles, falling back to the retired per-panel keys once.
 *
 * `allowLegacy` is false whenever the server has canonical `match_titles`.
 * The retired keys were written before titles were canonicalized, so they
 * hold exactly what this change exists to remove — held titles like
 * "Associate Software Developer Intern" and pre-normalisation spellings like
 * "Cloud/DevOps Engineer". Bumping CACHE_KEY to v2 was not enough on its own:
 * with v2 empty the fallback re-imported those titles from the legacy keys,
 * and because `readCachedFingerprint` only ever reads CACHE_KEY the result
 * looked like a fingerprint MISMATCH, which merges rather than replaces. A
 * user on the fixed build still saw three intern/legacy titles appended to
 * their sixteen canonical ones.
 */
function readCachedTitles(allowLegacy = true): string[] {
  const own = (readCache(CACHE_KEY).titles ?? []).filter(Boolean);
  if (own.length) return own;
  if (!allowLegacy) return [];
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

/** The resume-derived baseline, or null on a set saved before it existed. */
function readCachedSeed(): string[] | null {
  const seed = readCache(CACHE_KEY).seed;
  return Array.isArray(seed) ? seed.filter((t): t is string => typeof t === 'string') : null;
}

/**
 * Write-through persistence. Merges into the existing prefs object so the
 * scan params stored alongside (location, remoteOnly) are never dropped.
 */
function persistTitles(titles: string[], fingerprint?: string, seed?: string[]) {
  if (typeof window === 'undefined') return;
  try {
    const prev = readCache(CACHE_KEY);
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        ...prev,
        titles,
        fingerprint: fingerprint ?? prev.fingerprint,
        seed: seed ?? prev.seed,
      }),
    );
  } catch {
    /* storage full or unavailable: non-fatal, the set stays in memory */
  }
}

const lower = (titles: string[]) => new Set(titles.map((t) => t.toLowerCase()));
const without = (titles: string[], drop: Set<string>) =>
  titles.filter((t) => !drop.has(t.toLowerCase()));
/** Uncapped case-insensitive union - a baseline is bookkeeping, not a search. */
const union = (a: string[], b: string[]) => [...a, ...without(b, lower(a))];

let syncId = 0;
/** The resume-derived titles of the current seed, for resolving a review. */
let currentSeedBase: string[] = [];

// ── Seed fetch ──────────────────────────────────────────────────────────────

async function loadTitleSeed(): Promise<JobTitleSeed> {
  const seed = await apiService.getTitleSeed();
  if (seed.data && Array.isArray(seed.data.resume_titles)) {
    return {
      fingerprint: seed.data.fingerprint ?? '',
      resume_titles: seed.data.resume_titles,
      synth_titles: seed.data.synth_titles ?? [],
      match_titles: seed.data.match_titles ?? [],
      off_domain_titles: seed.data.off_domain_titles ?? [],
      resume_count: seed.data.resume_count ?? 0,
      cached: seed.data.cached ?? true,
      experience_view: seed.data.experience_view,
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
 *   - fingerprint changed (upload / delete / reparse) → the old resume's
 *     titles give way to the new seed; typed chips and deletions are kept
 *     (`seed` baseline). A set saved before the baseline existed keeps the
 *     old merge and gets a one-time review instead of a silent change
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

      const experienceView = seed.experience_view ?? null;
      if (state.ready && lastSyncedFingerprint === fp && fp) {
        setState({ resumeTitles, experienceView });
        return;
      }

      // Legacy per-panel caches are only trusted when the server has no
      // canonical list to offer. See `readCachedTitles`.
      //
      // A saved chip the server names as a different occupation for this
      // user is dropped. "Suggest from resume" used to hand an electrical
      // engineer SDE and IT-support titles, and because a saved set wins
      // outright below, those chips kept searching software jobs on every
      // visit (reported 2026-10-21). Exact titles only - the client never
      // classifies anything itself - and never one the seed itself proposes.
      const offDomain = new Set((seed.off_domain_titles ?? []).map((t) => t.toLowerCase()));
      const seedKeys = new Set((seed.match_titles ?? []).map((t) => t.toLowerCase()));
      const saved = readCachedTitles(!seed.match_titles?.length).filter(
        (t) => !offDomain.has(t.toLowerCase()) || seedKeys.has(t.toLowerCase()),
      );
      const cachedFp = readCachedFingerprint();
      const fingerprintUnchanged = Boolean(fp) && cachedFp === fp;

      // What we actually search with. `resume_titles` are titles the person
      // has HELD - "Software Engineering Intern", "Software Engineer,
      // Contract" - and matching a posting against those found 50 of 30,342
      // live postings, 49 of them internships. `match_titles` is the same
      // intent rewritten by the backend into canonical role names that do
      // match. Fall back to held titles only for a backend too old to send it.
      const seedTitles = seed.match_titles?.length ? seed.match_titles : resumeTitles;

      const baseline = readCachedSeed();
      let resumeSync: ResumeTitleSync | null = null;
      let titles: string[];
      if (saved.length && fingerprintUnchanged) {
        // The user's own curation wins outright. Merging the seed back in
        // here would make DELETING a title impossible - it would reappear on
        // every reload - which is the mirror image of the bug this change
        // exists to fix. Browsers holding a pre-canonicalization set are
        // repaired once by the CACHE_KEY bump instead.
        titles = saved.slice(0, JOB_TITLES_CAP);
      } else if (saved.length && baseline) {
        // Resumes changed and we know where every saved title came from. The
        // titles the OLD resume put there give way to the new seed; titles
        // the seeker typed stay, and so do their deletions. Merging the whole
        // old set back in (the branch below) left a seeker who changed resume
        // searching for their previous roles (reported 2026-10-26).
        const custom = without(saved, lower(baseline));
        const deleted = lower(without(baseline, lower(saved)));
        const fresh = without(seedTitles, deleted);
        titles = mergeTitles(fresh.length ? fresh : seedTitles, custom);
        const added = without(titles, lower(saved));
        const removed = without(saved, lower(titles));
        if (added.length || removed.length) {
          syncId += 1;
          resumeSync = { id: syncId, added, removed, previous: saved.slice(0, JOB_TITLES_CAP) };
        }
      } else if (saved.length) {
        // A set saved before provenance was tracked: a title outside the
        // seed may be one the seeker typed or one an old resume put there,
        // and nothing here can tell which. So it is NOT dropped - the review
        // notice below asks once instead. Resumes changed, so the FRESH seed leads. This was `mergeTitles(
        // saved, resumeTitles)` - stale titles first - which put the new ones
        // at the tail where `JOB_TITLES_CAP` cut them off, so re-uploading a
        // resume could not fix a broken title set.
        titles = mergeTitles(seedTitles, saved);
      } else {
        titles = seedTitles.slice(0, JOB_TITLES_CAP);
      }

      // Only for a backend that cannot canonicalize. When `match_titles` is
      // present the synth has already been folded into it server-side, and
      // the old `resumeTitles.length < 4` gate was actively harmful: it
      // switched the rescue OFF for users with several resumes, who have the
      // most held titles and therefore the most unmatchable ones.
      const needSynth =
        !seed.match_titles?.length &&
        resumeTitles.length < THIN_RESUME_TITLES &&
        seed.resume_count > 0 &&
        !(saved.length && fingerprintUnchanged);
      let seedBase = seedTitles;
      if (needSynth) {
        let synth = seed.synth_titles;
        if (!synth.length) {
          const suggested = await apiService.suggestPipelineFilters();
          synth = suggested.data?.suggestions?.workday_titles ?? [];
        }
        if (synth.length) {
          titles = mergeTitles(titles, synth);
          seedBase = union(seedBase, synth);
        }
      }
      currentSeedBase = seedBase;

      // Only a set with no recorded baseline is reviewed, and only for titles
      // the current resume does not account for.
      const reviewTitles = baseline === null && saved.length ? without(titles, lower(seedBase)) : [];
      // The baseline to record: kept as-is while the resume set is unchanged
      // (it may hold "Suggest from resume" titles), left unset while a review
      // is pending, and the fresh seed otherwise.
      const nextSeed =
        (baseline && fingerprintUnchanged) || reviewTitles.length ? undefined : seedBase;

      lastSyncedFingerprint = fp || lastSyncedFingerprint;
      // `resumeTitles` is the ChipsInput "Reset" target. It must be the
      // searchable set, not the held one - resetting used to restore exactly
      // the titles that match nothing.
      setState({
        titles,
        resumeTitles: seedTitles,
        experienceView,
        ready: true,
        reviewTitles,
        ...(resumeSync ? { resumeSync, syncRevision: state.syncRevision + 1 } : {}),
      });
      if (titles.length) persistTitles(titles, fp || undefined, nextSeed);
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
    if (suggested.length) {
      setJobTitles((prev) => mergeTitles(prev, suggested));
      // Suggestions come FROM the resume, so they belong to the baseline and
      // give way to a new resume like the seed does - not kept as if typed.
      const base = readCachedSeed();
      if (base && state.ready) persistTitles(state.titles, undefined, union(base, suggested));
    }
  } finally {
    setState({ suggesting: false });
  }
}

/** Put back the set a resume change replaced. Those titles are then the
 *  seeker's own choice, so the next resume change keeps them. */
export function undoResumeTitleSync(): void {
  const sync = state.resumeSync;
  if (!sync) return;
  setState({ resumeSync: null, syncRevision: state.syncRevision + 1 });
  setJobTitles(sync.previous);
}

/**
 * Answer the one-time review of titles the current resume does not account
 * for. Either way the baseline is recorded, so the question is never asked
 * again and later resume changes are handled automatically.
 */
export function resolveTitleReview(useResumeTitles: boolean): void {
  const stale = lower(state.reviewTitles);
  if (!stale.size) return;
  let titles = state.titles;
  if (useResumeTitles) {
    titles = without(state.titles, stale);
    if (!titles.length) titles = state.resumeTitles.slice(0, JOB_TITLES_CAP);
  }
  setState({
    reviewTitles: [],
    ...(useResumeTitles ? { titles, syncRevision: state.syncRevision + 1 } : {}),
  });
  persistTitles(titles, undefined, currentSeedBase);
}

/** Test-only: drop the shared set and the once-per-session hydration guard. */
export function resetJobTitlesStore(): void {
  state = INITIAL;
  hydration = null;
  lastSyncedFingerprint = null;
  currentSeedBase = [];
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
  /** The levels the board opens on; null until the seed has loaded. */
  experienceView: ExperienceView | null;
  /** What the last resume change did to the set (null when nothing). */
  resumeSync: ResumeTitleSync | null;
  undoResumeSync: () => void;
  /** Saved titles the current resume does not account for, awaiting a
   *  one-time answer. Empty almost always. */
  reviewTitles: string[];
  resolveReview: (useResumeTitles: boolean) => void;
  /** Bumped when a resume change replaced titles - re-scan on change. */
  syncRevision: number;
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
    experienceView: snapshot.experienceView,
    resumeSync: snapshot.resumeSync,
    undoResumeSync: undoResumeTitleSync,
    reviewTitles: snapshot.reviewTitles,
    resolveReview: resolveTitleReview,
    syncRevision: snapshot.syncRevision,
  };
}
