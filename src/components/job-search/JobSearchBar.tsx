/**
 * The Jobs search bar: everything that decides which jobs are on the board,
 * in one labelled strip that is always on screen.
 *
 * It replaces the "Job feed" drawer. That drawer held the titles, the place,
 * the sponsorship filter and the match filter behind a button whose name said
 * nothing about filtering, so most people never found them, while the board
 * was quietly being filtered by a sponsorship setting they could not see.
 *
 * Each segment shows its question on top and the current answer under it, so
 * the bar reads as a sentence about the board: these roles, in this place, at
 * these levels. Clicking a segment opens a small editor for just that answer.
 *
 * Below `lg` six segments do not fit. The bar becomes one summary button that
 * opens the same editors stacked in a sheet (`JobFeedSheet`).
 */
import { useCallback, useRef } from 'react';
import {
  BriefcaseBusiness,
  MapPin,
  Plane,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchSegment } from '@/components/job-search/SearchSegment';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { CompanyFilter, companySummary } from '@/components/job-search/CompanyFilter';
import { ExperienceLevelPicker, levelSummary } from '@/components/job-search/ExperienceLevelPicker';
import {
  MatchEditor,
  RolesEditor,
  SearchAction,
  VisaEditor,
  WhereEditor,
  matchLabel,
  visaLabel,
} from '@/components/job-search/jobSearchEditors';
import { RECENCY_OPTIONS, sameLevels } from '@/lib/careerJobs';
import { ANYWHERE, placeSummary } from '@/lib/places';
import { cn } from '@/lib/utils';

/* ── What each segment says ──────────────────────────────────────────────── */

function rolesSummary(titles: readonly string[]): string {
  if (!titles.length) return 'Add job titles';
  return titles.length === 1 ? titles[0] : `${titles[0]} +${titles.length - 1}`;
}

export function whereSummary(scope: {
  country?: string;
  region?: string;
  usOnly?: boolean;
  usState?: string;
  city: string;
  location?: string;
  remoteOnly: boolean;
}): string {
  const country = scope.country ?? (scope.usOnly === false ? ANYWHERE : 'US');
  const place = placeSummary({ country, region: scope.region ?? scope.usState ?? '', city: scope.city });
  return scope.remoteOnly ? `Remote · ${place}` : place;
}

/** Editors that change what is searched close with "Search". */
function ScopeFooter({ close, note }: { close: () => void; note?: string }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
      <p className="min-w-0 text-caption-sm leading-snug text-muted-foreground">
        {note ?? 'Search checks employer sites again with these settings.'}
      </p>
      <SearchAction onDone={close} className="shrink-0" />
    </div>
  );
}

/* ── The bar ─────────────────────────────────────────────────────────────── */

