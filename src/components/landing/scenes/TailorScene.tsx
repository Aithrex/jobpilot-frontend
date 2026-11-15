import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE, Mark } from '../_shared';
import {
  RESUME_HEADER,
  RESUME_LINES,
  TAILOR_PLAN,
  tailoredOrder,
  type SampleRole,
} from '../sample';

/**
 * TAILOR: shown as what it actually is. The same lines, in a different order,
 * with the evidence this posting asked for brought forward.
 *
 * The scene is a deliberately conservative example. Nothing in the tailored
 * version is a new fact, a new number or a stronger verb than the original
 * carried, because the product's rule is that tailoring moves emphasis and
 * never facts. A flashier before and after (a vague bullet turning into one
 * with a metric in it) would demonstrate exactly the thing Aspirely refuses
 * to do. The plan for each role lives in `sample.ts` and has no field for new
 * wording at all.
 *
 * The switch is a real control: a visitor can flip between the two versions
 * as often as they like. When the scene opens it flips to the tailored
 * version once by itself.
 */

/** What tailoring is never allowed to touch. */
const HELD = ['Employers', 'Job titles', 'Dates', 'Numbers'];

export interface TailorSceneProps {
  role: SampleRole;
  run: boolean;
  onNext: () => void;
  nudge: boolean;
}

export function TailorScene({ role, run, onNext, nudge }: TailorSceneProps) {
  const reduce = useReducedMotion() ?? false;
  const [tailored, setTailored] = useState(reduce);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (reduce || !run || touched) return;
    const id = window.setTimeout(() => setTailored(true), 800);
    return () => window.clearTimeout(id);
  }, [run, reduce, touched]);

  const plan = TAILOR_PLAN[role.id] ?? { lead: [], marks: [] };
  const original = RESUME_LINES.map((l) => l.id);
  const order = tailored ? tailoredOrder(role.id) : original;
  const moved = tailoredOrder(role.id).filter((id, i) => original[i] !== id).length;
  const choose = (next: boolean) => {
    setTouched(true);
    setTailored(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3 sm:px-7">
        <div
          role="group"
          aria-label="Resume version"
          className="inline-flex rounded-[0.625rem] bg-[hsl(var(--band))] p-1"
        >
          {[
            { label: 'Original', value: false },
            { label: 'Tailored', value: true },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              aria-pressed={tailored === opt.value}
              onClick={() => choose(opt.value)}
              className={cn(
                'focus-ring-visible relative rounded-[0.4375rem] px-3.5 py-1.5 text-[0.875rem] font-semibold transition-colors',
                tailored === opt.value
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tailored === opt.value && (
                <motion.span
                  layoutId="tailor-version"
                  aria-hidden
                  className="absolute inset-0 rounded-[0.4375rem] bg-card shadow-soft"
                  transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
                />
              )}
              <span className="relative">{opt.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[0.8125rem] text-muted-foreground" aria-live="polite">
          {tailored ? `Tailored for ${role.title}, ${role.company}` : 'As you wrote it'}
        </p>
      </div>

      <div className="grid lg:min-h-[28.75rem] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* THE SHEET */}
        <div className="p-5 sm:p-8">
          <div className="pub-sheet mx-auto max-w-xl p-6 sm:p-7">
            <p className="text-[1.0625rem] font-semibold text-foreground">{RESUME_HEADER.title}</p>
            <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
              {RESUME_HEADER.employer} · {RESUME_HEADER.dates}
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {order.map((id) => {
                const line = RESUME_LINES.find((l) => l.id === id)!;
                return (
                  <motion.li
                    key={line.id}
                    layout={reduce ? false : 'position'}
                    transition={{ duration: 0.6, ease: EASE }}
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
                        ) : plan.marks.includes(seg.mark) ? (
                          <Mark key={i} on={tailored} delay={tailored ? 520 : 0}>
                            {seg.mark}
                          </Mark>
                        ) : (
                          <span key={i}>{seg.mark}</span>
                        ),
                      )}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* THE CHECK */}
        <div className="flex flex-col border-t border-border bg-[hsl(var(--band))] p-5 sm:p-8 lg:border-l lg:border-t-0">
          <p className="text-[0.8125rem] font-semibold text-muted-foreground">
            Held exactly as written
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 lg:grid-cols-1">
            {HELD.map((item, i) => (
              <li key={item} className="flex items-center gap-2.5 text-[0.9375rem] text-foreground">
                <motion.span
                  aria-hidden
                  className="grid h-[1.125rem] w-[1.125rem] shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                  initial={false}
                  animate={{ scale: tailored ? 1 : 0.4, opacity: tailored ? 1 : 0.25 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { duration: 0.32, ease: EASE, delay: tailored ? 0.9 + i * 0.12 : 0 }
                  }
                >
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </motion.span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-border pt-4 text-[0.875rem] leading-relaxed text-ink-muted">
            {tailored
              ? `${moved} ${moved === 1 ? 'line' : 'lines'} reordered. ${plan.marks.length} phrases this posting asks for are marked. No fact was added.`
              : 'Four lines, in the order you wrote them.'}
          </p>
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={onNext}
              className={cn(
                'focus-ring-visible pub-mini-btn pub-mini-btn-solid',
                nudge && tailored && 'pub-nudge',
              )}
            >
              Mark as applied
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
