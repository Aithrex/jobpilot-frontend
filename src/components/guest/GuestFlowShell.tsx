import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignupCta, TailorQuota, stepTransition } from '@/components/guest/_shared';
import { GuestParsingState } from '@/components/guest/GuestParsingState';
import { GuestProfileReveal } from '@/components/guest/GuestProfileReveal';
import { GuestResultsDashboard } from '@/components/guest/GuestResultsDashboard';
import { GuestTailoringState } from '@/components/guest/GuestTailoringState';
import { GuestCompletedState } from '@/components/guest/GuestCompletedState';
import type { GuestFlow, GuestStep } from '@/hooks/useGuestFlow';
import { toTitleCase } from '@/lib/format';

/**
 * The active guest workspace: everything AFTER a file is picked (parsing →
 * matches dashboard → tailor → completed), driven by ONE useGuestFlow
 * controller owned by the host. The idle upload surface is composed by the
 * landing hero itself (AtlasHero seats GuestDropzone inside the atlas).
 *
 * Guest failures are 400/404/429/503 (never 401); the 429 variants render
 * conversion CTAs, never error toasts. Focus moves to each new step's
 * region after a user-initiated transition.
 */
export function GuestFlowShell({ flow }: { flow: GuestFlow }) {
  const reduceMotion = useReducedMotion();
  const {
    step,
    session,
    guestName,
    tailorsUsed,
    tailorsLimit,
    remaining,
  } = flow;

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const stepSectionRef = useRef<HTMLElement | null>(null);
  const prevStepRef = useRef<GuestStep>(step);

  const stepMotion = reduceMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: stepTransition,
      };

  // Focus management: after a step change, move focus to the new region (its
  // aria-label announces where we landed). Waits out the exit+enter pair.
  useEffect(() => {
    if (prevStepRef.current === step) return;
    prevStepRef.current = step;
    if (step === 'hero') return;
    const t = window.setTimeout(() => stepSectionRef.current?.focus(), 340);
    return () => window.clearTimeout(t);
  }, [step]);

  const recognized = !!session?.recognized;
  // recognized_name arrives identity-normalized (lowercased); restore display casing.
  const recognizedName = toTitleCase(session?.recognized_name || '');
  const firstName = guestName?.split(' ')[0];

  return (
    <div>
      {/* Welcome-back recognition (soft — guests may continue below). */}
      {recognized && step === 'matches' && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stepTransition}
          className="mb-6 space-y-1.5"
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
        {step === 'parsing' && (
          <motion.section
            key="parsing"
            {...stepMotion}
            ref={stepSectionRef}
            tabIndex={-1}
            className="outline-none"
            aria-label="Reading your resume"
          >
            <GuestParsingState
              fileName={flow.pendingFileName}
              parseStatus={flow.parseStatus}
              progress={flow.parseProgress}
              error={flow.parseError}
              cta={flow.parseCta}
              canRetry={flow.hasPendingFile}
              onRetry={flow.retryUpload}
              onChooseAnother={flow.backToHero}
            />
          </motion.section>
        )}

        {step === 'profile' && flow.profile && (
          <motion.section
            key="profile"
            {...stepMotion}
            ref={stepSectionRef}
            tabIndex={-1}
            className="outline-none"
            aria-label="What we understood from your resume"
          >
            <GuestProfileReveal
              profile={flow.profile}
              fileName={flow.pendingFileName}
              onContinue={flow.continueToMatches}
            />
          </motion.section>
        )}

        {step === 'matches' && (
          <motion.section
            key="matches"
            {...stepMotion}
            ref={stepSectionRef}
            tabIndex={-1}
            className="outline-none"
            aria-label="Your top job matches"
          >
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
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
              <TailorQuota used={tailorsUsed} limit={tailorsLimit} />
            </div>

            {remaining === 0 && (
              <div className="mb-6">
                <SignupCta
                  title={
                    flow.tailoredMatchId
                      ? 'You have used your guest tailoring. Nice work.'
                      : 'You have already used your guest tailoring.'
                  }
                  body="Create a free account to save your work, see the full job workspace, and tailor up to 5 resumes per day."
                />
              </div>
            )}

            <GuestResultsDashboard
              matches={flow.matches}
              state={flow.matchesState}
              progress={flow.matchesProgress}
              meta={flow.matchesMeta}
              error={flow.matchesError}
              cta={flow.matchesCta}
              tailoredMatchId={flow.tailoredMatchId}
              remaining={remaining}
              selectedMatchId={selectedMatchId}
              onSelect={(id) => setSelectedMatchId(id || null)}
              onTailor={(match) => void flow.startTailor(match)}
              onViewTailored={flow.openTailored}
              onRetry={() => void flow.loadMatches()}
              onSeniorityChange={(level) => void flow.changeSeniority(level)}
              seniorityPending={flow.seniorityPending}
            />
          </motion.section>
        )}

        {step === 'tailor' && (
          <motion.section
            key="tailor"
            {...stepMotion}
            ref={stepSectionRef}
            tabIndex={-1}
            className="outline-none"
            aria-label="Tailoring your resume"
          >
            {flow.tailorState === 'done' && flow.tailored ? (
              <GuestCompletedState
                activeMatch={flow.activeMatch}
                tailored={flow.tailored}
                parsedResume={flow.parsedResume}
                downloading={flow.downloading}
                onDownload={(format) => void flow.downloadTailored(format)}
                onBack={flow.backToMatches}
              />
            ) : (
              <GuestTailoringState
                activeMatch={flow.activeMatch}
                working={flow.tailorState === 'working'}
                error={flow.tailorState === 'error' ? flow.tailorError : null}
                cta={flow.tailorState === 'cta' ? flow.tailorCta : null}
                onRetry={flow.retryTailor}
                onBack={flow.backToMatches}
              />
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
