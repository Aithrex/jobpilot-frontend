import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Container, Reveal } from './_shared';
import { MiniMatchCard, MiniTailorDiff, MiniUpload } from './fixtures';

/**
 * How it works: three click-to-advance step cards driving one compact product
 * visual (the sanitized fixtures), instead of text blocks. The panel swap is
 * a one-shot 300ms fade (animate-fade-in), disabled under reduced motion.
 * Fixed panel height so advancing never shifts layout. No timers, no loops.
 */

const STEPS = [
  {
    title: 'Upload resume',
    blurb: 'PDF or DOCX. We read your real experience.',
    visual: MiniUpload,
    visualLabel: 'Example of a parsed resume',
  },
  {
    title: 'Review five matches',
    blurb: 'Scored against live openings, with the reason for each score.',
    visual: MiniMatchCard,
    visualLabel: 'Example of a scored job match',
  },
  {
    title: 'Tailor one resume',
    blurb: 'Reworded for the role you pick. Nothing invented.',
    visual: MiniTailorDiff,
    visualLabel: 'Example of an integrity checked rewrite',
  },
] as const;

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const Visual = STEPS[active].visual;

  return (
    <section id="how-it-works" aria-label="How it works" className="scroll-mt-24 border-t border-border py-16 sm:py-20">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            Three steps, no busywork
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            Upload once, review real matches, tailor for the role you pick.
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mx-auto mt-10 grid max-w-4xl items-start gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10">
          {/* Step cards, click to advance */}
          <ol className="space-y-2.5">
            {STEPS.map((step, i) => {
              const isActive = i === active;
              return (
                <li key={step.title}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn(
                      'focus-ring-visible flex min-h-[44px] w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors duration-200 motion-reduce:transition-none',
                      isActive
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border bg-card hover:border-input',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold tabular-nums',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn('block text-sm font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                        {step.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{step.blurb}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* The visual panel, fixed height so switching never shifts layout */}
          <div aria-label={STEPS[active].visualLabel} className="flex min-h-[300px] items-start justify-center rounded-2xl border border-border bg-muted/30 p-4 sm:p-6">
            <div key={active} className="w-full max-w-sm animate-fade-in motion-reduce:animate-none">
              <Visual />
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
