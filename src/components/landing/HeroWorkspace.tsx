import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LayoutDashboard, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GuestProgressRail } from '@/components/guest/GuestProgressRail';
import { GuestFlowShell } from '@/components/guest/GuestFlowShell';
import { GuestUploadState } from '@/components/guest/GuestUploadState';
import { TailorQuota } from '@/components/guest/_shared';
import type { GuestFlow } from '@/hooks/useGuestFlow';
import { AmbientGlow, Container, Grain, Reveal, EASE } from './_shared';
import { DemoWorkspace } from './demo/DemoWorkspace';
import { SkillTokenFlow } from './demo/SkillTokenFlow';

/**
 * Hero + live guest workspace: the real product IS the hero. Idle, the right
 * window pairs the REAL upload control (always visible, first viewport) with
 * an interactive fictional preview (DemoWorkspace) the visitor can play with
 * before uploading anything. The moment a file is picked the same window
 * morphs into the full parsing → matches → tailor workspace, full-width,
 * while the marketing sections below collapse (LandingExperience hides them
 * via `flowActive`).
 *
 * Feature-unavailable contract: when guest onboarding is off (build flag or
 * backend 404/503), ONLY the upload control is replaced by a concise
 * free-account CTA — the interactive preview stays fully usable, so the
 * window never collapses into an empty account-first card.
 *
 * One useGuestFlow controller, owned by LandingExperience — this component
 * is presentational. The h1 is the page's single h1 and its LCP element.
 */
export interface HeroWorkspaceProps {
  flow: GuestFlow;
  /** Guest flow is live (unauthenticated + feature flag on). */
  guestEnabled: boolean;
  authed: boolean;
  /** A step beyond the idle hero is active — the workspace owns the page. */
  flowActive: boolean;
}

/** Entitlement chips (locked copy, landing-v8 brief) — the same numbers the
 * gates enforce; never the word "unlimited" anywhere on this page. */
const ENTITLEMENT_CHIPS = [
  {
    Icon: ShieldCheck,
    text: 'No account: up to 5 matched jobs + 1 tailored resume',
  },
  {
    Icon: UserRound,
    text: 'Free account: full job workspace + saved progress + 5 tailorings per UTC day',
  },
] as const;

function WindowChrome({
  step,
  showQuota,
  used,
  limit,
}: {
  step: GuestFlow['step'];
  showQuota: boolean;
  used: number;
  limit: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
      <span className="text-xs font-semibold text-muted-foreground">
        Aspirely · guest workspace
      </span>
      <div className="flex items-center gap-3">
        {showQuota && <TailorQuota used={used} limit={limit} className="hidden sm:block" />}
        <GuestProgressRail step={step} />
      </div>
    </div>
  );
}

