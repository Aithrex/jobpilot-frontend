import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bookmark, Briefcase, LayoutGrid } from 'lucide-react';
import { useJobSearch } from '@/hooks/useJobSearch';
import { CombinedJobsPanel } from '@/components/job-search/CombinedJobsPanel';
import { SavedJobsPanel } from '@/components/job-search/SavedJobsPanel';
import { cn } from '@/lib/utils';

interface JobOpportunitiesTabProps {
  /** Mounted inside the /next app shell — the shell already renders the page
      header + SubNav, so suppress the internal hero and keep a slim toolbar. */
  embedded?: boolean;
}

type View = 'browse' | 'saved';

export default function JobOpportunitiesTab({ embedded }: JobOpportunitiesTabProps) {
  const shellCtx = useOutletContext<{ embedded?: boolean } | null>();
  const isEmbedded = embedded ?? shellCtx?.embedded ?? false;
  const jobSearch = useJobSearch();
  const [view, setView] = useState<View>('browse');

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
              One live feed across every company source — Workday enterprises, Greenhouse / Lever / Ashby
              career pages, and curated MNC boards — refreshed for you automatically and ranked against your resume.
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
                isActive ? 'bg-background text-primary shadow-soft' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {label}
              {count != null && (
                <span className={cn('tabular-nums', isActive ? 'text-primary/80' : 'opacity-60')}>({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Keep both mounted so a Browse scan keeps running while viewing Saved. */}
      <div style={{ display: view === 'browse' ? undefined : 'none' }}>
        <CombinedJobsPanel
          isJobSaved={jobSearch.isJobSaved}
          getJobStatus={jobSearch.getJobStatus}
          saveJob={jobSearch.saveJob}
          unsaveJob={jobSearch.unsaveJob}
          quickApply={jobSearch.quickApply}
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
