/**
 * Filter state: URL round-trip, wire mapping, and saved searches.
 *
 * The contract being defended here is that a shared link reproduces the exact
 * same search, that the cursor/page-size/personalization NEVER leak into the
 * URL, and that saved searches live in their own storage key so clearing
 * throwaway UI state cannot delete them.
 */
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  DEFAULT_TECH_FEED_FILTERS,
  SAVED_SEARCHES_KEY,
  UI_STATE_KEY,
  filtersToSearchParams,
  loadSavedSearches,
  loadTechFeedUiState,
  persistSavedSearch,
  removeSavedSearch,
  saveTechFeedUiState,
  searchParamsToFilters,
  serializeTechFeedFilters,
  techFeedFiltersToRequest,
  useTechFeedFilters,
} from '@/lib/techFeedUrlState';
import type { TechFeedFilters } from '@/types/techFeed';

const FULLY_LOADED: TechFeedFilters = {
  query: 'staff platform engineer',
  titles: ['Backend Engineer', 'Platform Engineer'],
  roleFamilies: ['software_engineering'],
  roleSpecialties: ['backend'],
  techScope: ['core', 'adjacent'],
  skillsRequired: ['Go', 'Kubernetes'],
  skillsPreferred: ['Terraform'],
  excludeSkills: ['PHP'],
  excludeTitleTerms: ['intern'],
  excludeKeywords: ['unpaid'],
  excludeCompanies: ['Acme Staffing'],
  countries: ['US'],
  regions: ['TX'],
  cities: ['Austin, TX'],
  radiusKm: 50,
  workModes: ['remote', 'hybrid'],
  remoteEligibleLocations: ['US'],
  timezoneOverlapHours: 4,
  seniority: ['senior', 'staff'],
  minYears: 5,
  maxYears: 12,
  employmentTypes: ['full_time'],
  minSalary: 180000,
  salaryCurrency: 'USD',
  payInterval: 'year',
  includeUnknownSalary: false,
  employerScope: 'tech_only',
  employerKind: 'direct_employer',
  companyIds: ['northwind'],
  companyCategories: ['enterprise'],
  sponsorshipPreference: 'needs_sponsorship',
  workAuthorization: ['us_citizen'],
  requiresClearance: false,
  clearanceRoles: 'hide',
  noSponsorshipRoles: 'show',
  postedWithinDays: 90,
  includeUndated: false,
  applyMode: 'direct_apply',
  sort: 'newest',
};

