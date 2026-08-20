import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FileCheck2, LayoutDashboard, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GuestDropzone } from '@/components/guest/GuestDropzone';
/**
 * LAZY ON PURPOSE. `GuestFlowShell` pulls in the whole guest workflow -
 * parsing, profile reveal, the 600-line results dashboard, job detail, fit
 * breakdown, tailoring, completion and the challenge dialog - roughly 3,000
 * lines that only ever mount once a visitor actually picks a file. Statically
 * imported, all of it shipped in the eager landing chunk to every visitor who
 * never uploaded anything, which is the single largest avoidable cost on the
 * LCP route. `flowActive` is already an async, spinner-friendly boundary.
 */
const GuestFlowShell = lazy(() =>
  import('@/components/guest/GuestFlowShell').then((m) => ({ default: m.GuestFlowShell })),
);
import type { ResumePicker } from '@/components/guest/useResumePicker';
import type { GuestFlow } from '@/hooks/useGuestFlow';
import { Container } from './_shared';
import { MacWindow, type WindowStatus } from './workspace/MacWindow';

/**
 * The hero: the promise and the two actions on the page canvas.
 *
 * The right-column Mac window is reserved for the real guest flow once an
 * upload starts. Its status pill is driven only by `liveStatus(flow)`.
 *
 * Upload is ONE click. This component does not own the file input:
 * LandingExperience renders the page's single `<input type="file">` and hands
 * the SAME picker to the hero CTA, the drop surface, and the closing CTA.
 * `GuestDropzone` must always be handed that picker - without it the component
 * mounts a second file input of its own.
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

export function WorkspaceHero({
  flow,
  guestEnabled,
  authed,
  flowActive,
  picker,
}: WorkspaceHeroProps) {
  // Drag state for the whole video column, which is where a dragged file now
  // lands. It used to be the mock window's body.
  const [dragActive, setDragActive] = useState(false);
  const droppable = guestEnabled && !authed;

  // The window frames REAL work only, so its status is always the flow's.
  // There used to be a second, invented status ladder driving the illustrative
  // tour ("Reading", "Ranking matches") - a status pill narrating something
  // that was not happening.
  const { status, label } = liveStatus(flow);

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
      aria-label="Try Aspirely with your resume"
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
      // The hero is exactly as tall as its content, plus clearance for the
      // fixed nav at the top and the standard section band at the bottom.
      //
      // It used to be `lg:min-h-[92svh]` with `items-center`, which is where
      // the dead band under "Sign in" actually came from: the copy column is
      // around 560px, the reserved box was ~830px, and centring 560 inside 830
      // parks ~135px of nothing at the bottom - then the hero's own `pb-16`
      // and the next section's `pt-28` stacked on top of that. A viewport
      // fraction is a guess about content height, and it is wrong on every
      // window it was not measured in; the content is the honest source.
      className="relative flex scroll-mt-4 items-center overflow-hidden pb-16 pt-24 sm:pb-20 sm:pt-28 lg:pb-24 lg:pt-28"
    >
      {dragActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 z-20 grid place-items-center rounded-container border-2 border-dashed border-primary bg-background/85"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UploadCloud className="h-5 w-5 text-primary" aria-hidden />
            Drop your resume to start
          </span>
        </div>
      )}
      <Container className="relative z-10 w-full">
        <AnimatePresence mode="wait" initial={false}>
          {!flowActive ? (
            <motion.div
              key="idle"
              initial={false}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="grid grid-cols-[minmax(0,1fr)] items-center"
            >
              {/* THE COPY COLUMN.
                  Six of twelve rather than five: the headline is the page's
                  single most important object and it was breaking into four
                  lines inside a five-column well while the page had space
                  going spare. */}
              <div className="mx-auto flex w-full max-w-2xl flex-col text-center lg:mx-0 lg:max-w-3xl lg:text-left">
                <h1 className="text-balance font-display text-[2.15rem] font-extrabold leading-[1.07] tracking-[-0.03em] text-foreground sm:text-[2.9rem] xl:text-[3.2rem]">
                  Run your job search with{' '}
                  <span className="gradient-text">clarity, consistency, and control.</span>
                </h1>

                <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0">
                  Aspirely finds relevant opportunities, prepares stronger applications, and keeps
                  every next step organized.
                </p>

                {/* THE TWO ACTIONS, side by side.
                    The primary used to be the file picker, which made this a
                    single-purpose upload tool: a visitor not ready to hand over
                    a resume in the first ten seconds had nothing to do. It then
                    briefly paired account creation with "See how it works",
                    which spent the second-most valuable control on a scroll.
                    Both actions now start something real - one creates the
                    account, one runs the guest match flow - and they share a
                    row, a height and a shape so the choice reads as a choice
                    rather than as a button and an afterthought. */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="h-[3.25rem] w-full rounded-full px-8 text-base font-semibold shadow-panel sm:w-auto"
                  >
                    <Link to={authed ? '/app/home' : '/register'}>
                      {authed ? 'Open my workspace' : 'Create free account'}
                    </Link>
                  </Button>

                  {guestEnabled ? (
                    <button
                      type="button"
                      // Opens the real OS file dialog on THIS click, through the
                      // page's ONE shared picker. No scroll, no focus hand-off,
                      // no second uploader.
                      onClick={picker.open}
                      // Glass, not a second solid button: the pair reads as one
                      // primary and one alternative rather than as two equal
                      // commands. `--glass-alpha` is nudged on hover, which is
                      // the whole hover state - the pane clouds slightly. See
                      // `.glass-pane` in index.css for the fallback.
                      className="focus-ring-visible glass-pane inline-flex h-[3.25rem] w-full items-center justify-center rounded-full px-8 text-base font-semibold text-foreground hover:[--glass-alpha:0.92] sm:w-auto"
                    >
                      Find my matches
                    </button>
                  ) : (
                    <Link
                      to="/register"
                      className="focus-ring-visible glass-pane inline-flex h-[3.25rem] w-full items-center justify-center rounded-full px-8 text-base font-semibold text-foreground hover:[--glass-alpha:0.92] sm:w-auto"
                    >
                      Find my matches
                    </Link>
                  )}
                </div>

                {/* ONE trust line. There were three stacked reassurance
                    statements here, which is how a hero stops being read at
                    all - each one made the next one cheaper. */}
                <p className="mt-4 text-[13.5px] font-medium text-muted-foreground">
                  Free to start. Nothing is submitted without your approval.
                </p>

                {/* Returning guest whose resume is already on file - straight
                    to today's matches, no re-upload. */}
                {guestEnabled && flow.session?.exists && flow.session.has_resume && (
                  <div className="mt-7 flex items-center justify-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 lg:justify-between">
                    <p className="flex items-center gap-2 text-sm">
                      <FileCheck2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      Your resume is already on file.
                    </p>
                    <Button size="sm" variant="outline" className="shrink-0" onClick={flow.goToMatches}>
                      See today's matches
                    </Button>
                  </div>
                )}

                {/* The drag-and-drop path, kept because a dragged file has to
                    land somewhere. Same picker as the CTA above, so this is one
                    mechanism presented twice, not two uploaders. */}
                {/* The trust line, this drop surface and the sign-in line are
                    ONE supporting cluster under the two actions, so they sit
                    at a tighter interval than the interval that separates the
                    cluster from the actions above it. They were spaced 5/8/7,
                    which made three unrelated statements out of one group. */}
                <div className="mt-6 max-w-md lg:mx-0">{uploadSurface}</div>

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
                  {/* The chunk lands while the upload request is already in
                      flight, so this fallback is almost never seen; it states
                      the real phase rather than showing a bare spinner. */}
                  <Suspense
                    fallback={
                      <p className="py-16 text-center text-sm text-muted-foreground">
                        Reading your resume...
                      </p>
                    }
                  >
                    <GuestFlowShell flow={flow} />
                  </Suspense>
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
