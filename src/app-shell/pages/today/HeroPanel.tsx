/**
 * Zone A hero - "Are we OK?"  The single highest-value indicator.
 *
 * Priority order (Compass mission-control):
 *   1. The unified TODAY INBOX - approvals, auto-submit hand-offs, inbox status
 *      suggestions, and "did you apply?" nudges the user needs to act on. This
 *      is the primary hero surface whenever the count is > 0. The feed is
 *      composed server-side (GET /api/apply/today-inbox); the hero just renders
 *      it, one row per item with a per-kind icon and a per-item action.
 *   2. Otherwise, today's application status - a calm, encouraging read of the
 *      day (sent today, streak) with a forward action.
 *
 * Copy is written from the user's side ("3 items need you"), never in system
 * terms. Non-punitive: an empty queue is a win, not a scolding.
 */
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Inbox,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Flame,
  CheckCircle2,
  ListChecks,
  Send,
  CircleHelp,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DURATION, EASE_STANDARD } from '@/lib/motion';
import type { TodayInboxKind } from '@/types/todayInbox';
import { PanelError, Stat } from './primitives';

export interface HeroInputItem {
  id: string;
  kind: TodayInboxKind;
  title: string;
  detail: string;
  /** In-app SPA path, or an absolute http(s) URL (opened in a new tab). */
  deepLink: string;
  /** CTA copy for this row's primary action. */
  actionLabel: string;
}

export interface HeroModel {
  state: 'loading' | 'error' | 'ready';
  /** Total items awaiting the user in the Today inbox. */
  needsCount: number;
  /** Top few inbox items to preview under the headline. */
  items: HeroInputItem[];
  /** Whether the Today-inbox feed loaded at all (distinguishes empty from down). */
  queueAvailable: boolean;
  appliedToday: number;
  streakDays: number;
  totalApps: number;
}

/** Per-kind leading icon - never colour-alone; the icon carries the meaning. */
const KIND_ICON: Record<TodayInboxKind, LucideIcon> = {
  needs_input: ListChecks,
  auto_submit: Send,
  inbox_suggestion: Inbox,
  did_you_apply: CircleHelp,
};

/** "Find roles" lands on Discover › Jobs - the shell's own job search. */
const FIND_ROLES_HREF = '/app/jobs/for-you';

/** Absolute http(s) links leave the SPA; everything else is an in-app route. */
function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** The shell is mounted under this base during the strangler-fig migration. */
const SHELL_BASE = '/app';

/**
 * The backend emits base-agnostic in-app paths (e.g. "/applications") - it
 * shouldn't know the FE's route structure. Resolve them against the shell mount
 * so navigate() lands on a real route instead of the NotFound catch-all.
 * External URLs and already-prefixed paths pass through unchanged.
 */
function resolveDeepLink(href: string): string {
  if (isExternal(href) || !href.startsWith('/')) return href;
  if (href === SHELL_BASE || href.startsWith(`${SHELL_BASE}/`)) return href;
  return `${SHELL_BASE}${href}`;
}

export function HeroPanel({ model, onRetry }: { model: HeroModel; onRetry: () => void }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const go = (href: string) => {
    if (isExternal(href)) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      navigate(href);
    }
  };

  if (model.state === 'loading') {
    return (
      <div className="rounded-container border border-border bg-card p-6 shadow-soft sm:p-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-11 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <Skeleton className="mt-6 h-11 w-40" />
      </div>
    );
  }

  if (model.state === 'error') {
    return (
      <PanelError
        title="We couldn't load your day"
        body="We couldn't reach your workspace just now. Nothing is lost. Retry when you're ready."
        onRetry={onRetry}
        className="sm:py-14"
      />
    );
  }

  const hasQueue = model.needsCount > 0;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : DURATION.base, ease: EASE_STANDARD }}
      className="relative overflow-hidden rounded-container border border-border bg-card p-6 shadow-soft sm:p-8"
    >
      {hasQueue ? (
        <div className="space-y-5">
          <div className="max-w-2xl space-y-2">
            <p className="inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.06em] text-primary">
              <Inbox className="h-3.5 w-3.5" aria-hidden="true" /> Needs your input
            </p>
            <h2 className="text-title font-display text-foreground">
              <Stat className="text-primary">{model.needsCount}</Stat>{' '}
              {model.needsCount === 1 ? 'item needs you' : 'items need you'} today
            </h2>
            <p className="text-body text-muted-foreground">
              Reviews and approvals are waiting on your call. Clear them and Aspirely keeps moving.
            </p>
          </div>

          {model.items.length > 0 ? (
            <ul className="space-y-2">
              {model.items.map((it) => {
                const Icon = KIND_ICON[it.kind] ?? Inbox;
                const external = isExternal(it.deepLink);
                return (
                  <li
                    key={it.id}
                    className="flex flex-col gap-3 rounded-control border border-border bg-background/40 p-3 transition-[background-color,border-color] duration-fast ease-standard hover:border-primary/30 hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-body font-medium text-foreground">{it.title}</p>
                        <p className="truncate text-caption text-muted-foreground">{it.detail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => go(resolveDeepLink(it.deepLink))}
                      className="interactive interactive-press inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-control border border-border bg-card px-4 text-caption font-semibold text-foreground shadow-soft hover:bg-muted"
                    >
                      {it.actionLabel}
                      {external ? (
                        <>
                          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </>
                      ) : (
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.06em] text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {model.queueAvailable ? 'All caught up' : "Today's focus"}
            </p>
            {model.totalApps === 0 ? (
              <>
                <h2 className="text-title font-display text-foreground">Let's get your first application out</h2>
                <p className="text-body text-muted-foreground">
                  Nothing is waiting on you yet. Find a role that fits and Aspirely will tailor everything
                  around it.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-title font-display text-foreground">
                  {model.appliedToday > 0 ? (
                    <>
                      <Stat>{model.appliedToday}</Stat>{' '}
                      {model.appliedToday === 1 ? 'application sent' : 'applications sent'} today
                    </>
                  ) : (
                    'Nothing needs you right now'
                  )}
                </h2>
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-muted-foreground">
                  {model.streakDays > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-warning" aria-hidden="true" />
                      <Stat>{model.streakDays}</Stat>-day streak
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                    {model.appliedToday > 0
                      ? 'Keep the momentum going'
                      : 'A good moment to line up your next role'}
                  </span>
                </p>
              </>
            )}
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => go(FIND_ROLES_HREF)}
              className="group interactive interactive-press inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-5 text-body font-semibold text-primary-foreground shadow-soft hover:bg-primary/90"
            >
              Find roles
              <ArrowRight className="icon-advance h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
