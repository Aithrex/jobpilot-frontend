import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type TrustBand = 'trusted' | 'caution' | 'high_risk';

const CFG: Record<TrustBand, { label: string; cls: string; icon: typeof ShieldCheck }> = {
  trusted: { label: 'Screened', cls: 'bg-success/12 text-success', icon: ShieldCheck },
  caution: { label: 'Caution', cls: 'bg-warning/12 text-warning', icon: ShieldAlert },
  high_risk: { label: 'High risk', cls: 'bg-destructive/12 text-destructive', icon: ShieldX },
};

const HEADLINE: Record<TrustBand, string> = {
  trusted: 'No scam signals detected',
  caution: 'Some risk signals. Verify before applying',
  high_risk: 'Likely scam or ghost job',
};

/**
 * Scam-shield trust badge for a job posting. The deterministic band/score/reasons
 * are attached server-side to every search result; the tooltip explains *why* so
 * the signal stays trustworthy. No competitor flags scam/ghost postings — this is
 * a core JobPilot differentiator and protects students (the prime scam target).
 */
export function JobTrustBadge({
  band,
  score,
  reasons,
  className,
}: {
  band?: TrustBand;
  score?: number;
  reasons?: string[];
  className?: string;
}) {
  const cfg = CFG[band || 'caution'];
  const Icon = cfg.icon;
  const hasReasons = !!(reasons && reasons.length);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
            cfg.cls,
            className,
          )}
        >
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px]">
        <p className="text-xs font-medium">
          {HEADLINE[band || 'caution']}
          {typeof score === 'number' ? ` · ${score}/100` : ''}
        </p>
        {hasReasons ? (
          <ul className="mt-1 space-y-0.5">
            {reasons!.slice(0, 4).map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                • {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Every posting is screened for scam &amp; ghost-job signals. Tap “Deep-scan” for a detailed check.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default JobTrustBadge;