export function JobSearchBar() {
  const ctx = useCombinedJobsCtx();
  const {
    titles,
    titlesPending,
    canSearch,
    loading,
    sync,
    country,
    region,
    city,
    remoteOnly,
    seniorityLevels,
    resetSeniorityLevels,
    experienceView,
    sponsorFilter,
    setSponsorFilter,
    minScore,
    setMinScore,
    companies,
    setCompanies,
    companyFacets,
    recency,
    setCustomizeOpen,
  } = ctx;

  const where = whereSummary({ country, region, city, remoteOnly });
  const whereChanged = !(country === 'US' && !region && !city.trim() && !remoteOnly);
  // What the server is asked: only these need a new search when they change.
  // Nothing about place reaches the server any more (the board holds every
  // country), so only titles start a search.
  const scanKey = '';
  const mine = experienceView?.levels ?? [];
  const isMine = mine.length > 0 && sameLevels(seniorityLevels, mine);
  const levelChanged = mine.length > 0 ? !isMine : seniorityLevels.length > 0;
  const visaChanged = sponsorFilter !== 'friendly';
  const matchChanged = minScore > 0;
  const companyChanged = companies.size > 0;
  const filtersChanged = levelChanged || visaChanged || matchChanged || companyChanged;

  const clearFilters = () => {
    resetSeniorityLevels();
    setSponsorFilter('friendly');
    setMinScore(0);
    setCompanies(new Set());
  };

  // Titles and place change WHAT is searched. Closing either editor with a
  // change that was not searched yet runs the search, so a click outside
  // never leaves the board showing the old search under the new words.
  const whereAtOpen = useRef(scanKey);
  // Set by the editor's own Search button, so closing right after it does not
  // start the same search a second time.
  const searchedFromEditor = useRef(false);
  const searchIfStale = useCallback(
    (stale: boolean) => {
      if (searchedFromEditor.current) {
        searchedFromEditor.current = false;
        return;
      }
      if (stale && canSearch && !loading) sync(true);
    },
    [canSearch, loading, sync],
  );
  const closeAfterSearch = (close: () => void) => () => {
    searchedFromEditor.current = true;
    close();
  };

  const recencyLabel = RECENCY_OPTIONS.find((o) => o.key === recency)?.label ?? 'Today';
  const level = levelSummary(seniorityLevels);

  return (
    <>
      {/* Desktop: the labelled strip. */}
      <div className="hidden items-center gap-2 lg:flex">
        <div className="job-search-bar flex min-w-0 flex-1 items-stretch" role="group" aria-label="Your job search">
          <SearchSegment
            icon={BriefcaseBusiness}
            label="Roles"
            value={rolesSummary(titles)}
            ariaLabel={`Roles: ${titles.length ? titles.join(', ') : 'none yet'}`}
            attention={titlesPending || !canSearch}
            grow={2}
            contentClassName="w-[min(26rem,calc(100vw-2rem))]"
            onOpenChange={(open) => {
              if (!open) searchIfStale(titlesPending);
            }}
            testId="search-segment-roles"
          >
            {(close) => (
              <>
                <RolesEditor />
                <ScopeFooter close={closeAfterSearch(close)} />
              </>
            )}
          </SearchSegment>

          <SearchSegment
            icon={MapPin}
            label="Where"
            value={where}
            ariaLabel={`Where: ${where}`}
            changed={whereChanged}
            onOpenChange={(open) => {
              if (open) whereAtOpen.current = scanKey;
              else if (whereAtOpen.current !== scanKey && canSearch && !loading) sync(false);
            }}
            testId="search-segment-where"
          >
            <WhereEditor />
          </SearchSegment>

          <ExperienceLevelPicker />

          <SearchSegment
            icon={Plane}
            label="Visa"
            value={visaLabel(sponsorFilter)}
            ariaLabel={`Visa sponsorship: ${visaLabel(sponsorFilter)}`}
            changed={visaChanged}
            testId="search-segment-visa"
          >
            <VisaEditor />
          </SearchSegment>

          <CompanyFilter />

          <SearchSegment
            icon={Target}
            label="Match"
            value={matchLabel(minScore)}
            ariaLabel={`Match: ${matchLabel(minScore)}`}
            changed={matchChanged}
            align="end"
            testId="search-segment-match"
          >
            <MatchEditor />
          </SearchSegment>
        </div>

        {filtersChanged && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="hit-target h-10 shrink-0 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            title="Put experience, visa, company and match back to their defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
        )}
      </div>

      {/* Phone and tablet: one summary of the search that opens every editor. */}
      <button
        type="button"
        onClick={() => setCustomizeOpen(true)}
        aria-label="Edit your job search and filters"
        aria-controls="job-feed-sheet"
        className="job-search-bar press flex w-full items-center gap-3 px-3.5 py-2.5 text-left lg:hidden"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden>
          <Search className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-5 text-foreground">
            {rolesSummary(titles)}
            <span className="font-medium text-muted-foreground"> · {where}</span>
          </span>
          <span className="block truncate text-caption leading-5 text-muted-foreground">
            {[recencyLabel, level, visaLabel(sponsorFilter), matchChanged ? matchLabel(minScore) : null,
              companyChanged ? companySummary(companies, companyFacets) : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Filters
        </span>
      </button>
    </>
  );
}
