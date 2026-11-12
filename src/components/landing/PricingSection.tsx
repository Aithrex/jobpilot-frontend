import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { capabilityById, STATUS_LABEL, isLive } from '@/lib/capabilities';
import {
  FREE_PRICE_LABEL,
  PRICE_TBD_LABEL,
  PRICING_DISCLOSURE,
  PRICING_PUBLISHED,
  PUBLIC_PLANS,
  type PlanLine,
} from '@/lib/pricing';
import { SubscriptionTerms } from '@/components/legal/SubscriptionTerms';
import { Container, HEAD_GAP, Reveal, Section, SectionHead } from './_shared';

/**
 * The public plan comparison.
 *
 * Every string that could drift lives in `lib/pricing.ts`: plan names come
 * from `entitlements.PLAN_LABEL`, capability lines render the capability's own
 * registry status, and no price is printed at all while
 * `PRICING_PUBLISHED` is false.
 *
 * Paid tiers render NO control - not a disabled one. A greyed-out "Coming
 * soon" button is a control that does nothing, which is exactly what this
 * page's roadmap sections already refuse to ship (and what
 * `landing-redesign.test.tsx` asserts about them).
 */

export interface PricingSectionProps {
  /** 'summary' is the band on `/`; 'full' is the `/pricing` route body. */
  variant?: 'summary' | 'full';
  /** 'h2' on `/`, 'h1' when the route owns the page. */
  headingLevel?: 'h1' | 'h2';
  className?: string;
}

function LineText({ line }: { line: PlanLine }) {
  if (line.kind === 'capability') {
    const cap = capabilityById(line.capabilityId);
    return (
      <>
        <span>{line.outcome}</span>
        {cap && !isLive(cap.status) && (
          <span className="ml-1.5 whitespace-nowrap rounded-full border border-border px-1.5 py-0.5 text-caption-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {STATUS_LABEL[cap.status]}
          </span>
        )}
      </>
    );
  }
  if (line.kind === 'limit') {
    return (
      <>
        <span>{line.outcome}</span>
        <span className="ml-1.5 text-muted-foreground">{line.value}</span>
      </>
    );
  }
  return <span>{line.outcome}</span>;
}

export function PricingSection({
  variant = 'summary',
  headingLevel = 'h2',
  className,
}: PricingSectionProps) {
  const Heading = headingLevel;
  const isRoute = headingLevel === 'h1';
  const { isAuthenticated, isLoading } = useAuth();
  const authed = !isLoading && isAuthenticated;

  return (
    <Section id="pricing" labelledBy="pricing-heading" className={className}>
      <Container>
        {isRoute ? (
          <Reveal className="max-w-2xl">
            <p className="text-caption-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Plans
            </p>
            <Heading
              id="pricing-heading"
              className="mt-3 text-balance font-display text-display-sm text-foreground"
            >
              What each plan includes.
            </Heading>
            <p className="mt-4 max-w-[60ch] text-pretty text-body-lg text-ink-muted">
              {PRICING_DISCLOSURE}
            </p>
          </Reveal>
        ) : (
          <SectionHead
            eyebrow="Plans"
            titleId="pricing-heading"
            title={<>Start free. Nothing to cancel.</>}
            lede={PRICING_DISCLOSURE}
          />
        )}

        <div className={cn(HEAD_GAP, 'grid gap-5 lg:grid-cols-3')}>
          {PUBLIC_PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.06}>
              <div
                className={cn(
                  'flex h-full flex-col rounded-container border bg-card p-6 sm:p-7',
                  plan.cta ? 'border-primary shadow-panel' : 'border-border shadow-soft',
                )}
              >
                <h3 className="font-display text-title-lg font-bold text-foreground">
                  {plan.label}
                </h3>

                {/* Where a price would go. Never a currency glyph, never a
                    decimal, never "/mo" - see the price rule in pricing.ts. */}
                <p
                  className={cn(
                    'mt-1 text-body-md font-semibold',
                    plan.id === 'free' ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {plan.id === 'free' ? FREE_PRICE_LABEL : PRICE_TBD_LABEL}
                </p>

                <p className="mt-3 text-pretty text-body-md text-ink-muted">
                  {plan.audience}
                </p>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.includes.map((line, li) => (
                    <li key={li} className="flex gap-2.5 text-body-md text-foreground">
                      <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-success" />
                      <span className="min-w-0">
                        <LineText line={line} />
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.cta ? (
                  <Link
                    to={authed ? '/app/home' : plan.cta.to}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {authed ? 'Open my workspace' : plan.cta.label}
                  </Link>
                ) : (
                  <p className="mt-6 text-body-md text-muted-foreground">
                    Included when paid plans open.
                  </p>
                )}
                {/* Auto-renewal disclosure beside the paid CTA. Renders nothing
                    until pricing.ts publishes a price for this plan. */}
                <SubscriptionTerms planId={plan.id} className="mt-3" />
              </div>
            </Reveal>
          ))}
        </div>

        {variant === 'summary' && (
          <Reveal className="mt-6" delay={0.12}>
            <Link
              to="/pricing"
              className="rounded-sm text-base font-semibold text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              See what each plan includes
            </Link>
          </Reveal>
        )}

        {variant === 'full' && !PRICING_PUBLISHED && (
          <Reveal className="mt-10" delay={0.12}>
            <p className="max-w-[65ch] text-body-md text-muted-foreground">
              Aspirely does not ask for a card to sign up, and there is no trial to forget about.
              When paid plans open we will say so here first.
            </p>
          </Reveal>
        )}
      </Container>
    </Section>
  );
}
