/**
 * Facet counts, as filters.
 *
 * Every facet the request contract can actually express is a toggle button
 * (`aria-pressed`) that patches the matching filter. The two facets with NO
 * corresponding request field - `ats` and `source` - are rendered as plain
 * counts rather than fake controls: a filter chip that does not filter is
 * worse than no chip at all.
 *
 * The `employer` facet is the odd one out. The contract's only employer
 * narrowing is `company_ids` (opaque ids), and a facet value is a NAME, so the
 * only truthful action here is the one that takes names: exclude.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  TechFeedFacetKey,
  TechFeedFacetValue,
  TechFeedFacets,
  TechFeedFilters,
  TechFeedSeniority,
  TechFeedWorkMode,
  TechScope,
} from '@/types/techFeed';

interface TechFeedFacetsProps {
  facets: TechFeedFacets;
  filters: TechFeedFilters;
  onPatch: (patch: Partial<TechFeedFilters>) => void;
  /** key -> human label, from the taxonomy endpoint. */
  labels?: Record<string, string>;
  className?: string;
}

const GROUP_TITLES: Record<TechFeedFacetKey, string> = {
  role_family: 'Role family',
  role_specialty: 'Specialty',
  tech_scope: 'Technical scope',
  seniority: 'Seniority',
  work_mode: 'Work arrangement',
  employer: 'Employer',
  ats: 'Applicant tracking system',
  source: 'Source',
  employment_type: 'Employment type',
  salary_published: 'Salary',
  country: 'Country',
  employer_kind: 'Employer type',
};

/** Render order - the ones people actually filter on come first. */
const GROUP_ORDER: TechFeedFacetKey[] = [
  'role_family',
  'role_specialty',
  'tech_scope',
  'seniority',
  'work_mode',
  'employment_type',
  'country',
  'salary_published',
  'employer_kind',
  'employer',
  'ats',
  'source',
];

/** Facets with no request field. Informational only - never a fake control. */
const READ_ONLY: ReadonlySet<TechFeedFacetKey> = new Set(['ats', 'source']);

function toggleList<T extends string>(current: T[], value: T): T[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TechFeedFacets({
  facets,
  filters,
  onPatch,
  labels = {},
  className,
}: TechFeedFacetsProps) {
  const groups = GROUP_ORDER.filter((key) => (facets[key]?.length ?? 0) > 0);
  if (!groups.length) return null;

  const isSelected = (key: TechFeedFacetKey, value: string): boolean => {
    switch (key) {
      case 'role_family':
        return filters.roleFamilies.includes(value);
      case 'role_specialty':
        return filters.roleSpecialties.includes(value);
      case 'tech_scope':
        return filters.techScope.includes(value as TechScope);
      case 'seniority':
        return filters.seniority.includes(value as TechFeedSeniority);
      case 'work_mode':
        return filters.workModes.includes(value as TechFeedWorkMode);
      case 'employment_type':
        return filters.employmentTypes.includes(value);
      case 'country':
        return filters.countries.includes(value);
      case 'employer_kind':
        return filters.employerKind === value;
      case 'salary_published':
        return value === 'true' && filters.includeUnknownSalary === false;
      case 'employer':
        return filters.excludeCompanies.includes(value);
      default:
        return false;
    }
  };

  const patchFor = (key: TechFeedFacetKey, value: string): Partial<TechFeedFilters> | null => {
    switch (key) {
      case 'role_family':
        return { roleFamilies: toggleList(filters.roleFamilies, value) };
      case 'role_specialty':
        return { roleSpecialties: toggleList(filters.roleSpecialties, value) };
      case 'tech_scope':
        return { techScope: toggleList(filters.techScope, value as TechScope) };
      case 'seniority':
        return { seniority: toggleList(filters.seniority, value as TechFeedSeniority) };
      case 'work_mode':
        return { workModes: toggleList(filters.workModes, value as TechFeedWorkMode) };
      case 'employment_type':
        return { employmentTypes: toggleList(filters.employmentTypes, value) };
      case 'country':
        return { countries: toggleList(filters.countries, value) };
      case 'employer_kind':
        return {
          employerKind:
            filters.employerKind === value
              ? 'any'
              : (value as TechFeedFilters['employerKind']),
        };
      case 'salary_published':
        // The "published" bucket is the only one that maps to a request field.
        return value === 'true'
          ? { includeUnknownSalary: filters.includeUnknownSalary === false }
          : null;
      case 'employer':
        return { excludeCompanies: toggleList(filters.excludeCompanies, value) };
      default:
        return null;
    }
  };

  const optionLabel = (key: TechFeedFacetKey, option: TechFeedFacetValue): string => {
    if (key === 'salary_published') return option.value === 'true' ? 'Published' : 'Not published';
    return labels[option.value] ?? humanize(option.value);
  };

  return (
    <div className={cn('space-y-4', className)} data-testid="tech-feed-facets">
      {groups.map((key) => {
        const options = facets[key] ?? [];
        const headingId = `tech-feed-facet-${key}`;
        const readOnly = READ_ONLY.has(key);

        return (
          <section key={key} role="group" aria-labelledby={headingId}>
            <h4
              id={headingId}
              className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {GROUP_TITLES[key]}
            </h4>
            <ul className="flex flex-wrap gap-1.5">
              {options.map((option) => {
                const label = optionLabel(key, option);
                const selected = isSelected(key, option.value);
                const patch = patchFor(key, option.value);

                if (readOnly || !patch) {
                  return (
                    <li key={option.value}>
                      <Badge
                        variant="outline"
                        className="gap-1 font-normal text-muted-foreground"
                        title={`${label}: ${option.count} postings`}
                      >
                        {label}
                        <span className="tabular-nums">{option.count}</span>
                      </Badge>
                    </li>
                  );
                }

                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      // Explicit name: the count is a separate inline span, and
                      // an inferred name would run the two words together.
                      aria-label={`${label}, ${option.count} postings`}
                      onClick={() => onPatch(patch)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-muted',
                      )}
                    >
                      <span>
                        {key === 'employer' && selected ? `${label} (excluded)` : label}
                      </span>
                      <span className="tabular-nums opacity-70">{option.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {key === 'employer' && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Selecting an employer here excludes it from the results.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

export default TechFeedFacets;