export function HeroWorkspace({ flow, guestEnabled, authed, flowActive }: HeroWorkspaceProps) {
  const reduceMotion = useReducedMotion();
  const layoutId = reduceMotion ? undefined : 'guest-workspace-window';

  // "Use my resume" in the demo returns focus to the REAL upload control (or
  // the account CTA that replaces it when guest onboarding is unavailable)
  // with a brief emphasis pulse so the hand-back is visible.
  const dropButtonRef = useRef<HTMLButtonElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const pulseTimer = useRef<number | undefined>(undefined);
  const [uploadPulse, setUploadPulse] = useState(false);
  const handleUseResume = useCallback(() => {
    const target = guestEnabled ? dropButtonRef.current : ctaRef.current;
    target?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
    setUploadPulse(true);
    window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setUploadPulse(false), 1600);
  }, [guestEnabled, reduceMotion]);

  return (
    <section
      id="try"
      aria-label="Try Aspirely with your resume"
      className="relative scroll-mt-24 pb-14 pt-24 sm:pb-16 sm:pt-32"
    >
      <AmbientGlow />
      <Container className="relative">
        <AnimatePresence mode="wait" initial={false}>
          {!flowActive ? (
            <motion.div
              key="idle"
              initial={false}
              exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
              className="grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12"
            >
              {/* ── Copy column (locked hero copy, landing-v8 brief) ── */}
              <div className="mx-auto flex w-full max-w-xl flex-col text-center lg:sticky lg:top-28 lg:mx-0 lg:text-left">
                <Reveal immediate>
                  <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-5xl">
                    Get 5 best-fit jobs from your resume.{' '}
                    <span className="text-primary">Free.</span>
                  </h1>
                </Reveal>

                <Reveal immediate delay={0.05}>
                  <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                    Upload your resume with no account required. See the strongest real
                    openings, understand why they fit, and tailor your resume for one.
                  </p>
                </Reveal>

                <Reveal immediate delay={0.1}>
                  <ul className="mx-auto mt-7 flex max-w-xl flex-col items-center gap-2.5 lg:mx-0 lg:items-start">
                    {ENTITLEMENT_CHIPS.map(({ Icon, text }) => (
                      <li
                        key={text}
                        className="inline-flex items-start gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-left text-[13px] font-medium text-muted-foreground"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {text}
                      </li>
                    ))}
                  </ul>
                </Reveal>

                <Reveal immediate delay={0.15}>
                  <p className="mt-6 text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Sign in
                    </Link>
                  </p>
                </Reveal>
              </div>

              {/* ── The live workspace window (idle = real upload + playground) ── */}
              <Reveal immediate delay={0.12}>
                <motion.div
                  layoutId={layoutId}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="relative flex min-h-[480px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-float"
                >
                  <WindowChrome
                    step="hero"
                    showQuota={guestEnabled && flow.tailorsUsed > 0}
                    used={flow.tailorsUsed}
                    limit={flow.tailorsLimit}
                  />
                  <div className="relative flex min-h-0 flex-1 flex-col p-4 sm:p-5">
                    {authed ? (
                      <div className="m-auto max-w-sm space-y-4 text-center">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <LayoutDashboard className="h-7 w-7" aria-hidden />
                        </span>
                        <p className="text-lg font-semibold">You're signed in</p>
                        <p className="text-sm text-muted-foreground">
                          Your resume, matches, and tailoring tools are waiting in your
                          workspace.
                        </p>
                        <Button asChild size="lg" className="h-12 w-full rounded-control text-base font-semibold">
                          <Link to="/next/today">Open my workspace</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {guestEnabled ? (
                          <GuestUploadState
                            onFile={(file) => void flow.startUpload(file)}
                            hasReturningResume={!!(flow.session?.exists && flow.session.has_resume)}
                            onSeeMatches={flow.goToMatches}
                            dropButtonRef={dropButtonRef}
                            highlighted={uploadPulse}
                          />
                        ) : (
                          /* Feature unavailable: replace ONLY the upload action
                             with a concise account CTA — the playground below
                             stays fully usable. */
                          <div
                            className={cn(
                              'flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 transition-shadow duration-300 sm:flex-row sm:items-center',
                              uploadPulse && 'shadow-[0_0_0_3px_hsl(var(--ring)/0.35)]',
                            )}
                          >
                            <p className="flex-1 text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">Start free.</span>{' '}
                              Guest upload is paused right now. Create a free account to upload
                              your resume, see your matches, and tailor for the role you pick.
                              No card needed.
                            </p>
                            <Button asChild className="h-11 shrink-0">
                              <Link to="/register" ref={ctaRef}>
                                Create free account
                              </Link>
                            </Button>
                          </div>
                        )}

                        {/* Idle micro-motion: tokens drift from the resume
                            glyph into empty job-card slots (decorative). */}
                        <SkillTokenFlow />

                        <DemoWorkspace onUseResume={handleUseResume} />

                        {guestEnabled && (
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Free and private. A small first-party device token in your browser
                            keeps the free trial fair. See our{' '}
                            <a
                              href="/privacy"
                              className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Privacy Policy
                            </a>
                            .
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <Grain />
                </motion.div>
              </Reveal>
            </motion.div>
          ) : (
            /* ── Expanded: the workspace owns the page ── */
            <motion.div
              key="active"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <motion.div
                layoutId={layoutId}
                transition={{ duration: 0.45, ease: EASE }}
                className="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-float"
              >
                <WindowChrome
                  step={flow.step}
                  showQuota
                  used={flow.tailorsUsed}
                  limit={flow.tailorsLimit}
                />
                <div className="relative min-h-[60vh] p-4 sm:p-6 lg:p-8">
                  <GuestFlowShell flow={flow} />
                </div>
              </motion.div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Guest preview. Create a{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  free account
                </Link>{' '}
                any time to save your work.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>
    </section>
  );
}
