import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, ShieldCheck, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Container,
  DUR,
  EASE,
  Reveal,
  scenePauseHandlers,
  useSceneLoop,
  useSceneState,
} from './_shared';

/**
 * #how — Upload -> Match -> Tailor as ONE short animated pipeline (a single
 * DOM composition, no cards grid). The ~8s loop walks the three stages with
 * connector lines filling between them (transform + opacity only), gated to
 * in-view, paused on hover/focus and while the tab is hidden. Reduced motion
 * renders the composed end state: every stage lit, both connectors filled,
 * nothing moving. One sentence per step.
 */

const STEPS = [
  {
    Icon: FileUp,
    title: 'Upload',
    body: 'Upload your resume and we read it into a real profile, nothing invented.',
  },
  {
    Icon: Target,
    title: 'Match',
    body: 'We scan live openings on company career sites and keep only the strong fits.',
  },
  {
    Icon: ShieldCheck,
    title: 'Tailor',
    body: 'Pick one role and tailor your resume for it without losing the truth.',
  },
] as const;

// ~8s full loop across the three stages.
const PHASE_DURATIONS = [2600, 2700, 2700] as const;

export function HowItWorksStory() {
  const { ref, inView, reduce } = useSceneState<HTMLDivElement>();
  const [pageHidden, setPageHidden] = useState(false);
  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const active = inView && !reduce && !pageHidden;
  const { phase, setPaused } = useSceneLoop(PHASE_DURATIONS, { active, reduce });
  // Reduced motion (or off-screen before the first tick) shows the composed
  // end state; while looping, the current phase drives the highlight.
  const composedEnd = reduce || !active;

  return (
    <section
      id="how"
      aria-label="How Aspirely works"
      className="scroll-mt-24 border-t border-border py-16 sm:py-20"
    >
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            Resume in, best-fit jobs out
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            Three steps, all real: your resume, live openings, one honest tailored result.
          </p>
        </Reveal>

        <Reveal>
          <div
            ref={ref}
            {...scenePauseHandlers(setPaused)}
            className="mx-auto mt-12 grid min-h-[220px] max-w-4xl grid-cols-1 items-start gap-6 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:gap-3"
          >
            {STEPS.map(({ Icon, title, body }, i) => {
              const lit = composedEnd || phase >= i;
              const isCurrent = !composedEnd && phase === i;
              return (
                <div key={title} className="contents">
                  {i > 0 && (
                    /* Connector between stage i-1 and i: fills once stage i
                       becomes active (scaleX, transform-origin left). */
                    <div
                      aria-hidden
                      className="relative mx-auto hidden h-px w-16 self-center overflow-hidden bg-border sm:block lg:w-24"
                    >
                      <motion.span
                        className="absolute inset-0 origin-left bg-primary/60"
                        initial={false}
                        animate={{ scaleX: composedEnd || phase >= i ? 1 : 0 }}
                        transition={{ duration: DUR.slow, ease: EASE }}
                      />
                    </div>
                  )}
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.03 : 1,
                      opacity: lit ? 1 : 0.45,
                    }}
                    transition={{ duration: DUR.base, ease: EASE }}
                    className="flex flex-col items-center gap-3 text-center"
                  >
                    <span
                      className={cn(
                        'grid h-14 w-14 place-items-center rounded-2xl transition-colors duration-300',
                        lit ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">{title}</h3>
                      <p className="mt-1 max-w-[26ch] text-sm leading-relaxed text-muted-foreground">
                        {body}
                      </p>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