function wrapper(initialEntry: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('tech feed URL state', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('round-trips every meaningful filter through the URL', () => {
    const params = filtersToSearchParams(FULLY_LOADED);
    const restored = searchParamsToFilters(params);
    expect(restored).toEqual(FULLY_LOADED);
  });

  test('a pristine search produces an empty query string', () => {
    expect(serializeTechFeedFilters(DEFAULT_TECH_FEED_FILTERS)).toBe('');
  });

  test('never serializes the cursor, page size or personalization', () => {
    const serialized = serializeTechFeedFilters(FULLY_LOADED);
    expect(serialized).not.toMatch(/cursor/);
    expect(serialized).not.toMatch(/page_size/);
    expect(serialized).not.toMatch(/personalize/);
  });

  test('unknown-data switches only appear in the URL when turned OFF', () => {
    const on = filtersToSearchParams(DEFAULT_TECH_FEED_FILTERS);
    expect(on.get('unknown_salary')).toBeNull();
    expect(on.get('undated')).toBeNull();

    const off = filtersToSearchParams({
      ...DEFAULT_TECH_FEED_FILTERS,
      includeUnknownSalary: false,
      includeUndated: false,
    });
    expect(off.get('unknown_salary')).toBe('0');
    expect(off.get('undated')).toBe('0');
  });

  test('list values survive a comma inside a city name', () => {
    const restored = searchParamsToFilters(
      filtersToSearchParams({ ...DEFAULT_TECH_FEED_FILTERS, cities: ['Austin, TX', 'Berlin'] }),
    );
    expect(restored.cities).toEqual(['Austin, TX', 'Berlin']);
  });

  test('posted_within_days is clamped to the contract maximum of 180', () => {
    const restored = searchParamsToFilters(new URLSearchParams('days=9000'));
    expect(restored.postedWithinDays).toBe(180);
  });

  test('maps the whole filter set onto the request contract', () => {
    const request = techFeedFiltersToRequest(FULLY_LOADED);
    expect(request).toEqual({
      query: 'staff platform engineer',
      titles: ['Backend Engineer', 'Platform Engineer'],
      role_families: ['software_engineering'],
      role_specialties: ['backend'],
      tech_scope: ['core', 'adjacent'],
      skills_required: ['Go', 'Kubernetes'],
      skills_preferred: ['Terraform'],
      exclude_skills: ['PHP'],
      exclude_title_terms: ['intern'],
      exclude_keywords: ['unpaid'],
      exclude_companies: ['Acme Staffing'],
      countries: ['US'],
      regions: ['TX'],
      cities: ['Austin, TX'],
      radius_km: 50,
      work_modes: ['remote', 'hybrid'],
      remote_eligible_locations: ['US'],
      timezone_overlap_hours: 4,
      seniority: ['senior', 'staff'],
      min_years: 5,
      max_years: 12,
      employment_types: ['full_time'],
      min_salary: 180000,
      salary_currency: 'USD',
      pay_interval: 'year',
      include_unknown_salary: false,
      employer_scope: 'tech_only',
      employer_kind: 'direct_employer',
      company_ids: ['northwind'],
      company_categories: ['enterprise'],
      sponsorship_preference: 'needs_sponsorship',
      work_authorization: ['us_citizen'],
      requires_clearance: false,
      posted_within_days: 90,
      include_undated: false,
      apply_mode: 'direct_apply',
      sort: 'newest',
    });
  });

  test('show/demote/hide never reaches the wire - it is presentation', () => {
    // These act on the rows the server already returned, so the "N hidden"
    // count is a count of real rows. Sending them would make it an estimate.
    const request = techFeedFiltersToRequest(FULLY_LOADED) as Record<string, unknown>;
    expect(request.clearance_roles).toBeUndefined();
    expect(request.nosponsor_roles).toBeUndefined();
    expect(request.clearanceRoles).toBeUndefined();
    expect(request.noSponsorshipRoles).toBeUndefined();
  });

  test('a barrier preference at its default stays out of the URL', () => {
    // demote IS the default: nothing is hidden unless the user asked.
    expect(DEFAULT_TECH_FEED_FILTERS.clearanceRoles).toBe('demote');
    expect(DEFAULT_TECH_FEED_FILTERS.noSponsorshipRoles).toBe('demote');
    const params = filtersToSearchParams(DEFAULT_TECH_FEED_FILTERS);
    expect(params.get('clearance_roles')).toBeNull();
    expect(params.get('nosponsor_roles')).toBeNull();
  });

  test('a default search sends only the fields the server cannot infer', () => {
    expect(techFeedFiltersToRequest(DEFAULT_TECH_FEED_FILTERS)).toEqual({
      tech_scope: ['core'],
      posted_within_days: 30,
    });
  });

  test('the hook reads filters from the URL and writes them back with replace', async () => {
    const { result } = renderHook(() => useTechFeedFilters(), {
      wrapper: wrapper('/app/jobs/portals?families=data&sort=newest'),
    });

    expect(result.current.filters.roleFamilies).toEqual(['data']);
    expect(result.current.filters.sort).toBe('newest');

    act(() => {
      result.current.patchFilters({ seniority: ['staff'] });
    });

    expect(result.current.filters.seniority).toEqual(['staff']);
    expect(result.current.filters.roleFamilies).toEqual(['data']);
    expect(result.current.activeFilterCount).toBe(3);
  });

  test('the hook leaves params it does not own alone', () => {
    const { result } = renderHook(
      () => ({ tf: useTechFeedFilters(), params: useSearchParams()[0] }),
      { wrapper: wrapper('/app/jobs/portals?ref=email&sort=newest') },
    );

    act(() => {
      result.current.tf.patchFilters({ sort: 'salary' });
    });

    expect(result.current.tf.filters.sort).toBe('salary');
    expect(result.current.params.get('sort')).toBe('salary');
    expect(result.current.params.get('ref')).toBe('email');
  });

  test('the search box debounces before it touches the URL', async () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useTechFeedFilters(), {
        wrapper: wrapper('/app/jobs/portals'),
      });

      act(() => {
        result.current.setQueryDraft('rus');
      });
      expect(result.current.queryDraft).toBe('rus');
      expect(result.current.filters.query).toBe('');

      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(result.current.filters.query).toBe('rus');
    } finally {
      vi.useRealTimers();
    }
  });

  test('saved searches persist under their own key, apart from UI state', () => {
    persistSavedSearch('Remote staff roles', FULLY_LOADED);
    saveTechFeedUiState({ advancedOpen: true });

    const saved = loadSavedSearches();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Remote staff roles');
    expect(saved[0].filters).toEqual(FULLY_LOADED);
    expect(saved[0].createdAt).toBeTruthy();

    expect(window.localStorage.getItem(SAVED_SEARCHES_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(UI_STATE_KEY)).toBeTruthy();

    // Clearing throwaway chrome state must not touch saved searches.
    window.localStorage.removeItem(UI_STATE_KEY);
    expect(loadSavedSearches()).toHaveLength(1);
    expect(loadTechFeedUiState({ advancedOpen: false }).advancedOpen).toBe(false);

    removeSavedSearch(saved[0].id);
    expect(loadSavedSearches()).toHaveLength(0);
  });

  test('a saved search is a snapshot, not a live reference', () => {
    const mutable = { ...DEFAULT_TECH_FEED_FILTERS, query: 'original' };
    persistSavedSearch('Snapshot', mutable);
    mutable.query = 'edited later';
    expect(loadSavedSearches()[0].filters.query).toBe('original');
  });

  test('corrupt storage degrades to an empty list rather than throwing', () => {
    window.localStorage.setItem(SAVED_SEARCHES_KEY, '{not json');
    expect(loadSavedSearches()).toEqual([]);
  });
});
