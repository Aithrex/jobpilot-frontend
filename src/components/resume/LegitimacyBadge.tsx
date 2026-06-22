import { ShieldCheck, Shield, HelpCircle, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { LegitimacyBand } from '@/types/events';
import { cn } from '@/lib/utils';

const CFG: Record<LegitimacyBand, { label: string; cls: string; icon: typeof Shield }> = {
  verified: { label: 'Verified', cls: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400', icon: ShieldCheck },
  credible: { label: 'Credible', cls: 'bg-blue-500/12 text-blue-600 dark:text-blue-400', icon: Shield },
  unvetted: { label: 'Unvetted', cls: 'bg-amber-500/12 text-amber-600 dark:text-amber-400', icon: HelpCircle },
  flagged: { label: 'Flagged', cls: 'bg-destructive/12 text-destructive', icon: AlertTriangle },
};

export function LegitimacyBadge({
  band, score, rationale, redFlags, className,
}: {
  band?: LegitimacyBand;
  score?: number;
  rationale?: string | null;
  redFlags?: string[];
  className?: string;
}) {
  const cfg = CFG[band || 'unvetted'];
  const Icon = cfg.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', cfg.cls, className)}>
          <Icon className="h-3 w-3" />
          {cfg.label}{typeof score === 'number' ? ` · ${score}` : ''}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[240px]">
        <p className="text-xs">Legitimacy {typeof score === 'number' ? `${score}/100` : ''}</p>
        {rationale && <p className="mt-1 text-xs text-muted-foreground">{rationale}</p>}
        {redFlags && redFlags.length > 0 && (
          <p className="mt-1 text-xs text-destructive">Flags: {redFlags.join(', ').replace(/_/g, ' ')}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default LegitimacyBadge;
