/**
 * Tech feed filter state: URL round-trip, wire mapping, saved searches.
 *
 * Three storage tiers, deliberately kept apart:
 *
 *  - THE URL owns the meaningful filters, so a search is shareable. Cursor,
 *    page size and personalization are NOT in the URL: they are transport and
 *    per-user concerns, and pasting someone else's cursor into your browser
 *    would resume a paging session that is not yours.
 *  - localStorage `aspirely.techFeed.savedSearches` owns searches the user
 *    explicitly kept.
 *  - localStorage `aspirely.techFeed.ui` owns throwaway chrome state (which
 *    filter groups are open). Never mixed with the above, so clearing one
 *    never loses the other.
 *
 * Array values are joined with "|" rather than "," because a city filter is
 * legitimately "Austin, TX".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { apiService } from '@/lib/api';

import type {
  ApplyMode,
  EmployerKindFilter,
  EmployerScope,
  SavedTechFeedSearch,
  TechFeedFilters,
  TechFeedSearchRequest,
  TechFeedSeniority,
  TechFeedSort,
  TechFeedWorkMode,
  TechScope,
} from '@/types/techFeed';

export const SAVED_SEARCHES_KEY = 'aspirely.techFeed.savedSearches';
export const UI_STATE_KEY = 'aspirely.techFeed.ui';

/** Text inputs write to the URL on this cadence so typing does not spam history. */
export const QUERY_DEBOUNCE_MS = 350;

const LIST_SEPARATOR = '|';

export const DEFAULT_POSTED_WITHIN_DAYS = 30;
export const MAX_POSTED_WITHIN_DAYS = 180;

export const DEFAULT_TECH_FEED_FILTERS: TechFeedFilters = {
  query: '',
  titles: [],
  roleFamilies: [],
  roleSpecialties: [],
  techScope: ['core'],
  skillsRequired: [],
  skillsPreferred: [],
  excludeSkills: [],
  excludeTitleTerms: [],
  excludeKeywords: [],
  excludeCompanies: [],
  countries: [],
  regions: [],
  cities: [],
  radiusKm: null,
  workModes: [],
  remoteEligibleLocations: [],
  timezoneOverlapHours: null,
  seniority: [],
  minYears: null,
  maxYears: null,
  employmentTypes: [],
  minSalary: null,
  salaryCurrency: null,
  payInterval: null,
  includeUnknownSalary: true,
  employerScope: 'any',
  employerKind: 'any',
  companyIds: [],
  companyCategories: [],
  sponsorshipPreference: null,
  workAuthorization: [],
  requiresClearance: null,
  postedWithinDays: DEFAULT_POSTED_WITHIN_DAYS,
  includeUndated: true,
  applyMode: 'any',
  sort: 'relevance',
};

// ── Param table ──────────────────────────────────────────────────
// One row per URL key. Order here is the order in the query string, which
// makes the serialized form stable and therefore usable as a React Query key.

type ListKey =
  | 'titles'
  | 'roleFamilies'
  | 'roleSpecialties'
  | 'techScope'
  | 'skillsRequired'
  | 'skillsPreferred'
  | 'excludeSkills'
  | 'excludeTitleTerms'
  | 'excludeKeywords'
  | 'excludeCompanies'
  | 'countries'
  | 'regions'
  | 'cities'
  | 'workModes'
  | 'remoteEligibleLocations'
  | 'seniority'
  | 'employmentTypes'
  | 'companyIds'
  | 'companyCategories'
  | 'workAuthorization';

const LIST_PARAMS: Array<[ListKey, string]> = [
  ['titles', 'titles'],
  ['roleFamilies', 'families'],
  ['roleSpecialties', 'specialties'],
  ['techScope', 'scope'],
  ['skillsRequired', 'skills'],
  ['skillsPreferred', 'skills_pref'],
  ['excludeSkills', 'ex_skills'],
  ['excludeTitleTerms', 'ex_titles'],
  ['excludeKeywords', 'ex_kw'],
  ['excludeCompanies', 'ex_companies'],
  ['countries', 'countries'],
  ['regions', 'regions'],
  ['cities', 'cities'],
  ['workModes', 'modes'],
  ['remoteEligibleLocations', 'remote_loc'],
  ['seniority', 'seniority'],
  ['employmentTypes', 'emp_types'],
  ['companyIds', 'companies'],
  ['companyCategories', 'company_cats'],
  ['workAuthorization', 'work_auth'],
];

