import { useCallback, useEffect, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BadgeCheck,
  Check,
  FileText,
  Loader2,
  Lock,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestOnboardingEnabled, markGuestOnboardingUnavailable } from '@/lib/guest';
import {
  PARSE_STAGES,
  useGuestFlow,
  useStagedCopy,
  type GuestStep,
} from '@/hooks/useGuestFlow';
import {
  ErrorCard,
  SignupCta,
  TailorQuota,
  WorkingHeader,
  stepTransition,
} from '@/components/guest/_shared';
import { GuestDropzone } from '@/components/guest/GuestDropzone';
import { GuestMatchList } from '@/components/guest/GuestMatchList';
import { GuestTailorPanel } from '@/components/guest/GuestTailorPanel';

/**
 * /start — guest onboarding shell (spec v2): upload → parsed resume →
 * exactly 5 server-capped matches → ONE free tailored resume with polished
 * PDF/DOCX download, all before signup. First impression of the product:
 * calm, honest, mobile-first.
 *
 * The flow state machine lives in useGuestFlow; the reusable pieces
 * (GuestDropzone, GuestMatchList, GuestTailorPanel) are shared with the
 * landing hero. Guest failures are 400/404/429/503 (never 401); the 429
 * variants (quota_exhausted / capacity / challenge_required) render
 * conversion CTAs, never error toasts. A 503/404 anywhere = feature off /
 * edge route not live → fall back to the login-first landing for the session.
 */

const FLOW_STEPS = ['Upload', 'Matches', 'Tailor'] as const;

/** Compact three-step rail so guests always know where they are in the flow
 *  (on the hero it previews the journey). Purely presentational — state is
 *  conveyed by number/check + label, never colour alone. */
