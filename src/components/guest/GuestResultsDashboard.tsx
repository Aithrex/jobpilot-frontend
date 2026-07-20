import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyLogo } from '@/components/CompanyLogo';
import {
  ErrorCard,
  ScoreBadge,
  SignupCta,
  WorkingHeader,
  stepTransition,
} from '@/components/guest/_shared';
import { GuestJobDetail, type GuestJobDetailState } from '@/components/guest/GuestJobDetail';
import {
  MATCHES_STAGES,
  useStagedCopy,
  type GuestCta,
  type GuestMatchesState,
} from '@/hooks/useGuestFlow';
import { cn } from '@/lib/utils';
import type { GuestJobMatch } from '@/types/guest';

/**
 * The live match dashboard. Renders EXACTLY the matches the server returned
 * (it caps at 5; fewer is honest) — no client-side slicing, no decoy rows.
 *
 * Desktop: selectable list on the left, full detail (with the one-tailor
 * confirmation) on the right. Mobile: stacked cards; the selected card
 * expands into the same detail. After the single tailor succeeds, every
 * other card stays fully readable — only its tailor capability locks.
 */
export interface GuestResultsDashboardProps {
  matches: GuestJobMatch[];
  state: GuestMatchesState;
  error: string | null;
  cta: GuestCta | null;
  tailoredMatchId: string | null;
  remaining: number;
  selectedMatchId: string | null;
  onSelect: (matchId: string) => void;
  onTailor: (match: GuestJobMatch) => void;
  onViewTailored: () => void;
  onRetry: () => void;
}

function detailStateFor(
  match: GuestJobMatch,
  tailoredMatchId: string | null,
  remaining: number,
): GuestJobDetailState {
  if (tailoredMatchId && match.match_id === tailoredMatchId) return 'tailored';
  if (tailoredMatchId || remaining <= 0) return 'locked';
  return 'available';
}

export function GuestResultsDashboard({
  matches,
  state,
  error,
  cta,
  tailoredMatchId,
  remaining,
  selectedMatchId,
  onSelect,
  onTailor,
  onViewTailored,
  onRetry,
}: GuestResultsDashboardProps) {
  const reduceMotion = useReducedMotion();
  const stage = useStagedCopy(state === 'loading', MATCHES_STAGES, 7000);

  if (state === 'loading') {
    return (
      <div className="space-y-4" aria-live="polite" aria-busy="true">
        <WorkingHeader
          stage={stage}
          hint="First scan of the day takes a minute or two. Repeat visits are instant."
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 p-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="hidden lg:block">
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-11 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (state === 'cta' && cta) {
    return <SignupCta title={cta.title} body={cta.body} />;
  }

  if (state === 'error') {
    return (
      <ErrorCard title="Couldn't load your matches" body={error}>
        <Button onClick={onRetry}>Try again</Button>
      </ErrorCard>
    );
  }

  if (state === 'ready' && matches.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          </span>
          <p className="font-semibold">No strong matches today</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Nothing cleared our match bar today. We'd rather show you zero than pad the list.
            Check back tomorrow, or create a free account to scan more sources with your own
            filters.
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Create free account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state !== 'ready') return null;

  const selected =
    matches.find((m) => m.match_id === selectedMatchId) ?? matches[0] ?? null;

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground" role="status">
        {matches.length} {matches.length === 1 ? 'role' : 'roles'} cleared the bar in today's
        scan. Scores are estimates of fit, not hiring odds.
      </p>

      {/* ── Desktop: master list + detail ── */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <ol className="space-y-3" aria-label="Matched jobs">
          {matches.map((match, i) => {
            const isSelected = selected?.match_id === match.match_id;
            const isTailored = tailoredMatchId === match.match_id;
            return (
              <motion.li
                key={match.match_id}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...stepTransition, delay: reduceMotion ? 0 : Math.min(i * 0.06, 0.3) }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(match.match_id)}
                  aria-pressed={isSelected}
                  aria-label={`${match.title} at ${match.company}, estimated ${match.match_score} percent match${isTailored ? ', tailored' : ''}`}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    isSelected
                      ? 'border-primary/50 bg-primary/5 shadow-panel'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
                  )}
                >
                  <CompanyLogo company={match.company || match.title} logoUrl={match.logo_url} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold" title={match.title}>
                      {match.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {match.company}
                      {match.location ? ` · ${match.location}` : ''}
                    </span>
                    {isTailored && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        <Check className="h-2.5 w-2.5" aria-hidden />
                        Tailored
                      </span>
                    )}
                  </span>
                  <ScoreBadge score={match.match_score} />
                </button>
              </motion.li>
            );
          })}
        </ol>

        {selected && (
          <GuestJobDetail
            match={selected}
            state={detailStateFor(selected, tailoredMatchId, remaining)}
            onConfirmTailor={onTailor}
            onViewTailored={onViewTailored}
            className="lg:sticky lg:top-24"
          />
        )}
      </div>

      {/* ── Mobile: stacked expandable cards (no forced selection — cards
          expand and collapse independently of the desktop fallback) ── */}
      <ol className="space-y-3 lg:hidden" aria-label="Matched jobs">
        {matches.map((match, i) => {
          const isOpen = selectedMatchId === match.match_id;
          const isTailored = tailoredMatchId === match.match_id;
          return (
            <motion.li
              key={match.match_id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...stepTransition, delay: reduceMotion ? 0 : Math.min(i * 0.05, 0.25) }}
              className={cn(
                'overflow-hidden rounded-2xl border transition-colors',
                isOpen ? 'border-primary/40' : 'border-border',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(isOpen ? '' : match.match_id)}
                aria-expanded={isOpen}
                className="flex min-h-[44px] w-full items-center gap-3 bg-card p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CompanyLogo company={match.company || match.title} logoUrl={match.logo_url} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{match.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {match.company}
                    {match.location ? ` · ${match.location}` : ''}
                  </span>
                  {isTailored && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                      <Check className="h-2.5 w-2.5" aria-hidden />
                      Tailored
                    </span>
                  )}
                </span>
                <ScoreBadge score={match.match_score} />
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  aria-hidden
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                    animate={reduceMotion ? undefined : { height: 'auto', opacity: 1 }}
                    exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/60 p-1">
                      <GuestJobDetail
                        match={match}
                        state={detailStateFor(match, tailoredMatchId, remaining)}
                        onConfirmTailor={onTailor}
                        onViewTailored={onViewTailored}
                        showHeader={false}
                        className="border-0 bg-transparent p-4"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
