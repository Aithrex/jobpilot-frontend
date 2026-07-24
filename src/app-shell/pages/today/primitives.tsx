/**
 * Today (mission-control) - shared presentational primitives.
 *
 * These carry the four required async states as first-class, reusable pieces so
 * every panel on the page (KPIs, trend, funnel, table) speaks the same visual
 * language: a skeleton that MIRRORS the final layout, an empty state that
 * explains the panel + a next action, and a recoverable error state in plain
 * language (never a stack trace). Tokens only; verified in both themes.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  RefreshCw,
  Bookmark,
  Send,
  CalendarClock,
  Handshake,
  CircleSlash,
  XCircle,
  CircleDashed,
  FileText,
  type LucideIcon,
} from 'lucide-react';

/** Per-panel async lifecycle. Kept explicit so each surface owns its own state. */
export type PanelState = 'loading' | 'error' | 'empty' | 'ready';

/* ── Section scaffolding ─────────────────────────────────────────────────── */

export function ZoneHeading({
  overline,
  title,
  hint,
  action,
}: {
  /** Optional eyebrow - reserve it for headings that need extra framing. */
  overline?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div className="space-y-1">
        {overline ? <p className="overline leading-none">{overline}</p> : null}
        <h2 className="text-h2 font-display text-foreground">{title}</h2>
        {hint ? <p className="text-caption text-muted-foreground">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ── Panel-level empty / error states ────────────────────────────────────── */

export function PanelEmpty({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-container border border-dashed border-border bg-muted/30 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-body font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-caption text-muted-foreground">{body}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function PanelError({
  title = 'This panel could not load',
  body = 'The connection dropped or the server was busy. Your data is safe. Try again.',
  onRetry,
  className,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-container border border-destructive/30 bg-destructive/5 px-6 py-10 text-center',
        className,
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-body font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-caption text-muted-foreground">{body}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border bg-card px-3.5 text-caption font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
        </button>
      ) : null}
    </div>
  );
}

/* ── Card shell used by every panel so elevation / radius stay consistent ── */

export function PanelCard({
  children,
  className,
  ...rest
}: {
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-container border border-border bg-card p-5 text-card-foreground shadow-soft',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

/* ── Numbers ─────────────────────────────────────────────────────────────── */

/** All figures on the page render tabular so columns and deltas stay aligned. */
export function Stat({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{children}</span>;
}

/* ── Application-status semantics (icon + label + hue; never colour alone) ── */

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Tinted text + surface classes (token-driven; AA in both themes). */
  tone: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  interested: { label: 'Saved', icon: Bookmark, tone: 'text-muted-foreground bg-muted' },
  draft: { label: 'Draft', icon: FileText, tone: 'text-muted-foreground bg-muted' },
  applied: { label: 'Applied', icon: Send, tone: 'text-primary bg-primary/10' },
  active: { label: 'Active', icon: Send, tone: 'text-primary bg-primary/10' },
  interview: { label: 'Interviewing', icon: CalendarClock, tone: 'text-warning bg-warning/10' },
  interviewing: { label: 'Interviewing', icon: CalendarClock, tone: 'text-warning bg-warning/10' },
  offer: { label: 'Offer', icon: Handshake, tone: 'text-success bg-success/10' },
  rejected: { label: 'Closed', icon: XCircle, tone: 'text-muted-foreground bg-muted' },
  withdrawn: { label: 'Withdrawn', icon: CircleSlash, tone: 'text-muted-foreground bg-muted' },
  ghosted: { label: 'No reply', icon: CircleDashed, tone: 'text-muted-foreground bg-muted' },
};

function statusMeta(status: string | undefined): StatusMeta {
  return (
    STATUS_META[(status || '').toLowerCase()] ?? {
      label: status ? status[0].toUpperCase() + status.slice(1) : 'Unknown',
      icon: CircleDashed,
      tone: 'text-muted-foreground bg-muted',
    }
  );
}

export function StatusPill({ status }: { status: string | undefined }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium leading-none',
        meta.tone,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/* ── Skeleton helpers that mirror the real layouts ───────────────────────── */

export function StatCardSkeleton() {
  return (
    <div className="rounded-container border border-border bg-card p-5 shadow-soft">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-9 w-20" />
      <Skeleton className="mt-3 h-3 w-28" />
    </div>
  );
}
