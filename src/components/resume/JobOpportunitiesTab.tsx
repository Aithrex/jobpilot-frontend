import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bookmark, Briefcase, LayoutGrid, Search } from 'lucide-react';
import { useJobSearch } from '@/hooks/useJobSearch';
import { useJobTitles } from '@/hooks/useJobTitles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { SavedJobsPanel } from '@/components/job-search/SavedJobsPanel';
import { cn } from '@/lib/utils';

interface JobOpportunitiesTabProps {
  /** Mounted inside the /next app shell - the shell already renders the page
  header + SubNav, so suppress the internal hero and keep a slim toolbar. */
  embedded?: boolean;
}

type View = 'browse' | 'saved';

/**
 * The job titles driving this feed, surfaced on the Opportunities screen
 * itself. These are the ONE shared set (`useJobTitles`) that also drives the
 * Career portals tab, so what is listed here is exactly what every scan runs.
 */
function SharedJobTitles({ onEdit }: { onEdit: () => void }) {
  const { titles, ready } = useJobTitles();

  if (!ready && titles.length === 0) return null;

  return (
    <section
      aria-label="Your job titles"
      className="rounded-xl border border-border/70 bg-muted/30 p-3"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Search className="h-3.5 w-3.5" aria-hidden />
          Your job titles
        </p>
        <span className="text-[11px] text-muted-foreground">· shared with Career portals</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="ml-auto h-7 px-2 text-[11px] text-primary"
        >
          Edit titles
        </Button>
      </div>
      {titles.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {titles.map((title) => (
            <li key={title}>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-[11px] font-medium text-primary"
              >
                {title}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          No titles yet. Add a few so the feed knows what to scan for.
        </p>
      )}
    </section>
  );
}

export default function JobOpportunitiesTab({ embedded }: JobOpportunitiesTabProps) {
  const shellCtx = useOutletContext<{ embedded?: boolean } | null>();
  const isEmbedded = embedded ?? shellCtx?.embedded ?? false;
  const jobSearch = useJobSearch();
  const { setCustomizeOpen } = useCombinedJobsCtx();
  const [view, setView] = useState<View>('browse');

  // Editing lives in the feed's Customize drawer, so jump back to Browse and
  // open it rather than keeping a second editor (and a second title list).
  const editTitles = () => {
    setView('browse');
    setCustomizeOpen(true);
  };

  const SEGMENTS: Array<{ key: View; label: string; icon: typeof LayoutGrid; count?: number }> = [
    { key: 'browse', label: 'Browse jobs', icon: LayoutGrid },
    { key: 'saved', label: 'Saved', icon: Bookmark, count: jobSearch.savedJobs.length },
  ];

  return (
    <div className="space-y-6">
      {!isEmbedded && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Discover · Jobs
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </span>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                Job Opportunities
              </h2>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              One live feed across every company source - Workday enterprises, Greenhouse / Lever /
              Ashby career pages, and curated MNC boards - refreshed for you automatically and
              ranked against your resume.
            </p>
          </div>
        </div>
      )}

      {/* Browse / Saved segmented control */}
      <div className="inline-flex max-w-full flex-wrap rounded-xl border border-border bg-muted/40 p-1">
        {SEGMENTS.map(({ key, label, icon: Icon, count }) => {
          const isActive = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-background text-primary shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
              {count != null && (
                <span className={cn('tabular-nums', isActive ? 'text-primary/80' : 'opacity-60')}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <SharedJobTitles onEdit={editTitles} />

      {/* Keep both mounted so a Browse scan keeps running while viewing Saved. */}
      <div style={{ display: view === 'browse' ? undefined : 'none' }}>
        <CombinedJobsPanel
          isJobSaved={jobSearch.isJobSaved}
          getJobStatus={jobSearch.getJobStatus}
          saveJob={jobSearch.saveJob}
          unsaveJob={jobSearch.unsaveJob}
          quickApply={jobSearch.quickApply}
          isApplyConfirmPending={jobSearch.isApplyConfirmPending}
          confirmApplied={jobSearch.confirmApplied}
          dismissApplyConfirm={jobSearch.dismissApplyConfirm}
          applyConfirmJob={jobSearch.applyConfirmJob}
          closeApplyConfirmDialog={jobSearch.closeApplyConfirmDialog}
          beginApplyWithTailor={jobSearch.beginApplyWithTailor}
          markAlreadyApplied={jobSearch.markAlreadyApplied}
          autoApply={jobSearch.autoApply}
          autoApplyingId={jobSearch.autoApplyingId}
        />
      </div>
      <div style={{ display: view === 'saved' ? undefined : 'none' }}>
        <SavedJobsPanel
          savedJobs={jobSearch.savedJobs}
          updateJobStatus={jobSearch.updateJobStatus}
          unsaveJob={jobSearch.unsaveJob}
        />
      </div>
    </div>
  );
}
