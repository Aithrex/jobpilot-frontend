import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE, Mark } from '../_shared';
import { RESUME_HEADER, RESUME_LINES, RESUME_READ } from '../sample';

/**
 * READ: the resume going in.
 *
 * A sheet of the sample resume on the left; on the right, what the product
 * reads out of it. A scan line travels down the sheet, the phrases it found
 * are marked as it passes, and each reading lands beside it in turn. With
 * reduced motion the sheet is simply shown already read.
 */

export interface ReadSceneProps {
  /** The scene is on screen and should play. */
  run: boolean;
  onNext: () => void;
  nudge: boolean;
}

export function ReadScene({ run, onNext, nudge }: ReadSceneProps) {
  const reduce = useReducedMotion() ?? false;
  const done = reduce || run;
  let chip = 0;

  return (
    <div className="grid lg:min-h-[32.5rem] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* THE SHEET */}
      <div className="p-5 sm:p-8">
        <div className="pub-sheet relative mx-auto max-w-xl overflow-hidden p-6 sm:p-7">
          {!reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-[hsl(var(--mark)/0.28)] to-transparent"
              initial={false}
              animate={run ? { y: ['-20%', '620%'], opacity: [0, 1, 1, 0] } : { opacity: 0 }}
              transition={{ duration: 2.3, ease: 'easeInOut', delay: 0.3 }}
            />
          )}
          <p className="flex items-center gap-2 text-[0.75rem] font-semibold text-muted-foreground">
            <FileText aria-hidden className="h-3.5 w-3.5" />
            resume.pdf
          </p>
          <p className="mt-4 text-[1.0625rem] font-semibold text-foreground">
            {RESUME_HEADER.title}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
            {RESUME_HEADER.employer} · {RESUME_HEADER.dates}
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {RESUME_LINES.map((line, li) => (
              <li
                key={line.id}
                className="flex gap-3 text-[0.9375rem] leading-relaxed text-foreground"
              >
                <span
                  aria-hidden
                  className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ink-subtle))]"
                />
                <span>
                  {line.text.map((seg, i) =>
                    typeof seg === 'string' ? (
                      <span key={i}>{seg}</span>
                    ) : (
                      <Mark key={i} on={done} delay={reduce ? 0 : 700 + li * 420}>
                        {seg.mark}
                      </Mark>
                    ),
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* THE READING */}
      <div className="flex flex-col border-t border-border bg-[hsl(var(--band))] p-5 sm:p-8 lg:border-l lg:border-t-0">
        <p className="text-[0.8125rem] font-semibold text-muted-foreground">What Aspirely read</p>
        <dl className="mt-4 flex flex-col gap-5">
          {RESUME_READ.map((group) => (
            <div key={group.label}>
              <dt className="text-[0.8125rem] text-ink-muted">{group.label}</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                {group.values.map((value) => {
                  const order = chip++;
                  return (
                    <motion.span
                      key={value}
                      className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-[0.875rem] font-semibold text-foreground"
                      initial={false}
                      animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.85, y: done ? 0 : 6 }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { duration: 0.4, ease: EASE, delay: done ? 0.9 + order * 0.22 : 0 }
                      }
                    >
                      {value}
                    </motion.span>
                  );
                })}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-[0.8125rem] leading-relaxed text-ink-muted">
          Read as structure, not keywords. Nothing is added to what you wrote.
        </p>
        <div className="mt-auto pt-6">
          <button
            type="button"
            onClick={onNext}
            className={cn('focus-ring-visible pub-mini-btn pub-mini-btn-solid', nudge && 'pub-nudge')}
          >
            See the matches
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
