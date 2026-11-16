import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { CompanyFilterList } from '@/components/job-search/CompanyFilter';
import { whereSummary } from '@/components/job-search/JobSearchBar';
import { ExperienceLevelList } from '@/components/job-search/ExperienceLevelPicker';
import {
  EditorHeading,
  MatchEditor,
  PostedEditor,
  RolesEditor,
  SearchAction,
  SwitchRow,
  VisaEditor,
  WhereEditor,
} from '@/components/job-search/jobSearchEditors';

function formatAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)}h ago`;
}

function Section({ children }: { children: ReactNode }) {
  return <section className="border-b border-border/50 px-5 py-5 last:border-b-0 sm:px-6">{children}</section>;
}

/**
 * Every search and filter control in one sheet.
 *
 * On a phone this IS the filter surface: the search bar collapses to one
 * summary button that opens it. On a wide screen the same editors open one at
 * a time from the bar, and this sheet is what "Change search and filters"
 * opens from an empty board.
 *
 * Order follows how a search is built: what and where first (they change what
 * is searched and need Search), then the filters that only narrow the list
 * and apply as you tap.
 */
export function JobFeedSheet() {
  const {
    jobs,
    loading,
    progress,
    lastSyncedAt,
    customizeOpen,
    setCustomizeOpen,
    resetScope,
    resetSeniorityLevels,
    setSponsorFilter,
    setMinScore,
    setCompanies,
    showApplied,
    setShowApplied,
    collapseReposts,
    setCollapseReposts,
    repostsFolded,
    visibleJobs,
    titlesPending,
    usOnly,
    country,
    region,
    city,
    remoteOnly,
  } = useCombinedJobsCtx();

  // Titles and place change WHAT is searched; every other control only
  // narrows the list and has already applied. So the sheet's one button says
  // "Search" only when there is a new search to run, and otherwise just shows
  // the list.
  // A place filters the board at once; only "US or not" and remote-only are
  // asked of the server, so only they need a new search.
  const scanKey = `${usOnly}|${remoteOnly}`;
  const whereAtOpen = useRef(scanKey);
  useEffect(() => {
    if (customizeOpen) whereAtOpen.current = scanKey;
    // Only when the sheet opens: later edits are what we compare against.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customizeOpen]);
  const searchChanged = titlesPending || scanKey !== whereAtOpen.current;

  const roleCount = jobs.length;
  const statusLine = useMemo(() => {
    if (loading) {
      return progress.total > 0
        ? `Checking ${progress.done} of ${progress.total} employer sites. ${roleCount} roles so far.`
        : 'Searching employer sites...';
    }
    // One count, said one way: what these filters show, out of what was found.
    const showing = `Showing ${visibleJobs.length} of ${roleCount} ${roleCount === 1 ? 'role' : 'roles'}`;
    return lastSyncedAt ? `${showing}. Updated ${formatAgo(lastSyncedAt)}.` : `${showing}.`;
  }, [loading, progress.done, progress.total, roleCount, lastSyncedAt, visibleJobs.length]);

  const resetAll = () => {
    resetScope();
    resetSeniorityLevels();
    setSponsorFilter('friendly');
    setMinScore(0);
    setCompanies(new Set());
    setShowApplied(false);
    setCollapseReposts(true);
  };

  return (
    <Sheet open={customizeOpen} onOpenChange={(open) => setCustomizeOpen(open)}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/40"
        id="job-feed-sheet"
        solid
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md sm:rounded-l-2xl"
      >
        <SheetHeader className="space-y-2 border-b border-border/50 px-5 pb-4 pt-5 text-left sm:px-6">
          <div className="pr-8">
            <SheetTitle className="font-display text-xl font-semibold tracking-tight">
              Your job search
            </SheetTitle>
            <SheetDescription className="mt-1 text-caption text-muted-foreground" aria-live="polite">
              {statusLine}
            </SheetDescription>
          </div>
          {loading && (
            <Progress value={progress.total ? (progress.done / progress.total) * 100 : 8} className="h-1" />
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Filters first: they are what people come here to change, and
              they apply as they are tapped. Visa leads because it is the one
              that is on by default. The search itself (titles and place) sits
              under them and needs Search. */}
          <Section>
            <VisaEditor />
          </Section>
          <Section>
            <PostedEditor />
          </Section>
          <Section>
            <div className="space-y-3">
              <EditorHeading
                title="Which experience levels?"
                hint="Opens on the level your resume shows. Change it any time."
              />
              <ExperienceLevelList />
            </div>
          </Section>
          <Section>
            <MatchEditor />
          </Section>
          <Section>
            <RolesEditor id="sheet-roles" />
          </Section>
          <Section>
            <WhereEditor idPrefix="sheet-where" />
          </Section>
          <Section>
            <div className="space-y-2">
              <EditorHeading title="Also show" />
              <SwitchRow
                id="sheet-show-applied"
                label="Jobs I already applied to"
                hint="Listed at the bottom, after the open ones."
                checked={showApplied}
                onCheckedChange={setShowApplied}
              />
              {(repostsFolded > 0 || !collapseReposts) && (
                <SwitchRow
                  id="sheet-show-reposts"
                  label={`Repeat postings${repostsFolded > 0 ? ` (${repostsFolded})` : ''}`}
                  hint="The same role posted again by the same company in the same city."
                  checked={!collapseReposts}
                  onCheckedChange={(v) => setCollapseReposts(!v)}
                />
              )}
            </div>
          </Section>
          <section className="-mx-0 border-b-0">
            <CompanyFilterList />
          </section>
        </div>

        <SheetFooter className="flex-row items-center gap-2 border-t border-border/50 px-5 py-3 sm:space-x-0 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="h-10 gap-1.5 px-2 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset all filters
          </Button>
          <span className="ml-auto" />
          {/* ONE action. Filters apply as they are tapped, so it shows the
              list; after a change to the titles or the place it runs that
              search instead. */}
          {searchChanged ? (
            <SearchAction onDone={() => setCustomizeOpen(false)} />
          ) : (
            <Button size="sm" onClick={() => setCustomizeOpen(false)} className="h-10 gap-1.5">
              Show {visibleJobs.length} {visibleJobs.length === 1 ? 'role' : 'roles'}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
