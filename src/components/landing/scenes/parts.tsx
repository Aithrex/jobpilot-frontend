import { motion } from 'framer-motion';
import { Ban, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE } from '../_shared';
import type { SampleRole } from '../sample';

/**
 * The pieces every product scene on the public site shares: the employer
 * monogram, the fit ring and the visa chip. They are drawn once here so the
 * hero board, the annotated role and the pipeline cannot drift apart.
 */

export function Monogram({ role, size = 40 }: { role: SampleRole; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-[0.625rem] text-[0.9375rem] font-bold"
      style={{
        width: size,
        height: size,
        // The sanctioned exception to "no inline colour": a data-derived
        // identity hue, tint only (system-map section 9).
        backgroundColor: `hsl(${role.hue} 70% 50% / 0.13)`,
        boxShadow: `inset 0 0 0 1px hsl(${role.hue} 60% 50% / 0.22)`,
        color: `hsl(${role.hue} 62% var(--monogram-l))`,
      }}
    >
      {role.monogram}
    </span>
  );
}

export function FitRing({ score, size = 38, draw }: { score: number; size?: number; draw: boolean }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const strong = score >= 65;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="pub-ring-track"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={strong ? 'hsl(var(--primary))' : 'hsl(var(--ink-subtle))'}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: draw ? c * (1 - score / 100) : c }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <span
        className="absolute text-[0.75rem] font-bold tabular-nums text-foreground"
        style={size > 44 ? { fontSize: '1.0625rem' } : undefined}
      >
        {score}
      </span>
    </span>
  );
}

export function VisaChip({ role }: { role: SampleRole }) {
  const { visa } = role;
  if (visa.kind === 'none') return null;
  if (visa.kind === 'refuses') {
    return (
      <span className="pub-chip pub-chip-warn">
        <Ban aria-hidden className="h-3 w-3" />
        {visa.chip}
      </span>
    );
  }
  return (
    <span className={cn('pub-chip', visa.kind === 'sponsors' && 'pub-chip-signal')}>
      {visa.kind === 'sponsors' && <Check aria-hidden className="h-3 w-3" strokeWidth={3} />}
      {visa.chip}
    </span>
  );
}
