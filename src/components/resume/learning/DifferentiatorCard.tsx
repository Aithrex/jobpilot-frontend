import { motion, useReducedMotion } from 'framer-motion';
import { Check, TrendingUp, Clock, Gem, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Differentiator } from '@/types/learning';
import { marketPct } from './edgeShared';

interface DifferentiatorCardProps {
  diff: Differentiator;
  index: number;
  selected: boolean;
  onSelect: () => void;
}

export function DifferentiatorCard({ diff, index, selected, onSelect }: DifferentiatorCardProps) {
  const reduce = useReducedMotion();
  const pct = marketPct(diff.market_frequency);
  const scarce = diff.is_it_actually_scarce === 'yes';

  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : index * 0.05 }}
      className={cn(
        'w-full rounded-xl border bg-card p-4 text-left transition-all',
        'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary ring-1 ring-primary/40 shadow-sm' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-snug">{diff.gap}</p>
        <span
          className={cn(
            'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
          )}
          aria-hidden
        >
          {selected && <Check className="h-3.5 w-3.5" />}
        </span>
      </div>

      <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{diff.why_recruiters_care}</span>
      </p>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Trending in your market
          </span>
          <span className="font-medium text-foreground">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-3 w-3" /> ~{diff.closeable_in_days} days to close
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            scarce
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground',
          )}
        >
          <Gem className="h-3 w-3" /> {scarce ? 'Genuinely scarce' : 'Common, nice to have'}
        </span>
      </div>
    </motion.button>
  );
}

export default DifferentiatorCard;
