import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, EASE, Eyebrow } from './_shared';

/**
 * Pricing — the three real plans from the backend entitlements
 * (`entitlements_service.PLAN_LIMITS`): Free / Premium $19.99 / Premium+ $39.99.
 * Billing isn't live yet, so every plan's action starts a free account
 * (/register); paid tiers are honestly labelled "Upgrade anytime". No fake
 * urgency, no invented savings — just what each plan actually unlocks.
 */

type Feature = { label: string; included: boolean };
type Plan = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: Feature[];
  cta: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    tagline: 'Start applying today.',
    features: [
      { label: '5 resume tailors / day', included: true },
      { label: '10 apply-answers / day', included: true },
      { label: '5 auto-submits / day', included: true },
      { label: '1 authored resume / month', included: true },
      { label: 'Sponsorship intel + WhatsApp digest', included: true },
      { label: 'Batch tailoring', included: false },
    ],
    cta: 'Get started free',
  },
  {
    name: 'Premium',
    price: '$19.99',
    cadence: '/ month',
    tagline: 'For an active search.',
    featured: true,
    features: [
      { label: '30 resume tailors / day', included: true },
      { label: '100 apply-answers / day', included: true },
      { label: '50 auto-submits / day', included: true },
      { label: '10 authored resumes / month', included: true },
      { label: 'Batch tailoring — up to 10 at once', included: true },
      { label: 'The full growth loop', included: true },
    ],
    cta: 'Upgrade anytime',
  },
  {
    name: 'Premium+',
    price: '$39.99',
    cadence: '/ month',
    tagline: 'Go all in.',
    features: [
      { label: 'Unlimited resume tailoring*', included: true },
      { label: 'Unlimited apply-answers*', included: true },
      { label: 'Unlimited auto-submit*', included: true },
      { label: 'Batch tailoring — up to 25 at once', included: true },
      { label: 'Every feature, priority processing', included: true },
      { label: 'Everything in Premium', included: true },
    ],
    cta: 'Upgrade anytime',
  },
];

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn(
        'relative flex flex-col rounded-container border bg-card p-6 shadow-soft',
        plan.featured ? 'border-primary/50 shadow-panel lg:-mt-3 lg:pb-8' : 'border-border',
      )}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: reduce ? 0.15 : 0.24, ease: EASE, delay: reduce ? 0 : index * 0.08 }}
    >
      {plan.featured && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-soft">
          <Sparkles className="h-3 w-3" aria-hidden /> Most popular
        </span>
      )}

      <h3 className="font-display text-h2 font-bold text-foreground">{plan.name}</h3>
      <p className="mt-1 text-caption text-muted-foreground">{plan.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-extrabold tabular-nums text-foreground">{plan.price}</span>
        <span className="text-caption text-muted-foreground">{plan.cadence}</span>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((f) => (
          <li key={f.label} className="flex items-start gap-2.5 text-caption">
            {f.included ? (
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <Minus className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
              </span>
            )}
            <span className={cn(f.included ? 'text-foreground' : 'text-muted-foreground line-through')}>{f.label}</span>
          </li>
        ))}
      </ul>

      <Link
        to="/register"
        className={cn(
          'mt-7 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-control px-4 text-sm font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          plan.featured
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-border bg-card text-foreground hover:bg-accent',
        )}
      >
        {plan.cta}
        {plan.featured && <ArrowRight className="h-4 w-4" aria-hidden />}
      </Link>
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 border-t border-border bg-card/40 py-20 sm:py-28">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            Start free. Upgrade when it&apos;s working.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Billing isn&apos;t live yet — create a free account today and move up the moment you&apos;re ready. No card, no
            countdown.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl items-start gap-5 sm:gap-6 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <PlanCard key={p.name} plan={p} index={i} />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">*</span> Effectively unlimited — generous fair-use soft caps
          keep the platform fast for everyone. Honest limits, no surprises.
        </p>
      </Container>
    </section>
  );
}

export default Pricing;
