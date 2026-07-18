import { Progress } from '@/components/ui/progress';
import { useUpgrade } from './UpgradeModalProvider';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  used: number;
  /** null => unlimited. */
  limit: number | null;
  /** Feature key for the upgrade CTA shown when the meter is near/at the cap. */
  feature?: string;
  className?: string;
}

/**
 * Compact usage meter for a metered feature (e.g. "Tailors today 4 / 5").
 * Turns amber near the cap and red when exhausted, with an inline upgrade nudge.
 */
export function QuotaMeter({ label, used, limit, feature, className }: Props) {
  const { open } = useUpgrade();
  const unlimited = limit === null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const exhausted = !unlimited && used >= (limit ?? 0);
  const near = !unlimited && !exhausted && pct >= 80;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', exhausted && 'text-destructive', near && 'text-amber-500')}>
          {unlimited ? 'Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <Progress
          value={pct}
          className={cn('h-1.5', exhausted && '[&>div]:bg-destructive', near && '[&>div]:bg-amber-500')}
        />
      )}
      {exhausted && (
        <button
          type="button"
          onClick={() => open({ feature })}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Daily limit reached. Upgrade for more
        </button>
      )}
    </div>
  );
}

export default QuotaMeter;
