/**
 * Company filter: names in, canonical employer ids out.
 *
 * The defect this replaces
 * -----------------------
 * The company filter was a free-text chips input over `company_ids`, and the
 * ids it wanted were whichever slug the catalog happened to hand the UI. A
 * user typing "Stripe" had no way to reach `emp_fd96667721fe`; a user who
 * somehow had that id could not tell what it named; and a saved filter
 * rendered as hex forever.
 *
 * So this shows NAMES, always. Ids the component is handed on mount are
 * resolved back to names through `/api/jobs/tech-feed/companies?ids=`, which
 * also follows acquisitions - a filter saved before one still names the
 * employer that now holds the postings, and says so.
 *
 * Legacy values are kept, not discarded
 * -------------------------------------
 * A bookmarked URL or an old saved search may hold a bare ATS tenant
 * (`stripe`) rather than a canonical id. The backend still accepts those, so
 * an unresolved value renders as its literal text with a "legacy filter"
 * note rather than vanishing. Dropping it would silently widen the user's
 * search, which is the failure mode a filter must never have.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, Loader2, Search, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TechFeedCompany } from '@/types/techFeed';

interface CompanyAutocompleteProps {
  /** Canonical employer ids (and, for compatibility, legacy slugs). */
  values: string[];
  onChange: (next: string[]) => void;
  /** Narrow suggestions to evidence-backed technology employers. */
  technologyOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

const DEBOUNCE_MS = 220;
const MIN_QUERY = 2;

/** `emp_` + 12 hex. The shape a canonical id has and a slug never does. */
const CANONICAL_ID = /^emp_[0-9a-f]{12}$/;

export function CompanyAutocomplete({
  values,
  onChange,
  technologyOnly = false,
  disabled = false,
  className,
}: CompanyAutocompleteProps) {
  const [draft, setDraft] = useState('');
  const [results, setResults] = useState<TechFeedCompany[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  /** `employer_id -> company`, for everything we have ever resolved. */
  const [known, setKnown] = useState<Record<string, TechFeedCompany>>({});
  const [unresolvedIds, setUnresolvedIds] = useState<string[]>([]);
  /**
   * Ids we have already asked about, resolved or not.
   *
   * A REF, not state, and it is what makes this effect terminate. Keyed on
   * the id we ASKED for rather than the one that came back: a lookup that
   * follows an acquisition answers with a different `employer_id`, so keying
   * on the response would leave the requested id permanently "missing" and
   * the effect would ask again on every render, forever. Same for a lookup
   * that fails - one attempt, then the chip renders as its literal text until
   * something else changes.
   */
  const attempted = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useRef(`company-ac-${Math.random().toString(36).slice(2, 8)}`);

  // --- resolve the ids we were handed, once each -------------------------
  const idKey = values.join(',');
  useEffect(() => {
    const missing = values.filter((v) => v && !attempted.current.has(v));
    if (!missing.length) return undefined;
    for (const id of missing) attempted.current.add(id);
    let cancelled = false;
    void (async () => {
      const res = await apiService.lookupTechFeedCompanies(missing);
      if (cancelled || res.error || !res.data) {
        // A lookup failure must not blank the chips. They render as their
        // literal text; `attempted` stops us retrying on every render.
        return;
      }
      const next: Record<string, TechFeedCompany> = {};
      for (const company of res.data.companies ?? []) {
        next[company.requested_employer_id ?? company.employer_id] = company;
      }
      setKnown((prev) => ({ ...prev, ...next }));
      const found = res.data.unresolved ?? [];
      if (found.length) {
        setUnresolvedIds((prev) => [...new Set([...prev, ...found])]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `idKey` rather than `values`: the parent passes a fresh array on every
    // render and the CONTENT is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey]);

  // --- search, debounced --------------------------------------------------
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = draft.trim();
    if (q.length < MIN_QUERY) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(() => {
      void (async () => {
        const res = await apiService.searchTechFeedCompanies(q, {
          limit: 8,
          technologyOnly,
        });
        setSearching(false);
        if (res.error || !res.data) {
          setResults([]);
          return;
        }
        setResults(res.data.companies ?? []);
        setKnown((prev) => {
          const next = { ...prev };
          for (const c of res.data!.companies ?? []) next[c.employer_id] = c;
          return next;
        });
      })();
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, technologyOnly]);

  const add = useCallback(
    (company: TechFeedCompany) => {
      // Follow the redirect at SELECTION time: picking a row that resolves
      // elsewhere must store the employer that actually holds the postings.
      const id = company.employer_id;
      if (values.includes(id)) return;
      setKnown((prev) => ({ ...prev, [id]: company }));
      onChange([...values, id]);
      setDraft('');
      setResults([]);
      setOpen(false);
    },
    [onChange, values],
  );

  const remove = useCallback(
    (id: string) => onChange(values.filter((v) => v !== id)),
    [onChange, values],
  );

  const chips = useMemo(
    () =>
      values.map((id) => {
        const company = known[id];
        return {
          id,
          label: company?.display_name ?? id,
          resolved: !!company,
          legacy: !company && (!CANONICAL_ID.test(id) || unresolvedIds.includes(id)),
          verified: company?.career_source_verified ?? false,
          postings: company?.core_tech_postings ?? null,
          redirected:
            !!company && !!company.requested_employer_id
              && company.requested_employer_id !== company.employer_id,
        };
      }),
    [values, known, unresolvedIds],
  );

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={draft}
          disabled={disabled}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder="Search companies by name"
          className="h-9 pl-8 text-sm"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId.current}
          aria-autocomplete="list"
          aria-label="Search companies by name"
        />
        {searching && (
          <Loader2
            className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
        {open && results.length > 0 && (
          <ul
            id={listId.current}
            role="listbox"
            className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-md"
          >
            {results.map((company) => {
              const selected = values.includes(company.employer_id);
              return (
                <li key={company.employer_id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(company)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-sm',
                      'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                      selected && 'opacity-60',
                    )}
                  >
                    <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{company.display_name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {[
                          company.domain,
                          company.core_tech_postings
                            ? `${company.core_tech_postings.toLocaleString()} technical roles`
                            : company.active_postings
                              ? `${company.active_postings.toLocaleString()} open roles`
                              : 'no live postings',
                          company.categories[0],
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    {selected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {chips.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No company filter - every employer is in scope.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li key={chip.id}>
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 border-border bg-muted pr-1 text-foreground',
                  chip.legacy && 'border-dashed',
                )}
                title={
                  chip.legacy
                    ? `Legacy filter value "${chip.id}" - still matched, but it is not a canonical employer id.`
                    : chip.redirected
                      ? `This company now files under ${chip.label}.`
                      : undefined
                }
              >
                <span className="max-w-[14rem] truncate">{chip.label}</span>
                {chip.verified && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400" aria-label="verified career source">
                    &#10003;
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(chip.id)}
                  className="rounded-sm p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${chip.label}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {chips.some((c) => c.legacy) && (
        <p className="text-[11px] text-muted-foreground">
          Some filters use an older company identifier. They still match - pick the
          company again from the list to upgrade them.
        </p>
      )}
    </div>
  );
}
