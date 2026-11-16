/**
 * A short burst when an application reaches an offer (and a smaller one for a
 * first interview). Asana's lesson: celebrate the real milestones, briefly,
 * and never in the way. Pure framer-motion, no library; nothing at all under
 * reduced motion.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--signal))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--success))',
];

export interface CelebrationSignal {
  /** Changes for every new burst. */
  id: number;
  kind: 'offer' | 'interview';
}

export default function Celebration({ signal }: { signal: CelebrationSignal | null }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<CelebrationSignal | null>(null);
  useEffect(() => {
    if (!signal || reduce) return;
    setActive(signal);
    const id = window.setTimeout(() => setActive(null), 1800);
    return () => window.clearTimeout(id);
  }, [signal, reduce]);

  const pieces = useMemo(() => {
    const count = active?.kind === 'offer' ? 42 : 18;
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (i % 3) * 0.2;
      const distance = 140 + ((i * 37) % 160);
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.7 - 60,
        rotate: (i * 47) % 360,
        color: COLORS[i % COLORS.length],
        size: 6 + (i % 4) * 2,
        round: i % 2 === 0,
      };
    });
  }, [active]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center" aria-hidden>
      <AnimatePresence>
        {active &&
          pieces.map((p, i) => (
            <motion.span
              key={`${active.id}-${i}`}
              className="absolute"
              style={{
                width: p.size,
                height: p.round ? p.size : p.size * 0.45,
                background: p.color,
                borderRadius: p.round ? 999 : 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
              animate={{ x: p.x, y: [0, p.y, p.y + 220], opacity: [1, 1, 0], rotate: p.rotate * 3, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
            />
          ))}
      </AnimatePresence>
    </div>
  );
}
