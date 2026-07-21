import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown, CloudOff, FileSearch, Lock, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyLogo } from '@/components/CompanyLogo';
import {
  ErrorCard,
  PhaseAnnouncer,
  PhaseStepper,
  ScoreBadge,
  SignupCta,
  WorkingHeader,
  stepTransition,
  type PhaseDef,
} from '@/components/guest/_shared';
import { GuestJobDetail, type GuestJobDetailState } from '@/components/guest/GuestJobDetail';
import {
  MATCHES_STAGES,
  useStagedCopy,
  type GuestCta,
  type GuestMatchesMeta,
  type GuestMatchesState,
} from '@/hooks/useGuestFlow';
import { cn } from '@/lib/utils';
import type { GuestJobMatch, GuestJobProgress, GuestSeniority } from '@/types/guest';

/**
 * The live match dashboard. Renders EXACTLY the matches the server returned
 * (it caps at 5; fewer is honest) — no client-side slicing, no decoy rows.
 * v3: the loading stepper follows the server's real progress markers, the
 * header count is honest ("We found N strong matches" from total_considered),
 * and a zero-result day distinguishes no-openings vs sources-unavailable vs
 * low-signal from empty_reason/sources_report (retry only where retry helps).
 *
 * Desktop: selectable list on the left, full detail (with the one-tailor
 * confirmation) on the right. Mobile: stacked cards; the selected card
 * expands into the same detail. After the single tailor succeeds, every
 * other card stays fully readable — only its tailor capability locks.
 * Hovering a matched skill in the detail dims the cards that do NOT carry
 * that skill (opacity only), so the skill's reach is visible at a glance.
 */
export interface GuestResultsDashboardProps {
  matches: GuestJobMatch[];
  state: GuestMatchesState;
  /** Server-emitted sub-phase while loading (null until the first marker). */
  progress?: GuestJobProgress | null;
  /** Honest completion metadata (counts + empty reason + source report). */
  meta?: GuestMatchesMeta;
  error: string | null;
  cta: GuestCta | null;
  tailoredMatchId: string | null;
  remaining: number;
  selectedMatchId: string | null;
  onSelect: (matchId: string) => void;
  onTailor: (match: GuestJobMatch) => void;
  onViewTailored: () => void;
  onRetry: () => void;
  /** v4: seniority toggle — an instant server-side re-slice of the day's
   * scanned pool (never a re-scan). Absent on legacy cached results. */
  onSeniorityChange?: (seniority: GuestSeniority) => void;
  seniorityPending?: boolean;
}

const SENIORITY_LABELS: Record<GuestSeniority, string> = {
  any: 'All levels',
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
};

