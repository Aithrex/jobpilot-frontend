/**
 * Auto-Apply preview (PAUSED) - the demoted surface for a feature that is on
 * hold. It is a pure, read-only preview of the Auto-Apply queue; it NEVER
 * submits, approves, toggles, or mutates anything. The only control is a
 * navigational link to the full `/app/apply/auto-apply` surface, where the
 * live on/off switch lives.
 *
 * One component, two inner layouts behind ONE labeled landmark:
 *   - DESKTOP (md+): a thin horizontal glass bar (`.glass-pane`, the single
 *     glass pane on Home content).
 *   - MOBILE (< md): an Instagram-style horizontally scrollable, snap-aligned
 *     strip of large tap targets.
 * Only one inner layout is in the a11y tree at a time (`hidden md:flex` /
 * `flex md:hidden`), so the region is announced exactly once at every width.
 *
 * State machine (keyed off `available` + `settingsLoading`, per the design):
 *   available === undefined  -> slim skeleton (same height, no "paused" text)
 *   available === false      -> calm paused line + CTA
 *   available === true, queue empty -> "nothing queued" line + CTA
 *   available === true, queue > 0   -> "PAUSED - PREVIEW" + up to 3 chips + CTA
 *   pendingError             -> calm paused line (preview is best-effort)
 */
import { Link } from 'react-router-dom';
import { Bot, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hostFromUrl } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAutoSubmit } from '@/hooks/useAutoSubmit';
import type { AutoSubmitApprovalView } from '@/types/autoSubmit';

const AUTO_APPLY_HREF = '/app/apply/auto-apply';
const PAUSED_FALLBACK = 'Auto-Apply is paused. When it is back, approved roles will queue here.';
const PAUSED_EMPTY = 'Auto-Apply is paused. Nothing is queued right now.';

/** A role to preview, derived defensively from a best-effort approval view. */
interface QueuedChip {
  key: string;
  label: string;
  company?: string;
}

/**
 * Best-effort chip text. `company`/`role`/`title` are documented as optional
 * enrichments, so fall back to the posting host and finally a non-empty label.
 * Never renders an empty chip.
 */
function toChip(row: AutoSubmitApprovalView, index: number): QueuedChip {
  const label =
    row.role ??
    row.title ??
    hostFromUrl(row.apply_url ?? row.application_url ?? row.url) ??
    'Queued role';
  const company = row.company ?? hostFromUrl(row.url) ?? undefined;
  return { key: row.application_id || `queued-${index}`, label, company };
}

/** The single CTA - navigational only, never a submit/toggle. */
function PreviewCta({ className }: { className?: string }) {
  return (
    <Button asChild variant="default" className={cn('shrink-0', className)}>
      <Link to={AUTO_APPLY_HREF}>Preview Auto-Apply</Link>
    </Button>
  );
}

/** The paused marker: word + icon, never color alone. */
function PausedTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <Pause className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="overline leading-none">Paused - Preview</span>
    </span>
  );
}

/** A neutral/muted queued-role chip. Never cherry (active) or sage (verified). */
function QueuedChipPill({ chip }: { chip: QueuedChip }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-caption text-muted-foreground">
      <span className="truncate font-medium text-foreground">{chip.label}</span>
      {chip.company ? <span className="truncate">{chip.company}</span> : null}
    </span>
  );
}

/** A large tap-target queued-role tile for the mobile strip. */
function QueuedChipTile({ chip }: { chip: QueuedChip }) {
  return (
    <Link
      to={AUTO_APPLY_HREF}
      className="flex min-h-[72px] w-40 shrink-0 snap-start flex-col justify-between rounded-control border border-border bg-card p-3 shadow-soft transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="line-clamp-2 text-caption font-medium text-foreground">{chip.label}</span>
      <span className="mt-2 flex items-center justify-between gap-2">
        {chip.company ? (
          <span className="truncate text-[0.75rem] text-muted-foreground">{chip.company}</span>
        ) : (
          <span />
        )}
        <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
          queued
        </span>
      </span>
    </Link>
  );
}

export function AutoApplyPreviewBar() {
  const { available, settingsLoading, pending, waiting, pendingError } = useAutoSubmit();

  // available === undefined (settings still resolving) -> slim skeleton.
  const resolving = available === undefined || settingsLoading;

  const chips: QueuedChip[] =
    available === true && !pendingError
      ? [...pending, ...waiting].slice(0, 3).map(toChip)
      : [];
  const hasQueue = chips.length > 0;

  // The paused line shown when there is nothing to preview.
  const pausedLine = available === false || pendingError ? PAUSED_FALLBACK : PAUSED_EMPTY;

  return (
    <section
      aria-label="Auto-Apply preview (paused)"
      role="region"
      className="rounded-container"
    >
      {/* ── Desktop: thin horizontal glass bar ─────────────────────────── */}
      <div
        className={cn(
          'glass-pane hidden min-h-14 rounded-container px-4 py-3 md:flex md:items-center md:gap-4',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>

        {resolving ? (
          <div className="flex flex-1 items-center gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <PausedTag />
            {hasQueue ? (
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                {chips.map((chip) => (
                  <QueuedChipPill key={chip.key} chip={chip} />
                ))}
              </div>
            ) : (
              <p className="truncate text-caption text-muted-foreground">{pausedLine}</p>
            )}
          </div>
        )}

        <PreviewCta className="ml-auto" />
      </div>

      {/* ── Mobile: Instagram-style horizontal strip ───────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {resolving ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <Skeleton className="h-[72px] w-48 shrink-0 rounded-control" />
            <Skeleton className="h-[72px] w-40 shrink-0 rounded-control" />
          </div>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Leading status card - a large tap target. */}
            <div className="glass-pane flex min-h-[72px] w-56 shrink-0 snap-start flex-col justify-between rounded-control p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <PausedTag />
              </div>
              {hasQueue ? null : (
                <p className="mt-2 line-clamp-2 text-[0.75rem] text-muted-foreground">{pausedLine}</p>
              )}
              <PreviewCta className="mt-2 h-9 w-full px-3 text-caption" />
            </div>

            {chips.map((chip) => (
              <QueuedChipTile key={chip.key} chip={chip} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
