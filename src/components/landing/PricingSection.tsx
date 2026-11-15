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
import { Container, HEAD_GAP, Section, SectionHead } from './_shared';

/**
 * The public plan comparison.
 *
 * Every string that could drift lives in `lib/pricing.ts`: plan names come
 * from `entitlements.PLAN_LABEL`, capability lines render the capability's own
 * registry status, and no price is printed at all while
 * `PRICING_PUBLISHED` is false.
 *
 * THE FREE PLAN IS THE OFFER, so it is the one raised panel with the one
 * action. The paid tiers are set back: same information, no surface, no
 * control. Paid tiers render NO control - not a disabled one. A greyed-out
 * "Coming soon" button is a control that does nothing, which is exactly what
 * this page's roadmap section refuses to ship.
 */

export interface PricingSectionProps {
  /** 'summary' is the band on `/`; 'full' is the `/pricing` route body. */
  variant?: 'summary' | 'full';
  /** 'h2' on `/`, 'h1' when the route owns the page. */
  headingLevel?: 'h1' | 'h2';
  className?: string;
}

/** A capability's status, shown only while that capability is not live. */
function StatusNote({ capabilityId }: { capabilityId?: string }) {
  const cap = capabilityId ? capabilityById(capabilityId) : undefined;
  if (!cap || isLive(cap.status)) return null;
  return <span className="pub-chip ml-2 align-middle">{STATUS_LABEL[cap.status]}</span>;
}

function LineText({ line }: { line: PlanLine }) {
  if (line.kind === 'capability') {
    return (
      <>
        <span>{line.outcome}</span>
        <StatusNote capabilityId={line.capabilityId} />
      </>
    );
  }
  if (line.kind === 'limit') {
    return (
      <>
        <span>{line.outcome}</span>
        <span className="ml-1.5 text-muted-foreground">{line.value}</span>
        <StatusNote capabilityId={line.capabilityId} />
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
  const isRoute = headingLevel === 'h1';
  const { isAuthenticated, isLoading } = useAuth();
  const authed = !isLoading && isAuthenticated;

  // ON THE HOME PAGE: the one plan a visitor can actually take, and a single
  // sentence about the rest. Two cards reading "Pricing not announced yet"
  // beside it spent the highest-intent moment on the page saying what cannot
  // be bought. `/pricing` still lays all three side by side.
  if (variant === 'summary') {
    const free = PUBLIC_PLANS.find((p) => p.cta) ?? PUBLIC_PLANS[0];
    const later = PUBLIC_PLANS.filter((p) => p.id !== free.id).map((p) => p.label);
    return (
      <Section id="pricing" labelledBy="pricing-heading" className={cn('pub-band', className)}>
        <Container>
          <div className="pub-stage grid gap-x-12 gap-y-8 p-7 sm:p-10 lg:grid-cols-12 lg:items-center lg:p-12">
            <div className="lg:col-span-5">
              <h2 id="pricing-heading" className="pub-h2">
                Start free. Nothing to cancel.
              </h2>
              <p className="pub-lede mt-4">No card. No trial that runs out.</p>
              <div className="mt-8">
                <Link
                  to={authed ? '/app/home' : (free.cta?.to ?? '/register')}
                  className="focus-ring-visible pub-btn pub-btn-primary"
                >
                  {authed ? 'Open my workspace' : (free.cta?.label ?? 'Create free account')}
                </Link>
              </div>
            </div>
            <div className="lg:col-span-7">
              <h3 className="pub-h4">{free.label}</h3>
              <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {free.includes.map((line, li) => (
                  <li
                    key={li}
                    className="flex gap-3 text-[0.9375rem] leading-relaxed text-foreground"
                  >
                    <Check aria-hidden strokeWidth={2.75} className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <LineText line={line} />
                    </span>
                  </li>
                ))}
              </ul>
              <SubscriptionTerms planId={free.id} className="mt-3" />
            </div>
          </div>

          <p className="mt-6 text-[0.9375rem] text-ink-muted">
            {later.join(' and ')} are not on sale yet.{' '}
            <Link
              to="/pricing"
              className="focus-ring-visible rounded-sm font-semibold text-primary underline underline-offset-4 hover:decoration-2"
            >
              See what each plan includes
            </Link>
          </p>
        </Container>
      </Section>
    );
  }

  return (
    <Section id="pricing" labelledBy="pricing-heading" className={cn('pub-band', className)}>
      <Container>
        <SectionHead
          as={headingLevel}
          titleId="pricing-heading"
          title={isRoute ? 'What each plan includes.' : 'Start free. Nothing to cancel.'}
          lede={PRICING_DISCLOSURE}
        />

        <div className={cn(HEAD_GAP, 'grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr] lg:gap-6')}>
          {PUBLIC_PLANS.map((plan) => {
            const featured = Boolean(plan.cta);
            return (
              <div
                key={plan.id}
                className={cn(
                  'flex h-full flex-col rounded-[1.25rem] p-7 sm:p-8',
                  featured ? 'pub-stage' : 'border border-[hsl(var(--band-strong))]',
                )}
              >
                <h3 className="pub-h3">{plan.label}</h3>

                {/* Where a price would go. Never a currency glyph, never a
                    decimal, never "/mo" - see the price rule in pricing.ts. */}
                <p
                  className={cn(
                    'mt-1.5 text-[1rem] font-semibold',
                    plan.id === 'free' ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {plan.id === 'free' ? FREE_PRICE_LABEL : PRICE_TBD_LABEL}
                </p>

                <p className="mt-4 text-pretty text-[1rem] leading-relaxed text-ink-muted">
                  {plan.audience}
                </p>

                {(() => {
                  const list = (
                    <ul className="space-y-3">
                      {plan.includes.map((line, li) => (
                        <li
                          key={li}
                          className="flex gap-3 text-[0.9375rem] leading-relaxed text-foreground"
                        >
                          <Check
                            aria-hidden
                            strokeWidth={2.75}
                            className={cn(
                              'mt-1 h-4 w-4 shrink-0',
                              featured ? 'text-primary' : 'text-muted-foreground',
                            )}
                          />
                          <span className="min-w-0">
                            <LineText line={line} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  );
                  return <div className="mt-6 flex-1 border-t border-border pt-6">{list}</div>;
                })()}

                {plan.cta ? (
                  <Link
                    to={authed ? '/app/home' : plan.cta.to}
                    className="focus-ring-visible pub-btn pub-btn-primary mt-8"
                  >
                    {authed ? 'Open my workspace' : plan.cta.label}
                  </Link>
                ) : (
                  <p className="mt-8 text-[0.9375rem] text-muted-foreground">
                    Included when paid plans open.
                  </p>
                )}
                {/* Auto-renewal disclosure beside the paid CTA. Renders nothing
                    until pricing.ts publishes a price for this plan. */}
                <SubscriptionTerms planId={plan.id} className="mt-3" />
              </div>
            );
          })}
        </div>

        {variant === 'full' && !PRICING_PUBLISHED && (
          <p className="pub-body mt-10 max-w-[65ch]">
            Aspirely does not ask for a card to sign up, and there is no trial to forget about.
            When paid plans open we will say so here first.
          </p>
        )}
      </Container>
    </Section>
  );
}
