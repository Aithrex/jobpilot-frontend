import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { LayoutDashboard, Pause, Play, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GuestDropzone } from '@/components/guest/GuestDropzone';
import { useResumePicker } from '@/components/guest/useResumePicker';
import { GuestFlowShell } from '@/components/guest/GuestFlowShell';
import { GuestProgressRail } from '@/components/guest/GuestProgressRail';
import { TailorQuota } from '@/components/guest/_shared';
import type { GuestFlow } from '@/hooks/useGuestFlow';
import { Container, EASE } from './_shared';
import { ATLAS_STAGES, SignalAtlas, useAtlasStages } from './SignalAtlas';

/**
 * The hero: editorial copy beside the living Career Signal Atlas, with the
 * REAL upload control seated inside the atlas' resume sheet. The moment a
 * file is picked the atlas morphs into the real guest workspace (parse →
 * profile → up to 5 matches → one tailor), full-width, while the host hides
 * the marketing sections below.
 *
 * One `useGuestFlow` controller, owned by LandingExperience — this component
 * is presentational. The h1 is the page's single h1 and its LCP element.
 * Scene loops pause off-screen, when the tab hides, on the pause control,
 * and under reduced motion (static resolved compositions remain).
 */
export interface AtlasHeroProps {
  flow: GuestFlow;
  /** Guest flow is live (unauthenticated + feature flag on). */
  guestEnabled: boolean;
  authed: boolean;
  /** A step beyond the idle hero is active — the workspace owns the page. */
  flowActive: boolean;
}

function WindowChrome({
  step,
  used,
  limit,
}: {
  step: GuestFlow['step'];
  used: number;
  limit: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
      <span className="text-xs font-semibold text-muted-foreground">
        Aspirely · guest workspace
      </span>
      <div className="flex items-center gap-3">
        <TailorQuota used={used} limit={limit} className="hidden sm:block" />
        <GuestProgressRail step={step} />
      </div>
    </div>
  );
}

