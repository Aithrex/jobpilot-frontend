import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FileCheck2, Upload, UploadCloud } from 'lucide-react';
import { GuestDropzone } from '@/components/guest/GuestDropzone';
import type { ResumePicker } from '@/components/guest/useResumePicker';
import type { GuestFlow } from '@/hooks/useGuestFlow';
import { Container, EASE } from './_shared';
import { ProductTour } from './tour/ProductTour';
import { MacWindow, type WindowStatus } from './workspace/MacWindow';

/**
 * LAZY ON PURPOSE. `GuestFlowShell` pulls in the whole guest workflow -
 * parsing, profile reveal, the results dashboard, job detail, fit breakdown,
 * tailoring, completion and the challenge dialog - roughly 3,000 lines that
 * only ever mount once a visitor actually picks a file. Statically imported,
 * all of it shipped in the eager landing chunk to every visitor who never
 * uploaded anything.
 */
const GuestFlowShell = lazy(() =>
  import('@/components/guest/GuestFlowShell').then((m) => ({ default: m.GuestFlowShell })),
);

/**
 * The hero: the promise, two actions, and the product itself.
 *
 * The headline sits on the left with two sentences and the actions beside
 * it; everything else the hero has to say, it shows. The product tour
 * follows, wide enough to read and work, and the resume drop sits under it:
 * the sample becomes a real board the moment a resume lands there.
 *
 * Once an upload starts, the real guest flow takes over inside the product
 * window, whose status pill is driven only by `liveStatus(flow)`.
 *
 * Upload is ONE click. This component does not own the file input:
 * LandingExperience renders the page's single `<input type="file">` and hands
 * the SAME picker to the hero CTA, the drop surface, and the closing CTA.
 * `GuestDropzone` must always be handed that picker - without it the component
 * mounts a second file input of its own.
 */

export interface HeroProps {
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

export function Hero({ flow, guestEnabled, authed, flowActive, picker }: HeroProps) {
  const reduce = useReducedMotion() ?? false;
  // Drag state for the whole hero, which is where a dragged file lands.
  const [dragActive, setDragActive] = useState(false);
  const droppable = guestEnabled && !authed;
  const { status, label } = liveStatus(flow);

  // The page-load sequence: headline, then copy, then the board (which times
  // its own entrance). One orchestrated moment, and nothing else on the page
  // arrives by itself.
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: EASE, delay },
        };

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
      className="pub-hero relative scroll-mt-4 overflow-hidden pb-16 pt-28 sm:pb-20 sm:pt-32 lg:pb-24 lg:pt-36"
    >
      {dragActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 z-20 grid place-items-center rounded-[1.25rem] border-2 border-dashed border-primary bg-background/90"
        >
          <span className="flex items-center gap-2.5 text-lg font-semibold text-foreground">
            <UploadCloud className="h-6 w-6 text-primary" aria-hidden />
            Drop your resume to start
          </span>
        </div>
      )}

      <Container className="relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          {!flowActive ? (
            <motion.div
              key="idle"
              initial={false}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            >
              {/* The headline is the promise in the visitor's own terms: what
                  tomorrow morning looks like. What the product does to get
                  there is the paragraph beside it. On a wide screen the two
                  sit side by side, which is what lets the board start high
                  enough to be read without scrolling. */}
              <div className="grid gap-x-12 gap-y-7 lg:grid-cols-12 lg:items-end">
                <motion.div className="lg:col-span-7" {...rise(0)}>
                  {/* WHO IT IS FOR, before anything else. The first buyer has
                      to recognise themselves in the first second, and every
                      other buyer has to see they are not shut out. */}
                  <p className="mb-6 inline-flex flex-wrap items-center gap-x-1.5 rounded-full border border-border bg-[hsl(var(--band))] px-4 py-1.5 text-[0.875rem] font-medium text-ink-muted">
                    Built for the F-1 and OPT job search.
                    <span className="font-semibold text-foreground">
                      Works the same with no visa need.
                    </span>
                  </p>
                  <h1 className="pub-h1 max-w-[11ch]">Wake up to jobs worth applying to.</h1>
                </motion.div>

                <motion.div className="lg:col-span-5 lg:pb-1.5" {...rise(0.12)}>
                  <p className="pub-lede max-w-[46ch]">
                    Fresh roles from employers' own career pages, matched to your resume, with visa
                    sponsorship evidence on each. Tailored without inventing a thing.
                  </p>

                  {authed ? (
                    <>
                      {/* Signed-in visitors already have an account. One path
                          back to the product. */}
                      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <Link to="/app/home" className="focus-ring-visible pub-btn pub-btn-primary">
                          Open my workspace
                        </Link>
                      </div>
                      <p className="mt-4 text-[0.9375rem] text-muted-foreground">
                        You're signed in. Continue where you left off.
                      </p>
                    </>
                  ) : (
                    <>
                      {/* THE TWO ACTIONS. Both start something real: one
                          creates the account, one runs the match on a resume
                          right here. Same height and shape, so the choice
                          reads as a choice; the accent marks one of them. */}
                      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <Link to="/register" className="focus-ring-visible pub-btn pub-btn-primary">
                          Create free account
                        </Link>
                        {guestEnabled ? (
                          <button
                            type="button"
                            // Opens the real OS file dialog on THIS click,
                            // through the page's ONE shared picker.
                            onClick={picker.open}
                            className="focus-ring-visible pub-btn pub-btn-secondary"
                          >
                            <Upload aria-hidden className="h-[1.125rem] w-[1.125rem]" />
                            Find my matches
                          </button>
                        ) : (
                          <Link
                            to="/register"
                            className="focus-ring-visible pub-btn pub-btn-secondary"
                          >
                            Find my matches
                          </Link>
                        )}
                      </div>

                      {/* ONE trust line, and it sells the lowest-commitment
                          offer on the page: matches before an account. */}
                      <p className="mt-4 text-[1rem] leading-relaxed text-ink-muted">
                        Free to start.{' '}
                        <span className="font-semibold text-foreground">
                          No account needed to see your matches.
                        </span>
                      </p>
                    </>
                  )}
                </motion.div>
              </div>

              <ProductTour
                className="mt-12 lg:mt-16"
                onUpload={guestEnabled && !authed ? picker.open : undefined}
              />

              {/* MAKE IT YOURS. The sample tour above becomes a real board the
                  moment a resume lands here. Same picker as the button in the
                  hero, so this is one mechanism presented twice, not two
                  uploaders. */}
              {!authed && (
                <div className="mt-6">
                  {/* Returning guest whose resume is already on file -
                      straight to today's matches, no re-upload. */}
                  {guestEnabled && flow.session?.exists && flow.session.has_resume && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3.5">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <FileCheck2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        Your resume is already on file.
                      </p>
                      <button
                        type="button"
                        onClick={flow.goToMatches}
                        className="focus-ring-visible pub-btn pub-btn-secondary pub-btn-sm shrink-0"
                      >
                        See today's matches
                      </button>
                    </div>
                  )}

                  {guestEnabled ? (
                    <GuestDropzone
                      picker={picker}
                      variant="compact"
                      label="Drop your resume to see your matches"
                      microcopy="PDF or DOCX · up to 5 MB · no account required"
                      privacyNote={null}
                    />
                  ) : (
                    <p className="rounded-2xl border border-border bg-[hsl(var(--band))] p-4 text-sm leading-relaxed text-ink-muted">
                      <span className="font-semibold text-foreground">Start free.</span> Guest upload
                      is paused right now. Create a free account to upload your resume and see your
                      matches.
                    </p>
                  )}
                </div>
              )}
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