type NumberKey = 'radiusKm' | 'timezoneOverlapHours' | 'minYears' | 'maxYears' | 'minSalary';

const NUMBER_PARAMS: Array<[NumberKey, string]> = [
  ['radiusKm', 'radius'],
  ['timezoneOverlapHours', 'tz_overlap'],
  ['minYears', 'min_years'],
  ['maxYears', 'max_years'],
  ['minSalary', 'min_salary'],
];

type TextKey = 'salaryCurrency' | 'payInterval' | 'sponsorshipPreference';

const TEXT_PARAMS: Array<[TextKey, string]> = [
  ['salaryCurrency', 'currency'],
  ['payInterval', 'pay_interval'],
  ['sponsorshipPreference', 'sponsorship'],
];

/** Every key this module owns - anything else in the URL is left untouched. */
export const TECH_FEED_PARAM_KEYS: string[] = [
  'q',
  ...LIST_PARAMS.map(([, param]) => param),
  ...NUMBER_PARAMS.map(([, param]) => param),
  ...TEXT_PARAMS.map(([, param]) => param),
  'unknown_salary',
  'employer_scope',
  'employer_kind',
  'clearance',
  'days',
  'undated',
  'apply',
  'sort',
];

// ── Parsing helpers ──────────────────────────────────────────────

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(LIST_SEPARATOR)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseEnumList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  const set = new Set<string>(allowed);
  return parseList(raw).filter((value): value is T => set.has(value));
}

function parseEnum<T extends string>(raw: string | null, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback;
}

function parseNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return fallback;
}

const TECH_SCOPES: readonly TechScope[] = ['core', 'adjacent', 'non_tech', 'unknown'];
const WORK_MODES: readonly TechFeedWorkMode[] = ['remote', 'hybrid', 'onsite', 'unknown'];
const SENIORITIES: readonly TechFeedSeniority[] = [
  'intern',
  'entry',
  'mid',
  'senior',
  'staff',
  'principal',
  'director',
  'executive',
  'unknown',
];
const EMPLOYER_SCOPES: readonly EmployerScope[] = ['any', 'tech_only'];
const EMPLOYER_KINDS: readonly EmployerKindFilter[] = [
  'any',
  'direct_employer',
  'staffing',
  'marketplace',
];
const APPLY_MODES: readonly ApplyMode[] = ['any', 'direct_apply'];
const SORTS: readonly TechFeedSort[] = ['relevance', 'newest', 'salary'];

export { TECH_SCOPES, WORK_MODES, SENIORITIES, EMPLOYER_KINDS, SORTS };

// ── Serialize ────────────────────────────────────────────────────

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Only values that differ from the default are written, so a pristine search
 * has a clean URL and two equivalent filter states serialize identically.
 */
export function filtersToSearchParams(filters: TechFeedFilters): URLSearchParams {
  const params = new URLSearchParams();
  const d = DEFAULT_TECH_FEED_FILTERS;

  if (filters.query.trim()) params.set('q', filters.query.trim());

  for (const [key, param] of LIST_PARAMS) {
    const value = filters[key];
    if (value.length && !sameList(value, d[key])) params.set(param, value.join(LIST_SEPARATOR));
  }
  for (const [key, param] of NUMBER_PARAMS) {
    const value = filters[key];
    if (value !== null && value !== d[key]) params.set(param, String(value));
  }
  for (const [key, param] of TEXT_PARAMS) {
    const value = filters[key];
    if (value) params.set(param, value);
  }

  if (filters.includeUnknownSalary !== d.includeUnknownSalary) params.set('unknown_salary', '0');
  if (filters.employerScope !== d.employerScope) params.set('employer_scope', filters.employerScope);
  if (filters.employerKind !== d.employerKind) params.set('employer_kind', filters.employerKind);
  if (filters.requiresClearance !== null) {
    params.set('clearance', filters.requiresClearance ? '1' : '0');
  }
  if (filters.postedWithinDays !== d.postedWithinDays) {
    params.set('days', String(filters.postedWithinDays));
  }
  if (filters.includeUndated !== d.includeUndated) params.set('undated', '0');
  if (filters.applyMode !== d.applyMode) params.set('apply', filters.applyMode);
  if (filters.sort !== d.sort) params.set('sort', filters.sort);

  return params;
}

