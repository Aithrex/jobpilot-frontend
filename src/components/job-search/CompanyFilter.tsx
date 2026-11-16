import { useMemo, useState } from 'react';
import { Building2, Search, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { SearchSegment } from '@/components/job-search/SearchSegment';
import { COMPANY_TYPE_META, COMPANY_TYPE_ORDER } from '@/lib/companyTypes';
import type { CompanyFacet } from '@/lib/forYouSelection';
import type { CompanyType } from '@/types/jobs';

/** Rows shown per group before "Show all". Keeps a 400-company board light. */
const GROUP_PREVIEW = 8;

/** What the Company segment says: "All companies", one name, or a count. */
export function companySummary(companies: ReadonlySet<string>, facets: readonly CompanyFacet[]): string {
  if (companies.size === 0) return 'All companies';
  if (companies.size === 1) return facets.find((f) => companies.has(f.key))?.name ?? '1 company';
  return `${companies.size} companies`;
}

/**
 * The company checklist: every company in the current window, grouped by the
 * kind of employer, each with how many roles it holds here.
 *
 * The free-text search above the board still matches titles and companies;
 * this is the "show me only these" control. Counts are what the board would
 * show with the other filters as they are, so ticking a row never surprises.
 */
export function CompanyFilterList() {
  const { companyFacets, companies, setCompanies } = useCombinedJobsCtx();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<CompanyType>>(new Set());

  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const by = new Map<CompanyType, CompanyFacet[]>();
    for (const type of COMPANY_TYPE_ORDER) by.set(type, []);
    for (const facet of companyFacets) {
      if (q && !facet.name.toLowerCase().includes(q)) continue;
      (by.get(facet.type) ?? by.get('unknown')!).push(facet);
    }
    return COMPANY_TYPE_ORDER.map((type) => ({ type, rows: by.get(type) ?? [] }))
      .filter((g) => g.rows.length > 0);
  }, [companyFacets, q]);

  const toggle = (key: string, on: boolean) => {
    const next = new Set(companies);
    if (on) next.add(key);
    else next.delete(key);
    setCompanies(next);
  };
  const toggleGroup = (rows: CompanyFacet[], on: boolean) => {
    const next = new Set(companies);
    for (const row of rows) {
      if (on) next.add(row.key);
      else next.delete(row.key);
    }
    setCompanies(next);
  };

  const picked = companies.size;

  return (
    <>
        <div className="border-b border-border/60 p-3">
          <p className="mb-2 px-1 text-sm font-semibold text-foreground">Only show these companies</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies on this board"
              aria-label="Search companies on this board"
              className="h-9 w-full rounded-lg border border-border/80 bg-background/80 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-caption-sm text-muted-foreground">
            <span className="tabular-nums">
              {companyFacets.length} {companyFacets.length === 1 ? 'company' : 'companies'} in this view
            </span>
            {picked > 0 && (
              <button
                type="button"
                onClick={() => setCompanies(new Set())}
                className="press hit-target inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-ink-muted hover:bg-primary/10 hover:text-primary"
              >
                <X className="h-3 w-3" aria-hidden /> Clear {picked}
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-1.5" role="group" aria-label="Companies by type">
          {groups.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {q ? `No company on this board matches "${query.trim()}".` : 'No companies in this view yet.'}
            </p>
          )}
          {groups.map(({ type, rows }) => {
            const meta = COMPANY_TYPE_META[type];
            const ticked = rows.filter((r) => companies.has(r.key)).length;
            const all = ticked === rows.length;
            const roles = rows.reduce((n, r) => n + r.count, 0);
            const showAll = expanded.has(type) || !!q;
            const shown = showAll ? rows : rows.slice(0, GROUP_PREVIEW);
            return (
              <section key={type} className="mb-1 rounded-lg" aria-label={meta.label} data-testid={`company-group-${type}`}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/60">
                  <Checkbox
                    className="mt-0.5"
                    checked={all ? true : ticked > 0 ? 'indeterminate' : false}
                    onCheckedChange={(v) => toggleGroup(rows, v === true)}
                    aria-label={`All ${meta.label}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-caption font-semibold text-foreground">{meta.label}</span>
                      <span className="shrink-0 text-caption-sm tabular-nums text-muted-foreground">
                        {rows.length}, {roles} {roles === 1 ? 'role' : 'roles'}
                      </span>
                    </span>
                    <span className="block text-caption-sm leading-snug text-muted-foreground">{meta.hint}</span>
                  </span>
                </label>
                <ul className="ml-6 border-l border-border/50 pl-1.5">
                  {shown.map((row) => (
                    <li key={row.key}>
                      <label
                        className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-caption hover:bg-accent/60"
                        title={row.basis || undefined}
                      >
                        <Checkbox
                          checked={companies.has(row.key)}
                          onCheckedChange={(v) => toggle(row.key, v === true)}
                          aria-label={row.name}
                        />
                        <span className="min-w-0 flex-1 truncate">{row.name}</span>
                        <span className="shrink-0 text-caption-sm tabular-nums text-muted-foreground">{row.count}</span>
                      </label>
                    </li>
                  ))}
                  {!showAll && rows.length > GROUP_PREVIEW && (
                    <li>
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => new Set(prev).add(type))}
                        className="press w-full rounded-md px-2 py-1.5 text-left text-caption-sm font-medium text-primary hover:bg-primary/10"
                      >
                        Show all {rows.length}
                      </button>
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
    </>
  );
}

/** The Company segment of the search bar. */
export function CompanyFilter() {
  const { companyFacets, companies } = useCombinedJobsCtx();
  const picked = companies.size;

  return (
    <SearchSegment
      icon={Building2}
      label="Company"
      value={companySummary(companies, companyFacets)}
      ariaLabel={picked ? `Companies filter, ${picked} selected` : 'Filter by company'}
      changed={picked > 0}
      align="end"
      contentClassName="w-[min(24rem,calc(100vw-2rem))] p-0"
      testId="company-filter-trigger"
    >
      <CompanyFilterList />
    </SearchSegment>
  );
}