/** 44px round icon control for the atlas transport (replay / play-pause). */
const TRANSPORT_BTN =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function AtlasHero({ flow, guestEnabled, authed, flowActive }: AtlasHeroProps) {
  const reduceMotion = useReducedMotion();
  const layoutId = reduceMotion ? undefined : 'guest-workspace-window';

  // Scene liveness: on screen AND tab visible — loops stop otherwise.
  const sectionRef = useRef<HTMLElement | null>(null);
  const inView = useInView(sectionRef, { margin: '-15% 0px' });
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const sceneLive = inView && tabVisible;

  const { stage, select, replay, playing, togglePlaying, reduce } = useAtlasStages(sceneLive);

  // Drag-enter excitement: the whole opportunity field leans toward the file.
  const dragDepth = useRef(0);
  const [excited, setExcited] = useState(false);
  const dragHandlers = {
    onDragEnter: () => {
      dragDepth.current += 1;
      setExcited(true);
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setExcited(false);
    },
    onDrop: () => {
      dragDepth.current = 0;
      setExcited(false);
    },
  };

  // ONE shared resume picker for the whole hero: the dropzone, the "Find my
  // matches" CTA, and keyboard activation all open the SAME hidden input in
  // a single click (a CTA that merely scrolls to a second uploader is a
  // two-click upload — treated as a bug).
  const picker = useResumePicker({ onFile: (file) => void flow.startUpload(file) });
  const dropButtonRef = useRef<HTMLButtonElement | null>(null);
  const pulseTimer = useRef<number | undefined>(undefined);
  const [uploadPulse, setUploadPulse] = useState(false);
  const focusUpload = useCallback(() => {
    // Open the real file dialog immediately (single click), and pulse the
    // in-scene dropzone so the connection is visible when the dialog closes.
    picker.open();
    dropButtonRef.current?.focus({ preventScroll: true });
    setUploadPulse(true);
    window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setUploadPulse(false), 1600);
  }, [picker]);

  const caption = ATLAS_STAGES.find((s) => s.key === stage)?.caption ?? '';

  const sheetSlot = authed ? (
    <div className="flex h-full flex-col justify-center gap-3 rounded-2xl border border-primary/30 bg-card/70 p-4 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <LayoutDashboard className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm font-semibold">You're signed in</p>
      <Button asChild size="sm" className="h-11 w-full rounded-control font-semibold">
        <Link to="/next/today">Open my workspace</Link>
      </Button>
    </div>
  ) : guestEnabled ? (
    <div className="h-full" {...dragHandlers}>
      <GuestDropzone
        variant="panel"
        label="Upload my resume to find matches"
        microcopy="PDF or DOCX · Up to 5 MB · No account required"
        privacyNote={null}
        picker={picker}
        buttonRef={dropButtonRef}
        className={cn(
          'h-full rounded-2xl bg-card/70 backdrop-blur-[2px] transition-shadow duration-300',
          uploadPulse && 'shadow-[0_0_0_3px_hsl(var(--ring)/0.45)]',
        )}
      />
      {/* The page's ONE hidden file input — every trigger opens this. */}
      <input
        {...picker.inputProps}
        aria-hidden={undefined}
        aria-label="Resume file: PDF or DOCX · Up to 5 MB · No account required"
      />
    </div>
  ) : (
    /* Feature unavailable: ONLY the upload action becomes an account CTA —
       the atlas and its stage controls stay fully interactive. */
    <div
      className={cn(
        'flex h-full flex-col justify-center gap-3 rounded-2xl border border-border bg-card/70 p-4 transition-shadow duration-300',
        uploadPulse && 'shadow-[0_0_0_3px_hsl(var(--ring)/0.35)]',
      )}
    >
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Start free.</span> Guest
        upload is paused right now. Create a free account to upload your resume
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
      aria-label="Try Aspirely with your resume"
      className="relative flex scroll-mt-24 items-center pb-10 pt-24 sm:pt-28 lg:min-h-[100svh] lg:pb-6 lg:pt-20"
    >
      <Container className="relative w-full">
        <AnimatePresence mode="wait" initial={false}>
          {!flowActive ? (
            <motion.div
              key="idle"
              initial={false}
              exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.2 } }}
              className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-12 lg:gap-6"
            >
              {/* ── Copy column ── */}
              <div className="mx-auto flex w-full max-w-xl flex-col text-center lg:col-span-5 lg:mx-0 lg:text-left">
                <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-5xl xl:text-[3.4rem]">
                  Upload your resume.{' '}
                  <span className="gradient-text">Find up to 5 best-fit jobs, free.</span>
                </h1>

                <p className="mx-auto mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                  No account needed. See live matches, then tailor your resume for
                  the role you want.
                </p>

                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                  {guestEnabled ? (
                    <Button
                      size="lg"
                      className="h-12 w-full rounded-full px-7 text-base font-semibold shadow-panel sm:w-auto"
                      onClick={focusUpload}
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
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 w-full rounded-full bg-card/40 px-6 text-base sm:w-auto"
                    onClick={replay}
                  >
                    Watch it work
                  </Button>
                </div>

                <p className="mt-5 text-[13px] font-medium text-muted-foreground">
                  Guest: 5 matches + 1 tailoring · Free account: full workspace + 5
                  tailorings per day
                </p>

                {guestEnabled && flow.session?.exists && flow.session.has_resume && (
                  <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 lg:justify-between">
                    <p className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Your resume is already on file.
                    </p>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={flow.goToMatches}>
                      See today's matches
                    </Button>
                  </div>
                )}

                <p className="mt-6 text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Sign in
                  </Link>
                </p>
              </div>

              {/* ── The atlas ── */}
              <motion.div
                layoutId={layoutId}
                transition={{ duration: 0.45, ease: EASE }}
                className="relative lg:col-span-7"
              >
                <SignalAtlas
                  stage={stage}
                  active={sceneLive && playing}
                  reduce={!!reduce}
                  excited={excited}
                  sheetSlot={sheetSlot}
                />

                {/* Stage transport: Read / Match / Tailor + replay + pause. */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <div
                    role="group"
                    aria-label="Signal stages"
                    className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1"
                  >
                    {ATLAS_STAGES.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={stage === key}
                        onClick={() => select(key)}
                        className={cn(
                          'min-h-[44px] rounded-full px-4 text-sm font-semibold transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          stage === key
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={replay} aria-label="Replay the sequence" className={TRANSPORT_BTN}>
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlaying}
                    aria-pressed={!playing}
                    aria-label={playing ? 'Pause the animation' : 'Play the animation'}
                    className={TRANSPORT_BTN}
                  >
                    {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
                <p aria-live="polite" className="mt-2 text-center text-sm text-muted-foreground">
                  {caption}
                </p>
                {guestEnabled && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Free and private. A small first-party device token keeps the
                    trial fair.{' '}
                    <Link
                      to="/privacy"
                      className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Privacy Policy
                    </Link>
                  </p>
                )}
              </motion.div>
            </motion.div>
          ) : (
            /* ── Expanded: the real workspace owns the page ── */
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
                <WindowChrome step={flow.step} used={flow.tailorsUsed} limit={flow.tailorsLimit} />
                <div className="relative min-h-[60vh] p-4 sm:p-6 lg:p-8">
                  <GuestFlowShell flow={flow} />
                </div>
              </motion.div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Guest preview. Create a{' '}
                <Link to="/register" className="font-medium text-primary underline-offset-2 hover:underline">
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
