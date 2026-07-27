import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { LayoutDashboard, Sparkles, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GuestDropzone } from '@/components/guest/GuestDropzone';
import { GuestFlowShell } from '@/components/guest/GuestFlowShell';
import type { ResumePicker } from '@/components/guest/useResumePicker';
import type { GuestFlow } from '@/hooks/useGuestFlow';
import { Container } from './_shared';
import { MacWindow, type WindowStatus } from './workspace/MacWindow';
import { CinematicStage } from './workspace/CinematicStage';
import { CapabilityDock } from './workspace/CapabilityDock';
import { useCinematic } from './workspace/useCinematic';

/**
 * The hero: editorial copy beside the Aspirely Live Workspace, a Mac-inspired
 * application window built from live DOM, never a screenshot.
 *
 * The window IS the uploader. In the idle state its body hosts the real drop
 * surface with the illustrative stage above it, and the whole body is a
 * drag-and-drop target - the product window and the thing you drop a resume
 * on are one object, not two unrelated ones. The instant a real file is chosen
 * the illustration is killed permanently, the dock is removed, and the window
 * hosts the genuine guest workflow driven by server phases from useGuestFlow.
 *
 * Upload is ONE click from anywhere on the page. This component does not own
 * the file input: LandingExperience renders the page's single
 * `<input type="file">` and hands the SAME picker to the hero CTA, the nav
 * CTA, this drop surface and the closing CTA.
 *
 * This component is presentational; the single `useGuestFlow` controller lives
 * in LandingExperience.
 */

export interface WorkspaceHeroProps {
  flow: GuestFlow;
  guestEnabled: boolean;
  authed: boolean;
  /** A step beyond the idle hero is active - real work owns the window. */
  flowActive: boolean;
  /** The page's ONE resume picker (owned by LandingExperience). */
  picker: ResumePicker;
}

/** Map the real flow onto the window's status indicator. Never invented: each
 *  label corresponds to a server-reported phase or an actual UI state. */
