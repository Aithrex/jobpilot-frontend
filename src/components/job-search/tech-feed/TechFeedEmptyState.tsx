/**
 * Zero results, with a way out.
 *
 * "No jobs found" is a dead end. Every suggestion here is derived from a
 * filter the user actually set, and each one is a single click that widens
 * exactly that constraint - so the user learns which of their choices was the
 * expensive one instead of guessing.
 */
import { SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DEFAULT_TECH_FEED_FILTERS } from '@/lib/techFeedUrlState';
import type { TechFeedFilters } from '@/types/techFeed';

export interface BroadeningSuggestion {
  id: string;
  label: string;
  patch: Partial<TechFeedFilters>;
}

/** Ordered widest-impact first; the panel renders the first few. */
export function broadeningSuggestions(filters: TechFeedFilters): BroadeningSuggestion[] {
  const out: BroadeningSuggestion[] = [];

  if (filters.postedWithinDays < 90) {
    out.push({ id: 'days', label: 'Widen to 90 days', patch: { postedWithinDays: 90 } });
  }
  if (!filters.techScope.includes('adjacent')) {
    out.push({
      id: 'adjacent',
      label: 'Include adjacent technical roles',
      patch: { techScope: [...filters.techScope, 'adjacent'] },
    });
  }
  if (!filters.includeUnknownSalary) {
    out.push({
      id: 'unknown-salary',
      label: 'Include jobs without published salary',
      patch: { includeUnknownSalary: true },
    });
  }
  if (filters.minSalary !== null) {
    out.push({ id: 'min-salary', label: 'Remove the salary floor', patch: { minSalary: null } });
  }
  if (filters.roleSpecialties.length) {
    out.push({
      id: 'specialties',
      label: 'Search the whole role family',
      patch: { roleSpecialties: [] },
    });
  }
  if (filters.employerScope === 'tech_only') {
    out.push({
      id: 'employer-scope',
      label: 'Include employers outside technology',
      patch: { employerScope: 'any' },
    });
  }
  if (filters.employerKind !== 'any') {
    out.push({
      id: 'employer-kind',
      label: 'Include every employer type',
      patch: { employerKind: 'any' },
    });
  }
  if (filters.seniority.length) {
    out.push({ id: 'seniority', label: 'Any seniority', patch: { seniority: [] } });
  }
  if (filters.minYears !== null || filters.maxYears !== null) {
    out.push({
      id: 'years',
      label: 'Remove the experience range',
      patch: { minYears: null, maxYears: null },
    });
  }
  if (filters.workModes.length && !filters.workModes.includes('unknown')) {
    out.push({
      id: 'work-mode-unknown',
      label: 'Include postings with an unclear work arrangement',
      patch: { workModes: [...filters.workModes, 'unknown'] },
    });
  }
  if (filters.cities.length || filters.regions.length) {
    out.push({
      id: 'locations',
      label: 'Widen the location to the whole country',
      patch: { cities: [], regions: [] },
    });
  }
  if (!filters.includeUndated) {
    out.push({
      id: 'undated',
      label: 'Include postings with no publish date',
      patch: { includeUndated: true },
    });
  }
  if (filters.skillsRequired.length > 2) {
    out.push({
      id: 'skills',
      label: 'Treat required skills as preferred',
      patch: {
        skillsRequired: [],
        skillsPreferred: [...filters.skillsPreferred, ...filters.skillsRequired],
      },
    });
  }
  if (
    filters.excludeKeywords.length ||
    filters.excludeTitleTerms.length ||
    filters.excludeCompanies.length ||
    filters.excludeSkills.length
  ) {
    out.push({
      id: 'exclusions',
      label: 'Clear the exclusions',
      patch: {
        excludeKeywords: [],
        excludeTitleTerms: [],
        excludeCompanies: [],
        excludeSkills: [],
      },
    });
  }
  if (filters.applyMode === 'direct_apply') {
    out.push({
      id: 'apply-mode',
      label: 'Include postings that apply through a job board',
      patch: { applyMode: 'any' },
    });
  }
  if (filters.requiresClearance) {
    out.push({
      id: 'clearance',
      label: 'Drop the security clearance requirement',
      patch: { requiresClearance: null },
    });
  }

  return out;
}

interface TechFeedEmptyStateProps {
  filters: TechFeedFilters;
  onApply: (patch: Partial<TechFeedFilters>) => void;
  onReset: () => void;
  /** How many suggestions to show before the reset escape hatch. */
  limit?: number;
}

export function TechFeedEmptyState({
  filters,
  onApply,
  onReset,
  limit = 5,
}: TechFeedEmptyStateProps) {
  const suggestions = broadeningSuggestions(filters).slice(0, limit);
  const isPristine =
    JSON.stringify(filters) === JSON.stringify({ ...DEFAULT_TECH_FEED_FILTERS, query: filters.query });

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center"
      data-testid="tech-feed-empty"
    >
      <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">No jobs match these filters</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {isPristine
            ? 'Nothing in the index matches that search yet. Try different keywords.'
            : 'Nothing in the index matches every filter at once. Loosen one and try again.'}
        </p>
      </div>

      {suggestions.length > 0 && (
        <div className="w-full max-w-lg">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            One click to broaden
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onApply(suggestion.patch)}
                >
                  {suggestion.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="focus-visible:ring-2 focus-visible:ring-ring"
      >
        Clear all filters
      </Button>
    </div>
  );
}

export default TechFeedEmptyState;
