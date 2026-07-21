import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { LayoutDashboard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GuestDropzone } from '@/components/guest/GuestDropzone';
import { GuestFlowShell } from '@/components/guest/GuestFlowShell';
import { useResumePicker } from '@/components/guest/useResumePicker';
import type { GuestFlow } from '@/hooks/useGuestFlow';
import type { Capability } from '@/lib/capabilities';
import { Container } from './_shared';
import { MacWindow, type WindowStatus } from './workspace/MacWindow';
import { CinematicStage } from './workspace/CinematicStage';
import { CapabilityDock } from './workspace/CapabilityDock';
import { useCinematic } from './workspace/useCinematic';

/**
 * The hero: editorial copy beside the Aspirely Live Workspace — a Mac-inspired
 * application window built from live DOM, never a screenshot.
 *
 * Two lives, one window:
 *  1 Before an upload it runs ONE ~7.5s illustrative sequence using redacted
 *    structure only, then settles and reveals the "Coming next" dock.
 *  2 The instant a real file is chosen the illustration is killed permanently,
 *    the dock is removed, and the window hosts the genuine guest workflow
 *    driven by server phases from useGuestFlow.
 *
 * Upload is ONE click from anywhere: this component renders the page's single
 * `<input type="file">` and hands the same picker to the CTA and the drop
 * zone, so "Find my matches" opens the OS file dialog directly — it never
 * scrolls to, or focuses, a second uploader.
 *
 * This component is presentational; the single `useGuestFlow` controller lives
 * in LandingExperience.
 */

export interface WorkspaceHeroProps {
  flow: GuestFlow;
  guestEnabled: boolean;
  authed: boolean;
  /** A step beyond the idle hero is active — real work owns the window. */
  flowActive: boolean;
  onPreviewCapability: (cap: Capability) => void;
}

/** Map the real flow onto the window's status indicator. Never invented: each
 *  label corresponds to a server-reported phase or an actual UI state. */
function liveStatus(flow: GuestFlow): { status: WindowStatus; label: string } {
  switch (flow.step) {
    case 'parsing':
      if (flow.parseError) return { status: 'attention', label: 'Needs you' };
      return { status: 'working', label: 'Reading résumé' };
    case 'profile':
      return { status: 'done', label: 'Profile ready' };
    case 'matches':
      if (flow.matchesState === 'loading') return { status: 'working', label: 'Searching jobs' };
      if (flow.matchesState === 'error') return { status: 'attention', label: 'Needs you' };
      if (flow.matchesState === 'cta') return { status: 'attention', label: 'Needs you' };
      return { status: 'done', label: 'Matches ready' };
    case 'tailor':
      if (flow.tailorState === 'working') return { status: 'working', label: 'Tailoring' };
      if (flow.tailorState === 'done') return { status: 'done', label: 'Download ready' };
      return { status: 'attention', label: 'Needs you' };
    default:
      return { status: 'ready', label: 'Ready' };
  }
}

/** Status text for the illustrative sequence. */
const BEAT_STATUS: Record<string, { status: WindowStatus; label: string }> = {
  arrive: { status: 'ready', label: 'Ready' },
  scan: { status: 'working', label: 'Reading' },
  profile: { status: 'working', label: 'Building profile' },
  match: { status: 'working', label: 'Ranking matches' },
  tailor: { status: 'working', label: 'Tailoring' },
  settled: { status: 'done', label: 'Preview' },
};

