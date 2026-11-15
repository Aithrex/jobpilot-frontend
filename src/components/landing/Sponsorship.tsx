import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGroup, motion, useInView, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Container, EASE, SampleTag, Section } from './_shared';
import { SAMPLE_ROLES, type SampleRole } from './sample';
import { FitRing, Monogram, VisaChip } from './scenes/parts';

/**
 * Sponsorship: the page's one saturated band, spent on the thing no other
 * product in the category puts on its homepage.
 *
 * It is shown rather than described. One switch, "I need sponsorship", and
 * the same five sample roles re-sort in front of the reader: employers with a
 * filing history rise, the posting that rules sponsorship out is flagged and
 * drops to the bottom. Switch it off and the board is ordered by fit alone
 * with no visa signal on it, which is what a reader with no visa need gets.
 *
 * EVIDENCE, NOT ODDS. The product reports what employers have filed and what
 * postings say (`lib/sponsorshipSignal.ts` drops every score and band for this
 * reason). Nothing here may predict a reader's chances, and the last line
 * says so in words.
 *
 * Chip wording is the product's own (`job-search/JobVisaSignals.tsx`).
 */

/** Where a role sits once sponsorship matters: evidence first, a refusal last. */
function rank(role: SampleRole): number {
  switch (role.visa.kind) {
    case 'sponsors':
      return 0;
    case 'note':
      return 1;
    case 'none':
      return 2;
    default:
      return 3;
  }
}

/** Also read from postings. The first two already appear on the sample board. */
const FINE_PRINT = ['Accepts CPT', 'No citizenship req', 'Clearance required'] as const;

/**
 * A sample visa timeline: where today sits between an OPT start and the end
 * of a STEM extension. A picture of the idea, not anyone's dates.
 */
function Timeline() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const today = 0.2;
  const shown = reduce || inView;

  return (
    <div ref={ref} aria-hidden>
      <div className="relative h-6 text-[0.8125rem]">
        <motion.span
          className="absolute -translate-x-1/2 font-semibold"
          style={{ left: `${today * 100}%` }}
          initial={false}
          animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 4 }}
          transition={{ duration: 0.4, ease: EASE, delay: 1.15 }}
        >
          Today
        </motion.span>
      </div>
      <div className="relative h-2 rounded-full bg-[hsl(var(--brand-band-foreground)/0.2)]">
        <motion.div
          className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-[hsl(var(--brand-band-foreground))]"
          initial={false}
          animate={{ scaleX: shown ? today : 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
        />
        {/* The end of the first OPT year. */}
        <span className="absolute inset-y-0 left-1/3 w-0.5 bg-[hsl(var(--brand-band))]" />
        <motion.span
          className="absolute top-1/2 -ml-2 -mt-2 h-4 w-4 rounded-full border-[3px] border-[hsl(var(--brand-band))] bg-[hsl(var(--brand-band-accent))]"
          style={{ left: `${today * 100}%` }}
          initial={false}
          animate={{ scale: shown ? 1 : 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 1.1 }}
        />
      </div>
      <div className="pub-band-muted relative mt-3 h-5 text-[0.8125rem] font-medium">
        <span className="absolute left-0">OPT starts</span>
        <span className="absolute left-1/3 -translate-x-1/2">OPT ends</span>
        <span className="absolute right-0">STEM extension ends</span>
      </div>
    </div>
  );
}

