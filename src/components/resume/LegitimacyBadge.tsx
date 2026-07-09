import { ShieldCheck, Shield, HelpCircle, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { LegitimacyBand } from '@/types/events';
import { cn } from '@/lib/utils';

const CFG: Record<LegitimacyBand, { label: string; cls: string; icon: typeof Shield }> = {
  verified: { label: 'Verified', cls: 'bg-success/10 text-success', icon: ShieldCheck },
  credible: { label: 'Credible', cls: 'bg-primary/10 text-primary', icon: Shield },
  unvetted: { label: 'Unvetted', cls: 'bg-warning/10 text-warning', icon: HelpCircle },
  flagged: { label: 'Flagged', cls: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
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