export function WorkspaceHero({
  flow,
  guestEnabled,
  authed,
  flowActive,
  onPreviewCapability,
}: WorkspaceHeroProps) {
  // Scene liveness: on screen AND tab visible. The sequence never burns
  // battery in a background tab or below the fold.
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, { margin: '-15% 0px' });
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const cinematic = useCinematic({
    live: inView && tabVisible,
    takeover: flowActive,
  });

  // The page's ONE résumé input. Every trigger opens this element.
  const picker = useResumePicker({
    onFile: (file) => void flow.startUpload(file),
    disabled: !guestEnabled,
  });

  const { status, label } = flowActive
    ? liveStatus(flow)
    : (BEAT_STATUS[cinematic.beat] ?? BEAT_STATUS.arrive);

  // The dock only ever shows on the settled illustration — the moment real
  // work starts, roadmap content gets out of the user's way.
  const showDock = !flowActive && cinematic.settled;

  const uploadSurface = authed ? (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-card/70 p-4 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <LayoutDashboard className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm font-semibold">You're signed in</p>
      <Button asChild size="sm" className="h-11 w-full rounded-control font-semibold">
        <Link to="/next/today">Open my workspace</Link>
      </Button>
    </div>
  ) : guestEnabled ? (
    <GuestDropzone
      picker={picker}
      variant="compact"
      label="Upload my resume to find matches"
      microcopy="PDF or DOCX · up to 5 MB · no account required"
      privacyNote={null}
    />
  ) : (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/70 p-4">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Start free.</span> Guest
        upload is paused right now. Create a free account to upload your résumé
        and see your matches.
      </p>
      <Button asChild size="sm" className="h-11">
        <Link to="/register">Create free account</Link>
      </Button>
    </div>
  );

  return (
    <section
      id="try"
      ref={sectionRef}
      aria-label="Try Aspirely with your résumé"
      className="relative flex scroll-mt-24 items-center pb-12 pt-24 sm:pt-28 lg:min-h-[100svh] lg:pb-8 lg:pt-20"
    >
      {/* The page's single résumé file input. The accessible name deliberately
          uses unaccented "Resume file:" — it matches the long-standing label
          contract the guest-flow tests assert on, and reads correctly in every
          screen reader. */}
      {guestEnabled && !authed && (
        <input
          {...picker.inputProps}
          aria-hidden={undefined}
          aria-label="Resume file: PDF or DOCX, up to 5 MB"
        />
      )}

      <Container className="relative w-full">
        <AnimatePresence mode="wait" initial={false}>
          {!flowActive ? (
            <motion.div
              key="idle"
              initial={false}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-12 lg:gap-8"
            >
              {/* ── Copy + the real upload action ── */}
              <div className="mx-auto flex w-full max-w-xl flex-col text-center lg:col-span-5 lg:mx-0 lg:text-left">
                <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-5xl xl:text-[3.3rem]">
                  Upload your résumé.{' '}
                  <span className="gradient-text">Discover up to 5 best-fit jobs—free.</span>
                </h1>

                <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                  No account needed. See where you fit, understand why, and tailor
                  your résumé for one role.
                </p>

                <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                  {guestEnabled ? (
                    <Button
                      size="lg"
                      // Opens the real OS file dialog on THIS click. No scroll,
                      // no focus hand-off, no second uploader.
                      onClick={picker.open}
                      className="h-12 w-full rounded-full px-7 text-base font-semibold shadow-panel sm:w-auto"
                    >
                      Find my matches
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full rounded-full px-7 text-base font-semibold shadow-panel sm:w-auto"
                    >
                      <Link to={authed ? '/next/today' : '/register'}>
                        {authed ? 'Open my workspace' : 'Create free account'}
                      </Link>
                    </Button>
                  )}
                </div>

                <p className="mt-4 text-[13px] font-medium text-muted-foreground">
                  Private upload · Real openings · No invented experience
                </p>

                {/* On phones the upload surface sits ABOVE the decorative
                    window; on desktop it rides under the copy column. */}
                <div className="mt-6 lg:mt-7">{uploadSurface}</div>

                {/* Returning guest whose résumé is already on file — straight
                    to today's matches, no re-upload. */}
                {guestEnabled && flow.session?.exists && flow.session.has_resume && (
                  <div className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 lg:justify-between">
                    <p className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Your résumé is already on file.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={flow.goToMatches}
                    >
                      See today's matches
                    </Button>
                  </div>
                )}

                <p className="mt-5 text-xs text-muted-foreground">
                  Guest: up to 5 matches and 1 tailoring · Free account: full
                  workspace and 5 tailorings daily
                </p>

                <p className="mt-4 text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* ── The live workspace window ── */}
              <div className="relative lg:col-span-7">
                <MacWindow
                  status={status}
                  statusLabel={label}
                  animateArrival
                  bodyClassName="min-h-[290px] sm:min-h-[330px]"
                  dock={
                    <CapabilityDock show={showDock} onPreview={onPreviewCapability} />
                  }
                >
                  <CinematicStage beat={cinematic.beat} />
                </MacWindow>
              </div>
            </motion.div>
          ) : (
            /* ── Real work owns the window ── */
            <motion.div
              key="active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <MacWindow status={status} statusLabel={label} bodyClassName="min-h-[60vh]">
                <div className="relative p-4 sm:p-6 lg:p-8">
                  <GuestFlowShell flow={flow} />
                </div>
              </MacWindow>
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
