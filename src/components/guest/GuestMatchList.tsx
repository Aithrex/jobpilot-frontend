import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ErrorCard,
  SignupCta,
  WorkingHeader,
} from '@/components/guest/_shared';
import {
  GuestMatchCard,
  type GuestMatchCardState,
} from '@/components/guest/GuestMatchCard';
import {
  MATCHES_STAGES,
  useStagedCopy,
  type GuestCta,
  type GuestMatchesState,
} from '@/hooks/useGuestFlow';
import type { GuestJobMatch } from '@/types/guest';

export interface GuestMatchListProps {
  matches: GuestJobMatch[];
  state: GuestMatchesState;
  error: string | null;
  cta: GuestCta | null;
  /** match_id of the finished tailor — that card offers "view", others lock. */
  tailoredMatchId: string | null;
  /** Free tailors remaining (0 = every card locks with the signup CTA). */
  remaining: number;
  onTailor: (match: GuestJobMatch) => void;
  onViewTailored: () => void;
  onRetry: () => void;
}

/**
 * Renders EXACTLY the matches the server returned (it caps at 5) — no
 * client-side slicing, no blurred decoy rows, no hidden data. After the one
 * guest tailor succeeds (or for an already-exhausted returning guest) the
 * remaining cards stay fully readable; only their tailor buttons lock.
 */
export function GuestMatchList({
  matches,
  state,
  error,
  cta,
  tailoredMatchId,
  remaining,
  onTailor,
  onViewTailored,
  onRetry,
}: GuestMatchListProps) {
  const stage = useStagedCopy(state === 'loading', MATCHES_STAGES, 7000);

  if (state === 'loading') {
    return (
      <div className="space-y-4" aria-live="polite" aria-busy="true">
        <WorkingHeader
          stage={stage}
          hint="First scan of the day takes a minute or two. Repeat visits are instant."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-full space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
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

  return (
    <>
      <p className="mb-4 text-xs text-muted-foreground" role="status">
        {matches.length} {matches.length === 1 ? 'role' : 'roles'} cleared the bar in today's
        scan. Scores are estimates of fit, not hiring odds.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {matches.map((match, i) => {
          const cardState: GuestMatchCardState =
            tailoredMatchId && match.match_id === tailoredMatchId
              ? 'tailored'
              : tailoredMatchId || remaining <= 0
                ? 'locked'
                : 'available';
          return (
            <GuestMatchCard
              key={match.match_id}
              match={match}
              state={cardState}
              index={i}
              onTailor={onTailor}
              onViewTailored={onViewTailored}
            />
          );
        })}
      </div>
    </>
  );
}
