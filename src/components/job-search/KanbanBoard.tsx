import { useState } from 'react';
import { ExternalLink, GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toTitleCase } from '@/lib/format';
import { CompanyLogo } from '@/components/CompanyLogo';
import type { SavedJob } from '@/types/jobs';

interface KanbanBoardProps {
  savedJobs: SavedJob[];
  updateJobStatus: (jobId: string, status: string, notes?: string) => Promise<unknown>;
  unsaveJob: (jobId: string) => Promise<unknown>;
}

const COLUMNS: Array<{ key: string; label: string; head: string }> = [
  { key: 'interested', label: 'Saved', head: 'border-info/40 text-info' },
  { key: 'applied', label: 'Applied', head: 'border-warning/40 text-warning' },
  { key: 'interview', label: 'Interview', head: 'border-primary/40 text-primary' },
  { key: 'offer', label: 'Offer', head: 'border-success/40 text-success' },
  { key: 'rejected', label: 'Rejected', head: 'border-destructive/40 text-destructive' },
  { key: 'withdrawn', label: 'Withdrawn', head: 'border-border text-muted-foreground' },
];

const STATUS_OPTIONS = COLUMNS.map((c) => ({ value: c.key, label: c.label }));

function Tile({ saved, updateJobStatus, unsaveJob }: {
  saved: SavedJob;
  updateJobStatus: KanbanBoardProps['updateJobStatus'];
  unsaveJob: KanbanBoardProps['unsaveJob'];
}) {
  const job = saved.job_data;
  const title = toTitleCase(job.title);
  const company = toTitleCase(job.company);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', saved.job_id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="group cursor-grab rounded-xl border border-border/60 bg-card p-3 shadow-soft transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-panel active:cursor-grabbing"
    >
      <div className="flex items-start gap-2">
        <CompanyLogo company={job.company || job.title || ''} logoUrl={job.logo_url} size={32} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-foreground" title={title}>{title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{company}</p>
        </div>
        <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" aria-hidden />
      </div>

      <div className="mt-2 flex items-center gap-1">
        {/* Keyboard-accessible move control (drag is pointer-only). */}
        <select
          value={saved.status}
          onChange={(e) => void updateJobStatus(saved.job_id, e.target.value)}
          aria-label={`Move ${title} to another stage`}
          className="h-7 flex-1 rounded-md border border-border bg-background px-1.5 text-[11px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {job.apply_link && (
          <a
            href={job.apply_link}
            target="_blank"
            rel="noopener noreferrer"
            title="Open posting"
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
        <button
          type="button"
          onClick={() => void unsaveJob(saved.job_id)}
          title="Remove"
          aria-label={`Remove ${title}`}
          className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </article>
  );
}

/**
 * Drag-and-drop application board. Columns are the funnel stages; dragging a
 * card between them updates its status. Native HTML5 DnD (no dependency); each
 * card also carries a keyboard-accessible stage <select> so the board works
 * without a pointer.
 */
export function KanbanBoard({ savedJobs, updateJobStatus, unsaveJob }: KanbanBoardProps) {
  const [overCol, setOverCol] = useState<string | null>(null);

  const byStatus = (status: string) => savedJobs.filter((j) => j.status === status);

  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setOverCol(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const current = savedJobs.find((j) => j.job_id === id);
    if (current && current.status !== status) void updateJobStatus(id, status);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
      {COLUMNS.map((col) => {
        const items = byStatus(col.key);
        const isOver = overCol === col.key;
        return (
          <section
            key={col.key}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
            onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
            onDrop={(e) => onDrop(e, col.key)}
            aria-label={`${col.label} (${items.length})`}
            className={cn(
              'flex min-h-[8rem] w-[15rem] flex-shrink-0 flex-col rounded-2xl border bg-muted/20 p-2 transition-colors',
              isOver ? 'border-primary/50 bg-primary/5' : 'border-border/60',
            )}
          >
            <header className={cn('mb-2 flex items-center justify-between rounded-lg border-b-2 bg-transparent px-1 pb-1.5 text-xs font-semibold', col.head)}>
              <span>{col.label}</span>
              <span className="font-mono tabular-nums text-[11px] opacity-70">{items.length}</span>
            </header>
            <div className="flex flex-1 flex-col gap-2">
              {items.map((saved) => (
                <Tile key={saved.job_id} saved={saved} updateJobStatus={updateJobStatus} unsaveJob={unsaveJob} />
              ))}
              {items.length === 0 && (
                <p className="mt-2 px-1 text-center text-[11px] text-muted-foreground/60">
                  {isOver ? 'Drop here' : '—'}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
