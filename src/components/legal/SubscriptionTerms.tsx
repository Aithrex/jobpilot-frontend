import { Link } from 'react-router-dom';

import { PLAN_LABEL, type PlanId } from '@/lib/entitlements';
import { LEGAL_ROUTES } from '@/lib/legal';
import { PRICE_TODO, PRICING_PUBLISHED } from '@/lib/pricing';
import { cn } from '@/lib/utils';

const LINK_CLASS = 'font-medium text-foreground underline underline-offset-2 hover:text-primary';

function usd(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/**
 * The automatic renewal disclosure the state laws ask for, placed beside a
 * paid plan's call to action: the price and interval, that it renews until
 * canceled, how to cancel online, and what canceling does.
 *
 * The price comes from `lib/pricing.ts` and nowhere else. While
 * `PRICING_PUBLISHED` is false, or for any plan without a USD price, this
 * renders NOTHING: a renewal disclosure with no price would be a promise
 * about a charge nobody has decided.
 */
export function SubscriptionTerms({ planId, className }: { planId: PlanId; className?: string }) {
  if (!PRICING_PUBLISHED || planId === 'free') return null;
  const price = PRICE_TODO[planId]?.usd;
  const monthly = typeof price?.monthly === 'number' && price.monthly > 0 ? price.monthly : null;
  const annual = typeof price?.annual === 'number' && price.annual > 0 ? price.annual : null;
  if (monthly === null && annual === null) return null;

  const options = [
    monthly !== null ? `${usd(monthly)} a month` : null,
    annual !== null ? `${usd(annual)} a year` : null,
  ].filter(Boolean);

  return (
    <p
      className={cn('text-xs leading-relaxed text-muted-foreground', className)}
      data-testid={`subscription-terms-${planId}`}
    >
      {PLAN_LABEL[planId]} is billed at {options.join(' or ')} and renews automatically until you cancel. Cancel online at any time in Settings, under Billing; you keep access through the end of
      the period you paid for. The Free plan needs no card. See the{' '}
      <Link to={`${LEGAL_ROUTES.terms}#plans`} className={LINK_CLASS}>
        subscription terms
      </Link>
      .
    </p>
  );
}

export default SubscriptionTerms;
