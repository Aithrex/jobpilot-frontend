/**
 * Widget primitives — the calm, editorial building blocks every dashboard
 * widget composes (Compass §7). One card shell, one designed empty state, one
 * skeleton, plus a few small data atoms (bars, chips, stat rows). Semantic
 * tokens only; every state is designed; targets are >= 44px where tappable.
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowRight, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tone = 'default' | 'primary' | 'warning' | 'success';

const TONE_CHIP: Record<Tone, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
};

const TONE_FRAME: Record<Tone, string> = {
  default: 'border-border',
  primary: 'border-primary/25',
  warning: 'border-warning/45 border-l-2 border-l-warning bg-warning/[0.04]',
  success: 'border-success/30',
};

/** In a 3-column desktop grid: 1 = quarter-ish, 2 = two-thirds, 3 = full band. */
export function spanClass(span: 1 | 2 | 3): string {
  if (span === 3) return 'sm:col-span-2 lg:col-span-3';
  if (span === 2) return 'sm:col-span-2 lg:col-span-2';
  return 'sm:col-span-1 lg:col-span-1';
}

/** The standard widget shell: header (icon + title + optional deep-link), body, footer. */
export function WidgetCard({
  icon: Icon,
  title,
  eyebrow,
  tone = 'default',
  accent = false,
  onOpen,
  openLabel = 'Open',
  children,
  footer,
  className,
}: {
  icon: LucideIcon;
  title: string;
  eyebrow?: string;
  tone?: Tone;
  /** Apply the tone's frame (border/wash) — reserve for genuinely urgent widgets. */
  accent?: boolean;
  onOpen?: () => void;
  openLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'card-hover flex h-full flex-col rounded-xl border bg-card p-4 shadow-soft sm:p-5',
        accent ? TONE_FRAME[tone] : 'border-border',
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', TONE_CHIP[tone])}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {eyebrow}
              </div>
            )}
            <h3 className="truncate text-sm font-semibold leading-tight text-foreground">{title}</h3>
          </div>
        </div>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="-mr-1 inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {openLabel} <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      {footer && <div className="mt-4 border-t border-border/70 pt-3">{footer}</div>}
    </section>
  );
}

/** A designed empty state — an inviting prompt + one action, never a blank card. */
export function WidgetEmpty({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-2 py-1">
      <p className="text-sm font-medium text-foreground/90">{title}</p>
      {body && <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>}
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-1 inline-flex items-center gap-1 rounded text-xs font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {ctaLabel} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/**
 * A quiet inline failure state — "Couldn't load — Retry". Used when a widget's
 * ctx slice failed to fetch, so we never show a lying empty state instead.
 */
export function WidgetError({ label = "Couldn't load", onRetry }: { label?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-1 items-center gap-1.5 py-1 text-xs text-muted-foreground">
      <CloudOff className="h-3.5 w-3.5 shrink-0 text-warning" />
      <span>{label}</span>
      {onRetry && (
        <>
          <span aria-hidden="true">—</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Retry
          </button>
        </>
      )}
    </div>
  );
}

/** A thin, precise progress bar (never a game meter). */
export function Bar({ pct, tone = 'primary', className }: { pct: number; tone?: Tone; className?: string }) {
  const fill: Record<Tone, string> = {
    default: 'bg-muted-foreground/50',
    primary: 'bg-primary',
    warning: 'bg-warning',
    success: 'bg-success',
  };
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', fill[tone])}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, transitionTimingFunction: 'var(--ease-out-expo)' }}
      />
    </div>
  );
}

/** A small labelled pill (match %, sponsor band, posted-ago …). */
export function MetaChip({ children, tone = 'default' }: { children: ReactNode; tone?: Tone }) {
  const styles: Record<Tone, string> = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', styles[tone])}>
      {children}
    </span>
  );
}

/** A big number + label, used across momentum/interview/learning widgets. */
export function Stat({ value, label, tone = 'default' }: { value: ReactNode; label: string; tone?: Tone }) {
  const color: Record<Tone, string> = {
    default: 'text-foreground',
    primary: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
  };
  return (
    <div>
      <div className={cn('font-display text-2xl font-extrabold tabular-nums leading-none tracking-tight', color[tone])}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/** Skeleton that mirrors the widget shell so nothing shifts when data lands. */
export function WidgetSkeleton({ span = 1, lines = 3 }: { span?: 1 | 2 | 3; lines?: number }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-soft sm:p-5', spanClass(span))}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${90 - i * 14}%` }} />
        ))}
      </div>
    </div>
  );
}