/** Stable string form - the React Query cache key for a search. */
export function serializeTechFeedFilters(filters: TechFeedFilters): string {
  return filtersToSearchParams(filters).toString();
}

// ── Deserialize ──────────────────────────────────────────────────

export function searchParamsToFilters(params: URLSearchParams): TechFeedFilters {
  const d = DEFAULT_TECH_FEED_FILTERS;
  const scope = parseEnumList(params.get('scope'), TECH_SCOPES);

  return {
    query: params.get('q') ?? d.query,
    titles: parseList(params.get('titles')),
    roleFamilies: parseList(params.get('families')),
    roleSpecialties: parseList(params.get('specialties')),
    techScope: scope.length ? scope : d.techScope,
    skillsRequired: parseList(params.get('skills')),
    skillsPreferred: parseList(params.get('skills_pref')),
    excludeSkills: parseList(params.get('ex_skills')),
    excludeTitleTerms: parseList(params.get('ex_titles')),
    excludeKeywords: parseList(params.get('ex_kw')),
    excludeCompanies: parseList(params.get('ex_companies')),
    countries: parseList(params.get('countries')),
    regions: parseList(params.get('regions')),
    cities: parseList(params.get('cities')),
    radiusKm: parseNumber(params.get('radius')),
    workModes: parseEnumList(params.get('modes'), WORK_MODES),
    remoteEligibleLocations: parseList(params.get('remote_loc')),
    timezoneOverlapHours: parseNumber(params.get('tz_overlap')),
    seniority: parseEnumList(params.get('seniority'), SENIORITIES),
    minYears: parseNumber(params.get('min_years')),
    maxYears: parseNumber(params.get('max_years')),
    employmentTypes: parseList(params.get('emp_types')),
    minSalary: parseNumber(params.get('min_salary')),
    salaryCurrency: params.get('currency'),
    payInterval: params.get('pay_interval'),
    includeUnknownSalary: parseBool(params.get('unknown_salary'), d.includeUnknownSalary),
    employerScope: parseEnum(params.get('employer_scope'), EMPLOYER_SCOPES, d.employerScope),
    employerKind: parseEnum(params.get('employer_kind'), EMPLOYER_KINDS, d.employerKind),
    companyIds: parseList(params.get('companies')),
    companyCategories: parseList(params.get('company_cats')),
    sponsorshipPreference: params.get('sponsorship'),
    workAuthorization: parseList(params.get('work_auth')),
    requiresClearance:
      params.get('clearance') === null ? null : parseBool(params.get('clearance'), false),
    postedWithinDays: clampDays(parseNumber(params.get('days')) ?? d.postedWithinDays),
    includeUndated: parseBool(params.get('undated'), d.includeUndated),
    applyMode: parseEnum(params.get('apply'), APPLY_MODES, d.applyMode),
    sort: parseEnum(params.get('sort'), SORTS, d.sort),
  };
}

export function clampDays(days: number): number {
  if (!Number.isFinite(days) || days < 1) return DEFAULT_POSTED_WITHIN_DAYS;
  return Math.min(Math.round(days), MAX_POSTED_WITHIN_DAYS);
}

// ── Wire mapping ─────────────────────────────────────────────────

function listOrUndefined(values: string[]): string[] | undefined {
  return values.length ? values : undefined;
}

function numberOrUndefined(value: number | null): number | undefined {
  return value === null ? undefined : value;
}

/**
 * UI filter model -> the POST body. Omits anything the server already defaults,
 * except the two "include unknown data" switches, which are sent explicitly
 * whenever the user turned them OFF - the difference between "no opinion" and
 * "hide the unknowns" has to be unambiguous on the wire.
 */
