import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Target, CalendarDays, Github, Linkedin, Check, ChevronRight, ThumbsUp } from 'lucide-react';
import { DemoFrame, EASE, StatValue, useDemoActive, useEntered } from './_demoKit';

// Ambient loop (s): a highlight travels left→right across the four stages so
// the pipeline reads as a flow — gap → plan → proof → post — every ~5s.
const LOOP = 5;
const CARD_GLOW = 1.3;
const CHEVRON_GLOW = 0.9;
const STAGGER = 0.55;

/** The signature loop: a market gap becomes a short plan, verified GitHub proof,
 *  and an auto-drafted post — so learning turns into a public, credible signal. */
export default function LearnToPost() {
  const ref = useRef<HTMLDivElement>(null);
  const entered = useEntered(ref);
  const active = useDemoActive(ref);
  const reduce = useReducedMotion();
  const show = reduce || entered;

  const stages = [
    {
      key: 'gap',
      head: 'Market gap',
      icon: Target,
      body: (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-foreground">
          SQL window functions
        </span>
      ),
    },
    {
      key: 'plan',
      head: '7-day plan',
      icon: CalendarDays,
      body: (
        <div className="space-y-1">
          {['Learn frames', 'Practice set', 'Ship a query'].map((s, i) => (
            <p key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className={`h-3 w-3 ${i < 2 ? 'text-success' : 'text-muted-foreground'}`} aria-hidden />
              {s}
            </p>
          ))}
        </div>
      ),
    },
    {
      key: 'proof',
      head: 'Verified proof',
      icon: Github,
      body: (
        <div className="rounded-lg border border-border bg-card px-2.5 py-1.5">
          <p className="text-xs font-semibold text-foreground">PR #482 merged</p>
          <p className="inline-flex items-center gap-1 text-[11px] text-success">
            <Check className="h-3 w-3" aria-hidden /> verified on GitHub
          </p>
        </div>
      ),
    },
    {
      key: 'post',
      head: 'Auto post',
      icon: Linkedin,
      body: (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5">
          <p className="line-clamp-2 text-[11px] leading-snug text-foreground">
            “Shipped a windowed-analytics query this week — here's what clicked…”
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <ThumbsUp className="h-3 w-3 text-primary" aria-hidden />
            <StatValue to={128} className="font-semibold text-foreground" /> reactions
          </p>
        </div>
      ),
    },
  ];

  return (
    <DemoFrame>
      <div
        ref={ref}
        role="img"
        aria-label="A four-step loop: a market gap becomes a seven-day plan, a verified GitHub pull request, and an auto-drafted LinkedIn post with growing reactions."
        className="grid gap-2.5 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] sm:items-stretch"
      >
        {stages.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="contents">
              <motion.div
                initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 10 }}
                animate={{ opacity: show ? 1 : 0, y: show ? 0 : 10 }}
                transition={{ duration: reduce ? 0 : 0.45, ease: EASE, delay: reduce ? 0 : i * 0.22 }}
                className="relative flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card/60 p-3"
              >
                {/* travelling highlight: ring + soft shadow brighten as the flow passes */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-primary/40 shadow-md shadow-primary/10"
                  initial={{ opacity: 0 }}
                  animate={active ? { opacity: [0, 1, 0] } : { opacity: 0 }}
                  transition={
                    active
                      ? { duration: CARD_GLOW, ease: 'easeInOut', repeat: Infinity, repeatDelay: LOOP - CARD_GLOW, delay: 0.8 + i * STAGGER }
                      : { duration: 0.2 }
                  }
                />
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {s.head}
                </span>
                {s.body}
              </motion.div>
              {i < stages.length - 1 && (
                <div className="hidden items-center justify-center sm:flex" aria-hidden>
                  <span className="relative block h-4 w-4">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    {/* primary copy fades in as the highlight passes through */}
                    <motion.span
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={active ? { opacity: [0, 1, 0] } : { opacity: 0 }}
                      transition={
                        active
                          ? { duration: CHEVRON_GLOW, ease: 'easeInOut', repeat: Infinity, repeatDelay: LOOP - CHEVRON_GLOW, delay: 1.15 + i * STAGGER }
                          : { duration: 0.2 }
                      }
                    >
                      <ChevronRight className="h-4 w-4 text-primary" />
                    </motion.span>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DemoFrame>
  );
}