function liveStatus(flow: GuestFlow): { status: WindowStatus; label: string } {
  switch (flow.step) {
    case 'parsing':
      if (flow.parseError) return { status: 'attention', label: 'Needs you' };
      return { status: 'working', label: 'Reading resume' };
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

/** Status text for the illustrative tour - one entry per scene, so the window
 *  chrome narrates whatever the stage is currently showing. */
const BEAT_STATUS: Record<string, { status: WindowStatus; label: string }> = {
  read: { status: 'working', label: 'Reading' },
  match: { status: 'working', label: 'Ranking matches' },
  tailor: { status: 'working', label: 'Tailoring' },
  track: { status: 'working', label: 'Tracking' },
};

export function WorkspaceHero({
  flow,
  guestEnabled,
  authed,
  flowActive,
  picker,
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

  // Drag state for the WHOLE window body, not just the inner control.
  const [dragActive, setDragActive] = useState(false);
  const droppable = guestEnabled && !authed;

  const { status, label } = flowActive
    ? liveStatus(flow)
    : (BEAT_STATUS[cinematic.beat] ?? BEAT_STATUS.read);

  // The dock is part of the window, not a reward for waiting. It used to hold
  // back until the tour had shown every scene, which on a loop meant it simply
  // did not exist for the first eleven seconds and then appeared - growing the
  // window by its own height, mid-read - unless you happened to click a tab
  // first. It shows whenever the window is illustrating; the moment real work
  // starts, roadmap content gets out of the user's way.
  const showDock = !flowActive;

  const uploadSurface = authed ? (
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <LayoutDashboard className="h-6 w-6" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-sm font-semibold">You're signed in</p>
      <Button asChild size="sm" className="h-11 w-full rounded-control font-semibold sm:w-auto">
        <Link to="/app/home">Open my workspace</Link>
      </Button>
    </div>
  ) : guestEnabled ? (
    // The label states the ACTION and what it buys, in the second person.
    // Two earlier tries missed in opposite directions: "Upload my resume to
    // find matches" put the visitor's own words on the thing being spoken to,
    // and "Drop your resume here, or browse" spent every word restating the
    // affordance - "here" is what the dashed box already says, and "browse" is
    // what clicking obviously does. Neither told anyone why to bother.
    <GuestDropzone
      picker={picker}
      variant="compact"
      label="Drop your resume to see your matches"
      microcopy="PDF or DOCX · up to 5 MB · no account required"
      privacyNote={null}
    />
  ) : (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Start free.</span> Guest upload is paused
        right now. Create a free account to upload your resume and see your matches.
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
      aria-label="Try Aspirely with your resume"
      className="relative flex scroll-mt-4 items-center pb-12 pt-24 sm:pt-28 lg:min-h-[100svh] lg:pb-8 lg:pt-20"
    >
      <Container className="relative w-full">
        <AnimatePresence mode="wait" initial={false}>
          {!flowActive ? (
            <motion.div
              key="idle"
              initial={false}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-12 lg:gap-8"
            >
              {/* Copy + the primary action */}
              <div className="mx-auto flex w-full max-w-xl flex-col text-center lg:col-span-5 lg:mx-0 lg:text-left">
                <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-5xl xl:text-[3.3rem]">
                  Upload your resume.{' '}
                  <span className="gradient-text">Discover up to 5 best-fit jobs, free.</span>
                </h1>

                <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                  No account needed. See where you fit, understand why, and tailor your resume for
                  one role.
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
                      <Link to={authed ? '/app/home' : '/register'}>
                        {authed ? 'Open my workspace' : 'Create free account'}
                      </Link>
                    </Button>
                  )}
                </div>

                <p className="mt-4 text-[13px] font-medium text-muted-foreground">
                  Private upload · Real openings · No invented experience
                </p>

                {/* Returning guest whose resume is already on file - straight
                    to today's matches, no re-upload. */}
                {guestEnabled && flow.session?.exists && flow.session.has_resume && (
                  <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 lg:justify-between">
                    <p className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Your resume is already on file.
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

                <p className="mt-5 text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* The live workspace window - illustration ABOVE, real upload
                  surface INSIDE, whole body droppable.

                  It carries NO surface of its own. It was briefly pinned to
                  obsidian on the theory that a picture of the product should
                  stay dark like a code block, but a light-theme visitor then
                  got a black slab as the largest object on their page - the
                  exact inconsistency the theme control exists to remove. The
                  window is built from semantic tokens throughout, so it simply
                  renders in whichever theme the page is in. */}
              <div className="relative lg:col-span-7">
                <MacWindow
                  status={status}
                  statusLabel={label}
                  animateArrival
                  bodyClassName="min-h-[290px] sm:min-h-[330px]"
                  dock={<CapabilityDock show={showDock} />}
                >
                  <div
                    className={cn(
                      'relative flex h-full flex-col transition-colors',
                      dragActive && 'bg-primary/5',
                    )}
                    onDragOver={
                      droppable
                        ? (e) => {
                            e.preventDefault();
                            setDragActive(true);
                          }
                        : undefined
                    }
                    onDragLeave={droppable ? () => setDragActive(false) : undefined}
                    onDrop={
                      droppable
                        ? (e) => {
                            e.preventDefault();
                            setDragActive(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) picker.acceptFile(f);
                          }
                        : undefined
                    }
                  >
                    <CinematicStage
                      beat={cinematic.beat}
                      onSelectBeat={cinematic.select}
                      autoplay={cinematic.autoplay}
                      holdMs={cinematic.holdMs}
                      onHold={cinematic.hold}
                      className="flex-1"
                    />

                    {/* The real thing, seated in the product window. */}
                    <div className="relative z-10 border-t border-border bg-foreground/[0.03] p-3 sm:p-4">
                      {uploadSurface}
                    </div>

                    {dragActive && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-[10px] border-2 border-dashed border-primary bg-background/85"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <UploadCloud className="h-5 w-5 text-primary" aria-hidden />
                          Drop your resume to start
                        </span>
                      </div>
                    )}
                  </div>
                </MacWindow>
              </div>
            </motion.div>
          ) : (
            /* Real work owns the window */
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