export function techFeedFiltersToRequest(filters: TechFeedFilters): TechFeedSearchRequest {
  const d = DEFAULT_TECH_FEED_FILTERS;
  const request: TechFeedSearchRequest = {
    query: filters.query.trim() || undefined,
    titles: listOrUndefined(filters.titles),
    role_families: listOrUndefined(filters.roleFamilies),
    role_specialties: listOrUndefined(filters.roleSpecialties),
    tech_scope: filters.techScope.length ? filters.techScope : undefined,
    skills_required: listOrUndefined(filters.skillsRequired),
    skills_preferred: listOrUndefined(filters.skillsPreferred),
    exclude_skills: listOrUndefined(filters.excludeSkills),
    exclude_title_terms: listOrUndefined(filters.excludeTitleTerms),
    exclude_keywords: listOrUndefined(filters.excludeKeywords),
    exclude_companies: listOrUndefined(filters.excludeCompanies),
    countries: listOrUndefined(filters.countries),
    regions: listOrUndefined(filters.regions),
    cities: listOrUndefined(filters.cities),
    radius_km: numberOrUndefined(filters.radiusKm),
    work_modes: listOrUndefined(filters.workModes) as TechFeedWorkMode[] | undefined,
    remote_eligible_locations: listOrUndefined(filters.remoteEligibleLocations),
    timezone_overlap_hours: numberOrUndefined(filters.timezoneOverlapHours),
    seniority: listOrUndefined(filters.seniority) as TechFeedSeniority[] | undefined,
    min_years: numberOrUndefined(filters.minYears),
    max_years: numberOrUndefined(filters.maxYears),
    employment_types: listOrUndefined(filters.employmentTypes),
    min_salary: numberOrUndefined(filters.minSalary),
    salary_currency: filters.salaryCurrency ?? undefined,
    pay_interval: filters.payInterval ?? undefined,
    include_unknown_salary: filters.includeUnknownSalary ? undefined : false,
    employer_scope: filters.employerScope === d.employerScope ? undefined : filters.employerScope,
    employer_kind: filters.employerKind === d.employerKind ? undefined : filters.employerKind,
    company_ids: listOrUndefined(filters.companyIds),
    company_categories: listOrUndefined(filters.companyCategories),
    sponsorship_preference: filters.sponsorshipPreference ?? undefined,
    work_authorization: listOrUndefined(filters.workAuthorization),
    requires_clearance: filters.requiresClearance ?? undefined,
    posted_within_days: clampDays(filters.postedWithinDays),
    include_undated: filters.includeUndated ? undefined : false,
    apply_mode: filters.applyMode === d.applyMode ? undefined : filters.applyMode,
    sort: filters.sort === d.sort ? undefined : filters.sort,
  };

  // Drop the undefined members so the body reads as exactly what was asked for.
  return Object.fromEntries(
    Object.entries(request).filter(([, value]) => value !== undefined),
  ) as TechFeedSearchRequest;
}

/** How many meaningful filters are set - drives the "Filters (3)" affordance. */
export function countActiveTechFeedFilters(filters: TechFeedFilters): number {
  let count = 0;
  filtersToSearchParams(filters).forEach(() => {
    count += 1;
  });
  return count;
}

// ── Saved searches ───────────────────────────────────────────────

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota - the feature degrades, it does not break */
  }
}

export function loadSavedSearches(): SavedTechFeedSearch[] {
  const parsed = readJson<SavedTechFeedSearch[]>(SAVED_SEARCHES_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (entry): entry is SavedTechFeedSearch =>
      !!entry && typeof entry.id === 'string' && typeof entry.name === 'string' && !!entry.filters,
  );
}