/** The backend's guest_matches phases, in emission order (v3 3.4). */
const MATCH_PHASES: readonly PhaseDef[] = [
  { key: 'reading_resume', label: 'Reading your resume' },
  { key: 'searching_sources', label: 'Searching live sources' },
  { key: 'ranking', label: 'Ranking matches' },
  { key: 'finalizing', label: 'Finalizing' },
];

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
  progress = null,
  meta = {},
  error,
  cta,
  tailoredMatchId,
  remaining,
  selectedMatchId,
  onSelect,
  onTailor,
  onViewTailored,
  onRetry,
  onSeniorityChange,
  seniorityPending = false,
}: GuestResultsDashboardProps) {
  const reduceMotion = useReducedMotion();
  const stage = useStagedCopy(state === 'loading', MATCHES_STAGES, 7000);
  /** Matched skill hovered in the detail pane — cards WITHOUT it dim. */
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  if (state === 'loading') {
    const phaseIndex = progress ? MATCH_PHASES.findIndex((p) => p.key === progress.phase) : -1;
    return (
      <div className="space-y-4" aria-busy="true">
        {/* One debounced polite region announcing REAL phase changes only. */}
        <PhaseAnnouncer message={phaseIndex >= 0 ? MATCH_PHASES[phaseIndex].label : null} />
        <WorkingHeader
          stage={stage}
          hint="This runs the same full scan signed-in members get, across every source in parallel. A first scan can take a few minutes; repeat visits are instant."
        />
        <PhaseStepper phases={MATCH_PHASES} activeKey={progress?.phase ?? null} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
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
    const report = meta.sourcesReport;
    const allSourcesDown =
      !!report &&
      (report.ok?.length ?? 0) === 0 &&
      (report.failed?.length ?? 0) + (report.timed_out?.length ?? 0) > 0;

    // Sources unavailable / timed out: not a verdict on the resume — retry
    // genuinely helps here, so offer it.
    if (meta.emptyReason === 'sources_unavailable' || allSourcesDown) {
      return (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <CloudOff className="h-6 w-6 text-warning" aria-hidden />
            </span>
            <p className="font-semibold">Job sources did not respond</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              We could not reach the live career sites just now, so this is not a verdict on
              your resume. Trying again usually works within a few minutes.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <Button size="sm" onClick={onRetry}>
                Try again
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/register">Create free account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Low-signal resume: the scan completed but the resume carried too little
    // to score against. Retrying the same scan will not help — a richer,
    // text-based resume will.
    if (meta.emptyReason === 'low_signal_resume') {
      return (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <FileSearch className="h-6 w-6 text-primary" aria-hidden />
            </span>
            <p className="font-semibold">We could not read enough from that resume</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              The scan finished, but your resume did not carry enough detail to score against
              live openings. A text-based resume with your skills and recent roles spelled out
              gives much better matches.
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

    // Completed scan, nothing cleared the bar — honest zero, no retry (the
    // same-day scan is cached; retrying returns the same answer).
    return (
      <Card>
        <CardContent className="space-y-3 p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" aria-hidden />
          </span>
          <p className="font-semibold">No matches cleared the bar today</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Nothing cleared our match bar today
            {typeof meta.totalConsidered === 'number' && meta.totalConsidered > 0
              ? ` across ${meta.totalConsidered} roles considered`
              : ''}
            . We'd rather show you zero than pad the list. Check back tomorrow, or create a
            free account to scan more sources with your own filters.
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

  const lockedCount = meta.lockedCount ?? 0;
  const detected = meta.detectedExperience;

  return (
    <div>
      {/* ── Seniority view toggle (v4): defaults to the level DETECTED from
          the resume's own dates; switching re-slices the day's scanned pool
          server-side instantly — never a re-scan, never quota. ── */}
      {meta.seniority && onSeniorityChange && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {detected?.level && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <UserRoundCheck className="h-3.5 w-3.5" aria-hidden />
              Detected: {SENIORITY_LABELS[detected.level] ?? detected.level}
              {typeof detected.years === 'number' && detected.years > 0
                ? ` · ${detected.years} ${detected.years === 1 ? 'yr' : 'yrs'}`
                : ''}
            </span>
          )}
          <div
            role="group"
            aria-label="Seniority view"
            className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5"
          >
            {(Object.keys(SENIORITY_LABELS) as GuestSeniority[]).map((level) => {
              const active = meta.seniority === level;
              const count = meta.seniorityCounts?.[level];
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  disabled={seniorityPending}
                  onClick={() => onSeniorityChange(level)}
                  className={cn(
                    'inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {SENIORITY_LABELS[level]}
                  {typeof count === 'number' && (
                    <span className={cn('tabular-nums', active ? 'opacity-90' : 'opacity-70')}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mb-4 text-xs text-muted-foreground" role="status">
        {typeof meta.poolTotal === 'number' && meta.poolTotal > matches.length
          ? `Showing your top ${matches.length} of ${meta.poolTotal} matches` +
            (typeof meta.totalConsidered === 'number' && meta.totalConsidered > 0
              ? ` across ${meta.totalConsidered} roles considered. `
              : '. ')
          : matches.length < 5 && typeof meta.totalConsidered === 'number' && meta.totalConsidered > 0
            ? `We found ${matches.length} ${matches.some((m) => (m.match_score ?? 0) >= 40) ? 'strong ' : ''}${matches.length === 1 ? 'match' : 'matches'} across ${meta.totalConsidered} roles considered. `
            : `${matches.length} ${matches.length === 1 ? 'role' : 'roles'} cleared the bar in today's scan. `}
        Scores are estimates of fit, not hiring odds.
      </p>

      {/* ── Desktop: master list + detail ── */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <ol className="space-y-3" aria-label="Matched jobs">
          {matches.map((match, i) => {
            const isSelected = selected?.match_id === match.match_id;
            const isTailored = tailoredMatchId === match.match_id;
            const dimmed =
              !!hoveredSkill && !(match.matched_skills ?? []).includes(hoveredSkill);
            return (
              <motion.li
                key={match.match_id}
                // The selected card is the tailor morph source: it shares a
                // layoutId with the tailoring pane header so confirming a
                // tailor visually carries the card into the compare view.
                layoutId={
                  !reduceMotion && isSelected ? 'guest-tailor-card' : undefined
                }
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
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
            onSkillHover={setHoveredSkill}
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
          const dimmed =
            !!hoveredSkill && !(match.matched_skills ?? []).includes(hoveredSkill);
          return (
            <motion.li
              key={match.match_id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: dimmed ? 0.4 : 1, y: 0 }}
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
                        onSkillHover={setHoveredSkill}
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

      {/* ── Locked remainder (v4): the scan found MORE than the guest cap.
          Placeholder rows only — no real titles or companies leak; the
          count is the honest pool number. ── */}
      {lockedCount > 0 && (
        <div className="mt-6" data-testid="locked-matches">
          <div aria-hidden className="space-y-2">
            {Array.from({ length: Math.min(3, lockedCount) }, (_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4"
                style={{ opacity: 1 - i * 0.25 }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/5 animate-none" />
                  <Skeleton className="h-2.5 w-1/4 animate-none" />
                </span>
                <Skeleton className="h-6 w-16 shrink-0 rounded-full animate-none" />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <SignupCta
              title={`${lockedCount} more ${lockedCount === 1 ? 'match' : 'matches'} found for your resume`}
              body="Create a free account to see your full match list, filter it your way, and tailor up to 5 resumes per day."
            />
          </div>
        </div>
      )}
    </div>
  );
}
