import { Lock } from 'lucide-react';
import { useUpgrade } from './UpgradeModalProvider';
import { PLAN_LABEL, minPlanFor } from '@/lib/entitlements';
import { cn } from '@/lib/utils';

interface Props {
  /** Boolean feature key this badge gates (drives the upgrade prompt). */
  feature?: string;
  label?: string;
  className?: string;
  /** When false, render a static badge that doesn't open the upgrade modal. */
  interactive?: boolean;
}

/**
 * Small "Premium" lock chip shown next to gated features. Clicking opens the
 * upgrade modal pre-targeted at the plan that unlocks the feature.
 */
export function LockBadge({ feature, label, className, interactive = true }: Props) {
  const { open } = useUpgrade();
  const plan = feature ? minPlanFor(feature) : 'premium';
  const text = label || PLAN_LABEL[plan];

  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary',
        className,
      )}
    >
      <Lock className="h-3 w-3" />
      {text}
    </span>
  );

  if (!interactive) return content;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        open({ feature, highlight: plan });
      }}
      className="cursor-pointer rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`Upgrade to ${text}`}
    >
      {content}
    </button>
  );
}

export default LockBadge;