export function Sponsorship({ onUpload }: { onUpload?: () => void } = {}) {
  const reduce = useReducedMotion() ?? false;
  const { isAuthenticated, isLoading } = useAuth();
  const authed = !isLoading && isAuthenticated;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(stageRef, { once: true, amount: 0.5 });
  const [needs, setNeeds] = useState(reduce);
  const [touched, setTouched] = useState(false);

  // The first time the board is on screen the switch turns itself on, once,
  // so the reader sees the re-sort happen instead of arriving after it.
  useEffect(() => {
    if (reduce || !inView || touched) return;
    const id = window.setTimeout(() => setNeeds(true), 900);
    return () => window.clearTimeout(id);
  }, [inView, reduce, touched]);

  const roles = needs
    ? [...SAMPLE_ROLES].sort((a, b) => rank(a) - rank(b) || b.score - a.score)
    : [...SAMPLE_ROLES].sort((a, b) => b.score - a.score);

  return (
    <Section id="sponsorship" labelledBy="sponsorship-heading" className="pub-brand-band">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-5">
            <h2 id="sponsorship-heading" className="pub-h2">
              Need sponsorship? Know before you apply.
            </h2>
            <p className="pub-band-muted mt-5 max-w-[40ch] text-[1.125rem] leading-relaxed">
              The evidence is on every card, from public H-1B filings and the posting's own words.
            </p>

            <label className="mt-9 flex cursor-pointer items-center gap-3.5 text-[1.0625rem] font-semibold">
              <button
                type="button"
                role="switch"
                aria-checked={needs}
                onClick={() => {
                  setTouched(true);
                  setNeeds((n) => !n);
                }}
                className={cn(
                  'focus-ring-visible pub-switch pub-switch-on-band',
                  !touched && !reduce && 'pub-nudge',
                )}
              />
              I need sponsorship
            </label>
            {/* Said beside the switch, not in a caption: a reader with no
                visa need must not read this whole chapter as "not for me". */}
            <p className="pub-band-muted mt-3 text-[0.9375rem] leading-relaxed">
              No visa need? Leave it off and nothing is filtered.
            </p>

            <div className="mt-10">
              <Timeline />
              <p className="pub-band-muted mt-4 max-w-[42ch] text-[0.9375rem] leading-relaxed">
                Your OPT, STEM extension and H-1B dates, beside your search.
              </p>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to={authed ? '/app/home' : '/register'}
                className="focus-ring-visible pub-btn pub-btn-primary"
              >
                {authed ? 'Open my workspace' : 'Create free account'}
              </Link>
              {onUpload && !authed && (
                <button
                  type="button"
                  onClick={onUpload}
                  className="focus-ring-visible pub-btn pub-btn-ghost-on-band"
                >
                  Find my matches
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div ref={stageRef} className="pub-stage overflow-hidden">
              <p
                className="border-b border-border px-5 py-3.5 text-[0.875rem] text-ink-muted sm:px-6"
                aria-live="polite"
              >
                {needs ? (
                  <>
                    <span className="font-semibold text-foreground">Sponsorship on.</span>{' '}
                    Employers with a filing history first. A refusal is flagged.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-foreground">Sponsorship off.</span> Ordered
                    by fit alone. Nothing is filtered.
                  </>
                )}
              </p>
              <LayoutGroup>
                <ul className="flex flex-col p-2 sm:p-3">
                  {roles.map((role) => {
                    const refused = needs && role.visa.kind === 'refuses';
                    return (
                      <motion.li
                        key={role.id}
                        layout={reduce ? false : 'position'}
                        transition={{ duration: 0.6, ease: EASE }}
                        className={cn(
                          'flex items-center gap-3.5 rounded-xl px-3 py-3 transition-opacity duration-300 sm:px-4',
                          refused && 'opacity-55',
                        )}
                      >
                        <Monogram role={role} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.9375rem] font-semibold text-foreground">
                            {role.title}
                          </p>
                          <p className="truncate text-[0.8125rem] text-muted-foreground">
                            {role.company} · {role.location}
                          </p>
                        </div>
                        <motion.span
                          className="hidden shrink-0 sm:block"
                          initial={false}
                          animate={{ opacity: needs ? 1 : 0, x: needs ? 0 : 8 }}
                          transition={reduce ? { duration: 0 } : { duration: 0.35, ease: EASE, delay: needs ? 0.35 : 0 }}
                          aria-hidden={!needs}
                        >
                          <VisaChip role={role} />
                        </motion.span>
                        <FitRing score={role.score} draw={reduce || inView} />
                      </motion.li>
                    );
                  })}
                </ul>
              </LayoutGroup>
              <p className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3.5 text-[0.8125rem] text-ink-muted sm:px-6">
                Also read from the posting:
                {FINE_PRINT.map((label) => (
                  <span key={label} className="pub-chip">
                    {label}
                  </span>
                ))}
              </p>
            </div>

            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9375rem] leading-relaxed">
              <SampleTag />
              <span>
                <span className="font-semibold">Evidence, not odds.</span>{' '}
                <span className="pub-band-muted">It never predicts your chances.</span>
              </span>
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
