import { Link } from 'react-router-dom';
import { Check, Sparkles, Zap, Crown, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Container, Reveal, SectionHeading } from './_shared';

interface Plan {
  id: string;
  name: string;
  price: number;
  icon: LucideIcon;
  blurb: string;
  perks: string[];
  popular?: boolean;
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    icon: Sparkles,
    blurb: 'A genuinely useful place to start.',
    perks: ['5 tailored résumés / day', 'Sponsorship-honest matching', 'Applications tracker', '1 learning path'],
    cta: 'Get started free',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    icon: Zap,
    blurb: 'For a serious, active search.',
    perks: ['30 tailors / day + ATS scoring', 'Callback-gap analysis', 'Interview pattern coach', '5 learning paths'],
    popular: true,
    cta: 'Choose Pro',
  },
  {
    id: 'career',
    name: 'Career',
    price: 39,
    icon: Crown,
    blurb: 'Everything, unlimited.',
    perks: ['Unlimited tailoring & analytics', 'Predictive coaching + drills', 'Public profile & career posts', 'Priority guidance'],
    cta: 'Choose Career',
  },
];

export function PricingTeaser() {
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-border bg-muted/30 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Start free. Upgrade when it pays off."
          subtitle="A generous free core does real work. Paid plans unlock the AI depth and analytics for an active search."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <Reveal key={plan.id} delay={i * 0.06} className="h-full">
                <div
                  className={cn(
                    'relative flex h-full flex-col rounded-2xl border bg-card p-6 sm:p-7',
                    plan.popular ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20' : 'border-border',
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                    <span className="font-display text-lg font-bold text-foreground">{plan.name}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">{plan.blurb}</p>
                  <p className="mt-5 font-display text-4xl font-extrabold tracking-tight text-foreground">
                    ${plan.price}
                    <span className="text-base font-medium text-muted-foreground">/mo</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 text-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-7" variant={plan.popular ? 'default' : 'outline'}>
                    <Link to="/register">{plan.cta}</Link>
                  </Button>
                </div>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No credit card to start · cancel anytime · your work stays yours.
        </p>
      </Container>
    </section>
  );
}
