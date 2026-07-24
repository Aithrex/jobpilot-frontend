import { Suspense, lazy, useState } from 'react';
import {
  Bookmark, MapPin, ExternalLink, Trash2, StickyNote, LayoutGrid, Columns3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CompanyLogo } from '@/components/CompanyLogo';
import { KanbanBoard } from '@/components/job-search/KanbanBoard';
import { cn } from '@/lib/utils';
import type { SavedJob } from '@/types/jobs';

// The 3D orb pulls in three.js - lazy-load it so the empty state is the only
// place that ships the WebGL bundle.
const ScoutOrb = lazy(() => import('@/components/job-search/ScoutOrb'));

const STATUS_STYLES: Record<string, string> = {
  interested: 'border-info/30 bg-info/10 text-info',
  applied: 'border-warning/30 bg-warning/10 text-warning',
  interview: 'border-primary/30 bg-primary/10 text-primary',
  offer: 'border-success/30 bg-success/10 text-success',
  rejected: 'border-destructive/30 bg-destructive/10 text-destructive',
  withdrawn: 'border-border bg-muted text-muted-foreground',
};

interface SavedJobsPanelProps {
  savedJobs: SavedJob[];
  updateJobStatus: (jobId: string, status: string, notes?: string) => Promise<unknown>;
  unsaveJob: (jobId: string) => Promise<unknown>;
}

function SavedJobCard({ saved, updateJobStatus, unsaveJob }: {
  saved: SavedJob;
  updateJobStatus: SavedJobsPanelProps['updateJobStatus'];
  unsaveJob: SavedJobsPanelProps['unsaveJob'];
}) {
  const [notes, setNotes] = useState(saved.notes || '');
  const [showNotes, setShowNotes] = useState(false);
  const job = saved.job_data;

  return (
    <Card className="group overflow-hidden rounded-2xl border-border/60 bg-card transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-panel">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <CompanyLogo company={job.company || job.title || ''} logoUrl={job.logo_url} size={32} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold" title={job.title}>
              {job.title}
            </h3>
            <p className="truncate text-xs text-muted-foreground">
              {job.company}
            </p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" /> {job.location}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`flex-shrink-0 text-[10px] capitalize ${STATUS_STYLES[saved.status] || ''}`}
          >
            {saved.status}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={saved.status} onValueChange={v => updateJobStatus(saved.job_id, v)}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="interview">Interview</SelectItem>
              <SelectItem value="offer">Offer</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs"
            onClick={() => setShowNotes(!showNotes)}
          >
            <StickyNote className="h-3 w-3" />
            {showNotes ? 'Hide' : 'Notes'}
          </Button>

          {job.apply_link && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-primary/30 text-xs text-primary hover:bg-primary/10 hover:text-primary"
              asChild
            >
              <a href={job.apply_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => unsaveJob(saved.job_id)}
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </Button>
        </div>

        {showNotes && (
          <div className="space-y-2">
            <Textarea
              placeholder="Notes, interviewer names, follow-up dates..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[70px] text-xs"
            />
            <Button
              size="sm"
              className="btn-premium h-8 text-xs"
              onClick={() => updateJobStatus(saved.job_id, saved.status, notes)}
            >
              Save notes
            </Button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Saved {new Date(saved.saved_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}

export function SavedJobsPanel({ savedJobs, updateJobStatus, unsaveJob }: SavedJobsPanelProps) {
  const [view, setView] = useState<'board' | 'list'>('board');

  if (savedJobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/30 bg-gradient-to-b from-primary/5 to-transparent py-12 text-center">
        <div className="mx-auto h-36 w-36" aria-hidden>
          <Suspense fallback={(
            <div className="flex h-full w-full items-center justify-center">
              <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/30">
                <Bookmark className="h-6 w-6" />
              </div>
            </div>
          )}
          >
            <ScoutOrb />
          </Suspense>
        </div>
        <p className="mt-2 text-sm font-medium">No saved jobs yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Save roles from Browse jobs to track them across your application board.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">{savedJobs.length}</span> saved · drag cards between stages
        </p>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
          {([['board', 'Board', Columns3], ['list', 'List', LayoutGrid]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                view === key ? 'bg-background text-primary shadow-soft' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'board' ? (
        <KanbanBoard savedJobs={savedJobs} updateJobStatus={updateJobStatus} unsaveJob={unsaveJob} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {savedJobs.map((saved) => (
            <SavedJobCard
              key={saved.job_id}
              saved={saved}
              updateJobStatus={updateJobStatus}
              unsaveJob={unsaveJob}
            />
          ))}
        </div>
      )}
    </div>
  );
}