function newId(): string {
  return `tfs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function persistSavedSearch(
  name: string,
  filters: TechFeedFilters,
  alerts?: SavedTechFeedSearch['alerts'],
): SavedTechFeedSearch[] {
  const entry: SavedTechFeedSearch = {
    id: newId(),
    name: name.trim() || 'Untitled search',
    // Snapshot, never a live reference: editing the rail must not rewrite a
    // search the user already saved.
    filters: { ...filters },
    createdAt: new Date().toISOString(),
    alerts: alerts ?? { enabled: false, frequency: 'daily' },
  };
  const next = [entry, ...loadSavedSearches()].slice(0, 50);
  writeJson(SAVED_SEARCHES_KEY, next);
  return next;
}

export function removeSavedSearch(id: string): SavedTechFeedSearch[] {
  const next = loadSavedSearches().filter((entry) => entry.id !== id);
  writeJson(SAVED_SEARCHES_KEY, next);
  return next;
}

/**
 * Saved searches: the SERVER owns the list, this browser keeps a mirror.
 *
 * Why both
 * --------
 * A saved search used to live in `localStorage` and nowhere else. That is not
 * storage, it is a cache with no origin: clearing site data, a private window,
 * a new laptop or a second browser all lose every saved search silently, and
 * the user finds out by looking for something that is gone.
 *
 * The mirror stays because the feed has to work when the API does not. A
 * saved search the user can still see and still apply offline is worth more
 * than a correct 503. So:
 *
 *   1. render from localStorage IMMEDIATELY (no spinner on a list the user
 *      already had);
 *   2. reconcile once on mount - push anything local-only up, take the
 *      server's list back;
 *   3. write through on every change, and mark a write that did not land
 *      `pendingSync` so the next reconcile retries it.
 *
 * The server never deletes on reconcile: a search this browser does not have
 * is one saved on another device, not one the user removed. Deletion is
 * explicit and travels its own route.
 */
/**
 * Every server call this hook makes, funnelled through one guard.
 *
 * `apiService` answers `{ data, error }` and does not reject - but that is a
 * contract, not a guarantee, and this hook's entire promise is that the LOCAL
 * list survives whatever the network does. A transport that throws
 * SYNCHRONOUSLY (an interceptor, a stale bundle whose `apiService` predates
 * these methods, a `TypeError` from a partial deploy) skips the `{ error }`
 * branch entirely and rejects the caller's promise instead - which is an
 * unhandled rejection, no `syncError` shown, and a spinner that never stops.
 * Treating a throw as `{ error }` is the same answer for the same situation.
 */
async function guarded<T>(
  call: () => Promise<{ data?: T; error?: string }>,
): Promise<{ data?: T; error?: string }> {
  try {
    return await call();
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network unavailable.' };
  }
}

export function useSavedTechFeedSearches(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled !== false;
  const [saved, setSaved] = useState<SavedTechFeedSearch[]>(() => loadSavedSearches());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const reconciled = useRef(false);

  const adopt = useCallback((rows: SavedTechFeedSearch[]) => {
    const clean = rows.map((row) => ({ ...row, pendingSync: false }));
    writeJson(SAVED_SEARCHES_KEY, clean);
    setSaved(clean);
  }, []);

  useEffect(() => {
    if (!enabled || reconciled.current) return;
    reconciled.current = true;
    let cancelled = false;
    void (async () => {
      setSyncing(true);
      const res = await guarded(() =>
        apiService.reconcileTechFeedSavedSearches(loadSavedSearches()),
      );
      if (cancelled) return;
      setSyncing(false);
      if (res.error || !res.data) {
        // Offline, or the endpoint is not deployed. The local list stands and
        // is NOT cleared - the whole point of the mirror.
        setSyncError(res.error ?? 'Saved searches could not be synced.');
        return;
      }
      setSyncError(null);
      adopt(res.data.searches ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, adopt]);

  const save = useCallback(
    async (name: string, filters: TechFeedFilters, alerts?: SavedTechFeedSearch['alerts']) => {
      // Local first, always: the user sees the search appear whether or not
      // the network is there.
      const local = persistSavedSearch(name, filters, alerts);
      setSaved(local);
      const entry = local[0];
      if (!enabled || !entry) return;
      const res = await guarded(() =>
        apiService.saveTechFeedSearch({
          id: entry.id,
          name: entry.name,
          filters: techFeedFiltersToRequest(entry.filters),
          alerts: entry.alerts,
        }),
      );
      if (res.error || !res.data) {
        // Mark it, do not lose it. The next reconcile pushes it up.
        setSyncError(res.error ?? 'This search is saved on this device only.');
        const marked = loadSavedSearches().map((row) =>
          row.id === entry.id ? { ...row, pendingSync: true } : row,
        );
        writeJson(SAVED_SEARCHES_KEY, marked);
        setSaved(marked);
        return;
      }
      setSyncError(null);
      adopt(res.data.searches ?? []);
    },
    [enabled, adopt],
  );

  const remove = useCallback(
    async (id: string) => {
      const local = removeSavedSearch(id);
      setSaved(local);
      if (!enabled) return;
      const res = await guarded(() => apiService.deleteTechFeedSavedSearch(id));
      if (res.error || !res.data) {
        setSyncError(res.error ?? 'Removed here, but not yet on your other devices.');
        return;
      }
      setSyncError(null);
      adopt(res.data.searches ?? []);
    },
    [enabled, adopt],
  );

  return { saved, save, remove, syncing, syncError };
}

// ── Transient UI state ───────────────────────────────────────────

/** Chrome state only (open filter groups). Deliberately a different key. */
export function loadTechFeedUiState<T>(fallback: T): T {
  return readJson<T>(UI_STATE_KEY, fallback);
}

export function saveTechFeedUiState(value: unknown): void {
  writeJson(UI_STATE_KEY, value);
}

// ── The hook ─────────────────────────────────────────────────────

export interface UseTechFeedFiltersResult {
  /** Committed filters, derived from the URL. The only thing searches read. */
  filters: TechFeedFilters;
  /** Live value of the search box - commits to the URL after a short debounce. */
  queryDraft: string;
  setQueryDraft: (value: string) => void;
  patchFilters: (patch: Partial<TechFeedFilters>) => void;
  replaceFilters: (next: TechFeedFilters) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

/**
 * Filter state <-> URL. Every write REPLACES the history entry: a filter rail
 * must not bury the back button under one entry per keystroke.
 */
export function useTechFeedFilters(): UseTechFeedFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramString = searchParams.toString();

  const filters = useMemo(
    () => searchParamsToFilters(new URLSearchParams(paramString)),
    [paramString],
  );

  const writeFilters = useCallback(
    (next: TechFeedFilters) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          // Preserve any param this module does not own (shell state, etc).
          for (const key of TECH_FEED_PARAM_KEYS) out.delete(key);
          filtersToSearchParams(next).forEach((value, key) => out.set(key, value));
          return out;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const patchFilters = useCallback(
    (patch: Partial<TechFeedFilters>) => {
      writeFilters({ ...searchParamsToFilters(new URLSearchParams(paramString)), ...patch });
    },
    [paramString, writeFilters],
  );

  const replaceFilters = useCallback(
    (next: TechFeedFilters) => {
      writeFilters(next);
    },
    [writeFilters],
  );

  const resetFilters = useCallback(() => {
    writeFilters(DEFAULT_TECH_FEED_FILTERS);
  }, [writeFilters]);

  // Debounced text input. `committed` tracks what the URL already holds so an
  // external change (reset, saved search, browser back) beats a stale draft.
  const [queryDraft, setQueryDraft] = useState(filters.query);
  const committedQuery = useRef(filters.query);

  useEffect(() => {
    if (filters.query !== committedQuery.current) {
      committedQuery.current = filters.query;
      setQueryDraft(filters.query);
    }
  }, [filters.query]);

  useEffect(() => {
    if (queryDraft === committedQuery.current) return undefined;
    const timer = setTimeout(() => {
      committedQuery.current = queryDraft;
      patchFilters({ query: queryDraft });
    }, QUERY_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryDraft, patchFilters]);

  const activeFilterCount = useMemo(() => countActiveTechFeedFilters(filters), [filters]);

  return {
    filters,
    queryDraft,
    setQueryDraft,
    patchFilters,
    replaceFilters,
    resetFilters,
    activeFilterCount,
  };
}