function StepRail({ step, className }: { step: GuestStep; className?: string }) {
  const current = step === 'tailor' ? 2 : step === 'matches' ? 1 : 0;
  return (
    <ol
      aria-label={`Progress: step ${current + 1} of ${FLOW_STEPS.length}`}
      className={cn('flex items-center justify-center', className)}
    >
      {FLOW_STEPS.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <li key={label} className="flex items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  'mx-1.5 h-px w-4 transition-colors sm:mx-2 sm:w-8',
                  isDone || isActive ? 'bg-primary/40' : 'bg-border',
                )}
              />
            )}
            <span
              aria-current={isActive ? 'step' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : isDone
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border text-muted-foreground',
              )}
            >
              {isDone ? (
                <>
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  <span className="sr-only">Done: </span>
                </>
              ) : (
                <span className="tabular-nums" aria-hidden>
                  {i + 1}.
                </span>
              )}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Start() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const fallbackToLanding = useCallback(() => {
    // Backend says the feature is off (503) or the edge route isn't live
    // (404) — retreat to the existing login-first landing for this session.
    markGuestOnboardingUnavailable();
    navigate('/', { replace: true });
  }, [navigate]);

  const flow = useGuestFlow({
    enabled: !authLoading && !isAuthenticated && isGuestOnboardingEnabled(),
    onUnavailable: fallbackToLanding,
  });
  const {
    step,
    session,
    guestName,
    tailorsUsed,
    tailorsLimit,
    remaining,
    parseStatus,
    parseError,
    parseCta,
  } = flow;

  const stepSectionRef = useRef<HTMLElement | null>(null);
  const prevStepRef = useRef<GuestStep>('hero');

  // Landing handoff: the landing hero forwards an already-selected file via
  // router state (navigate('/start', { state: { file } })) so guests never
  // re-pick it. Stash the file, then clear the history entry's state so a
  // refresh or back-navigation can't re-trigger the upload.
  const handoffFileRef = useRef<File | null>(null);
  useEffect(() => {
    const file = (location.state as { file?: unknown } | null)?.file;
    if (file instanceof File) {
      handoffFileRef.current = file;
      navigate('/start', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  // Start the handed-off upload once auth + the feature flag settle (the
  // route guards below would otherwise redirect before flow init).
  useEffect(() => {
    if (authLoading || isAuthenticated || !isGuestOnboardingEnabled()) return;
    const file = handoffFileRef.current;
    if (!file) return;
    handoffFileRef.current = null;
    void flow.startUpload(file);
  }, [authLoading, isAuthenticated, flow]);

  const parseStage = useStagedCopy(step === 'parsing' && !parseError && !parseCta, PARSE_STAGES);

  // Step transition variants — inert under prefers-reduced-motion (framer
  // animates inline styles, so the CSS reduced-motion net can't catch it).
  const stepMotion = reduceMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: stepTransition,
      };

  // Focus management: after a user-initiated step change, move focus to the
  // new step's region (its aria-label announces where we landed). Waits out
  // the exit+enter transition; never fires for the initial hero render.
  useEffect(() => {
    if (prevStepRef.current === step) return;
    prevStepRef.current = step;
    if (step === 'hero') return;
    const t = window.setTimeout(() => stepSectionRef.current?.focus(), 340);
    return () => window.clearTimeout(t);
  }, [step]);

  // ── Route guards (after hooks) ─────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" aria-live="polite">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to="/next/today" replace />;
  if (!isGuestOnboardingEnabled()) return <Navigate to="/" replace />;

  // v2 recognition rule: `recognized` drives the banner; the name renders
  // ONLY when the session response (guest_id-proven) actually included
  // recognized_name — device/fingerprint-only matches stay name-less.
  const recognized = !!session?.recognized;
  const recognizedName = session?.recognized_name || '';
  const hasReturningResume = !!(session?.exists && session.has_resume);
  const firstName = guestName?.split(' ')[0];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Persistent slim guest banner */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            Aspirely
          </Link>
          <span className="hidden text-xs text-muted-foreground md:inline">
            Guest preview. Create a free account to save your work
          </span>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <TailorQuota used={tailorsUsed} limit={tailorsLimit} className="hidden sm:block" />
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">
                <span className="sm:hidden">Sign up free</span>
                <span className="hidden sm:inline">Create free account</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
        <StepRail step={step} className="mb-8 sm:mb-10" />

        {/* Welcome-back recognition (soft — guests may continue below).
            Also shown right after parsing, when the parse job's `guest`
            block recognizes a returning person. */}
        {recognized && (step === 'hero' || step === 'matches') && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stepTransition}
            className="mb-8 space-y-1.5"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center">
              <UserRound className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <p className="flex-1 text-sm">
                {recognizedName ? (
                  <>
                    Welcome back, <span className="font-semibold">{recognizedName}</span>. Sign in
                    to pick up where you left off.
                  </>
                ) : (
                  <>Welcome back. Sign in to pick up where you left off.</>
                )}
              </p>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <p className="px-1 text-xs text-muted-foreground">
              Or keep going as a guest below
              {remaining > 0
                ? `. You have ${remaining} free ${remaining === 1 ? 'tailor' : 'tailors'} left.`
                : '.'}
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Step 1: hero + dropzone ── */}
          {step === 'hero' && (
            <motion.section key="hero" {...stepMotion} aria-label="Upload your resume">
              <div className="mx-auto max-w-2xl text-center">
                <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Upload your resume.{' '}
                  <span className="text-primary">See today's best-matched jobs</span>, free.
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground sm:text-lg">
                  No account needed. We match your resume against live openings on real company
                  career sites, then tailor it for the role you pick. One free tailored resume
                  with a polished PDF and DOCX download included.
                </p>
              </div>

              {hasReturningResume && (
                <div className="mx-auto mt-8 max-w-2xl">
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                      <p className="flex-1 text-sm">
                        Your resume is already on file from a previous visit.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={flow.goToMatches}
                      >
                        See today's matches
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              <GuestDropzone
                onStarted={(file) => void flow.startUpload(file)}
                variant="full"
                className="mx-auto mt-8 max-w-2xl"
              />

              <ul className="mx-auto mt-8 grid max-w-2xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <li className="flex items-center gap-2">
                  <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Only strong matches, no volume padding
                </li>
                <li className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Integrity-checked tailoring, nothing invented
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  Free, no card, no account needed
                </li>
              </ul>
            </motion.section>
          )}

          {/* ── Step 2: parsing progress ── */}
          {step === 'parsing' && (
            <motion.section
              key="parsing"
              {...stepMotion}
              ref={stepSectionRef}
              tabIndex={-1}
              className="outline-none"
              aria-label="Reading your resume"
              aria-live="polite"
            >
              <div className="mx-auto max-w-xl">
                {parseCta ? (
                  <SignupCta title={parseCta.title} body={parseCta.body} />
                ) : parseError ? (
                  <ErrorCard title="We hit a snag reading your resume" body={parseError}>
                    {flow.hasPendingFile && (
                      <Button onClick={flow.retryUpload}>Try again</Button>
                    )}
                    <Button variant="outline" onClick={flow.backToHero}>
                      Choose another file
                    </Button>
                    <Button asChild variant="ghost">
                      <Link to="/register">Create free account</Link>
                    </Button>
                  </ErrorCard>
                ) : (
                  <Card>
                    <CardContent className="space-y-6 p-6 sm:p-8">
                      <WorkingHeader
                        stage={parseStage}
                        hint={
                          parseStatus === 'processing'
                            ? 'Working. Usually under a minute.'
                            : 'Queued. Starting now.'
                        }
                      />
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.section>
          )}

          {/* ── Step 3: top matches (exactly what the server returned) ── */}
          {step === 'matches' && (
            <motion.section
              key="matches"
              {...stepMotion}
              ref={stepSectionRef}
              tabIndex={-1}
              className="outline-none"
              aria-label="Your top job matches"
            >
              <div className="mb-6">
                <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                  {firstName ? `${firstName}, your` : 'Your'} top matches today
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Scored against live openings from company career sites. We only show roles that
                  clear our match bar. Fewer, accurate results beat volume.
                </p>
                <p className="sr-only" role="status">
                  {flow.matchesState === 'ready'
                    ? flow.matches.length > 0
                      ? `${flow.matches.length} strong ${flow.matches.length === 1 ? 'match' : 'matches'} found.`
                      : 'No strong matches today.'
                    : ''}
                </p>
              </div>

              {remaining === 0 && (
                <div className="mb-6">
                  <SignupCta
                    title={
                      flow.tailoredMatchId
                        ? 'Your free tailor is used. Nice work.'
                        : "You've already used your free tailor."
                    }
                    body="Create a free account to save this work and unlock 5 tailors a day. Your resume, matches, and tailored version carry over automatically."
                  />
                </div>
              )}

              <GuestMatchList
                matches={flow.matches}
                state={flow.matchesState}
                error={flow.matchesError}
                cta={flow.matchesCta}
                tailoredMatchId={flow.tailoredMatchId}
                remaining={remaining}
                onTailor={(match) => void flow.startTailor(match)}
                onViewTailored={flow.openTailored}
                onRetry={() => void flow.loadMatches()}
              />
            </motion.section>
          )}

          {/* ── Step 4: tailor flow ── */}
          {step === 'tailor' && (
            <motion.section
              key="tailor"
              {...stepMotion}
              ref={stepSectionRef}
              tabIndex={-1}
              className="outline-none"
              aria-label="Tailoring your resume"
            >
              <GuestTailorPanel
                activeMatch={flow.activeMatch}
                state={flow.tailorState}
                error={flow.tailorError}
                cta={flow.tailorCta}
                tailored={flow.tailored}
                downloading={flow.downloading}
                onDownload={(format) => void flow.downloadTailored(format)}
                onRetry={flow.retryTailor}
                onBack={flow.backToMatches}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile: persistent quota + signup strip (top-bar meter is sm+ only).
          Hidden on the entry hero — there's no work to save yet, and the
          dropzone deserves the full viewport at 360px. */}
      {(step !== 'hero' || tailorsUsed > 0) && (
        <div className="sticky bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] pt-2.5 backdrop-blur sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <TailorQuota used={tailorsUsed} limit={tailorsLimit} className="w-32 shrink-0" />
            <Button asChild className="h-11">
              <Link to="/register">Save my work. Free</Link>
            </Button>
          </div>
        </div>
      )}

      <footer className="border-t border-border/60 py-4">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Aspirely</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
