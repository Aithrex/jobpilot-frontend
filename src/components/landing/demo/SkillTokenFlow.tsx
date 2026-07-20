import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
// EASE from guest/_shared (same curve as landing/_shared) — deliberately NOT
// landing/_shared, keeping this file's import graph as clean as the demo's.
import { EASE } from '@/components/guest/_shared';
import { useSceneState } from '@/components/landing/_shared';

/**
 * Idle-hero micro-motion: abstract skill tokens drift from a stylized resume
 * glyph into empty job-card slots — the matching promise as one glance.
 * Purely decorative (aria-hidden), transform + opacity only, in-view gated,
 * paused while the tab is hidden, and a composed end state (tokens resting in
 * their slots) under reduced motion or when inactive. Tokens are wordless
 * shapes on purpose: nothing here fabricates skills or employers.
 *
 * HARD CONTRACT: pure client visuals — no API layer, no guest identity,
 * no quota (same rule as DemoWorkspace).
 */
export function SkillTokenFlow({ className }: { className?: string }) {
  const { ref, active } = useSceneState<HTMLDivElement>();
  const [pageHidden, setPageHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const animating = active && !pageHidden;

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'flex h-16 shrink-0 items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 px-4',
        className,
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-[18px] w-[18px]" />
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-3 gap-2.5">
        {[0, 1, 2].map((slot) => (
          <div
            key={slot}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-border bg-card/60 px-2"
          >
            <span className="h-1.5 w-6 shrink-0 rounded-full bg-muted" />
            <motion.span
              className="h-3.5 min-w-0 flex-1 rounded-full bg-primary/25"
              initial={false}
              animate={
                animating
                  ? { x: [-120 - slot * 40, 0, 0], opacity: [0, 1, 1] }
                  : { x: 0, opacity: 1 }
              }
              transition={
                animating
                  ? {
                      duration: 2.2,
                      times: [0, 0.45, 1],
                      ease: EASE,
                      delay: slot * 0.5,
                      repeat: Infinity,
                      repeatDelay: 2.6,
                    }
                  : { duration: 0.2 }
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
