import { Link } from 'react-router-dom';
import { MessageCircle, Send, ShieldCheck } from 'lucide-react';
import {
  AUTO_APPLY,
  NO_WAITLIST_CTA,
  ROADMAP_SECONDARY,
  STATUS_LABEL,
  WHATSAPP,
  type Capability,
} from '@/lib/capabilities';
import { StatusBadge } from './workspace/CapabilityDock';
import { Container, Reveal } from './_shared';

/**
 * "Coming next" - the roadmap, deliberately the QUIETEST movement on the page.
 *
 * This section used to be the tallest thing on the landing: 971px of concept
 * previews for two features that do not work yet, dwarfing the hero. That is
 * an honesty problem before it is a layout problem - the amount of page a
 * feature occupies is itself a claim about how real it is. It is now a short
 * two-item list beside its heading, and the shipped product outweighs it.
 *
 * Every guardrail here is load-bearing, not decoration:
 *  - Nothing is called an autonomous agent. Auto Apply is approval-first, and
 *    the copy says so before it says anything else.
 *  - No application counts, success rates, employer names or ATS logos appear,
 *    because none of those numbers exist.
 *  - The WhatsApp line describes opt-in alerts and approval requests the user
 *    asked for - never recruiter outreach - and never implies Meta is involved.
 *  - The only action offered is creating an account. There is no waitlist table
 *    in the backend, so no control here may claim someone joined one.
 *  - No padlock: a lock reads "pay to unlock", and none of this is purchasable.
 */

interface ItemProps {
  cap: Capability;
  icon: typeof Send;
  /** The single defining constraint, shown next to the status. */
  qualifier: string;
  guardrails: readonly string[];
}

function RoadmapItem({ cap, icon: Icon, qualifier, guardrails }: ItemProps) {
  return (
    <li className="relative overflow-hidden rounded-2xl border border-border bg-muted/50 p-4 sm:p-5">
      {/* A restrained energy hairline: enough to feel like something is coming,
          far too quiet to read as a live, usable surface. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, hsl(var(--brand-to) / 0.55), transparent)',
        }}
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="text-[15px] font-bold tracking-[-0.01em] text-foreground">{cap.name}</h3>
        <StatusBadge status={cap.status} className="text-[10px]" />
        <span className="rounded-full border border-border bg-background px-1.5 py-[1px] text-[10px] font-semibold text-muted-foreground">
          {qualifier}
        </span>
      </div>

      <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">{cap.blurb}</p>

      <p className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-[2px] h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
        <span>{guardrails.join(' · ')}</span>
      </p>
    </li>
  );
}

export function ComingNext() {
  return (
    <section
      id="coming-next"
      aria-labelledby="coming-next-heading"
      className="relative scroll-mt-24 pb-16 sm:pb-20 lg:pb-24"
    >
      <Container>
        <div className="rule-fade" />
        <div className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-12 lg:gap-10">
          <Reveal className="lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Coming next
            </p>
            <h2
              id="coming-next-heading"
              className="mt-3 text-balance font-display text-2xl font-extrabold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-[1.75rem]"
            >
              From matched to applied.
            </h2>
            <p className="mt-3 text-pretty text-[14px] leading-relaxed text-muted-foreground">
              Aspirely is growing into an approval-first application assistant. Nothing below is
              available yet, and none of it will ever act without you.
            </p>
          </Reveal>

          <div className="lg:col-span-8">
            <ul className="space-y-3">
              <RoadmapItem
                cap={AUTO_APPLY}
                icon={Send}
                qualifier="Approval-first"
                guardrails={[
                  'Your approval is required for every submission, with no silent sending',
                  'supported applications only',
                ]}
              />
              <RoadmapItem
                cap={WHATSAPP}
                icon={MessageCircle}
                qualifier="Explicit opt-in"
                guardrails={[
                  'Explicit opt-in with confirmation, quiet hours and one-tap unsubscribe',
                  'only messages about your own applications, never recruiter outreach',
                ]}
              />
            </ul>

            {/* Secondary roadmap - a deliberately weaker status than the two
                above, on one line so it can never out-weigh shipped product. */}
            <Reveal className="mt-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]">
                <span className="font-medium text-muted-foreground">Also planned:</span>
                {ROADMAP_SECONDARY.map((cap) => (
                  <span key={cap.id} className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{cap.name}</span>
                    <StatusBadge status={cap.status} />
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-muted-foreground">
                {NO_WAITLIST_CTA}{' '}
                <Link
                  to="/register"
                  className="focus-ring-visible rounded font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Create a free account
                </Link>
              </p>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}

/** Exported for the dock's concept-preview affordance. */
export const ROADMAP_STATUS_TEXT = STATUS_LABEL;

/* eslint-disable-next-line react-refresh/only-export-components */
export default ComingNext;
