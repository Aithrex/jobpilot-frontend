import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { MessageCircle, Send, ShieldCheck, type LucideIcon } from 'lucide-react';
import {
  AUTO_APPLY,
  NO_WAITLIST_CTA,
  ROADMAP_SECONDARY,
  STATUS_LABEL,
  WHATSAPP,
  type Capability,
} from '@/lib/capabilities';
import { cn } from '@/lib/utils';
import { StatusBadge } from './workspace/CapabilityDock';
import { Container, EASE, Reveal } from './_shared';

/**
 * "Coming next" - the roadmap, deliberately the QUIETEST movement on the page,
 * but no longer a static block. A spotlight rotates between the two cards on its
 * own (pausing on hover, off under reduced motion), so the section breathes
 * without ever reading as a live, usable surface.
 *
 * Every guardrail here is load-bearing, not decoration:
 *  - Nothing is called an autonomous agent. Auto Apply is approval-first, and
 *    the copy says so before it says anything else.
 *  - No application counts, success rates, employer names or ATS logos appear.
 *  - The WhatsApp line describes opt-in alerts and approval requests the user
 *    asked for - never recruiter outreach - and never implies Meta is involved.
 *  - The only action offered is creating an account. There is no waitlist.
 *  - No padlock: a lock reads "pay to unlock", and none of this is purchasable.
 */

interface RoadmapEntry {
  cap: Capability;
  icon: LucideIcon;
  /** The single defining constraint, shown next to the status. */
  qualifier: string;
  guardrails: readonly string[];
}

const ROADMAP: readonly RoadmapEntry[] = [
  {
    cap: AUTO_APPLY,
    icon: Send,
    qualifier: 'Approval-first',
    guardrails: [
      'Your approval is required for every submission, with no silent sending',
      'supported applications only',
    ],
  },
  {
    cap: WHATSAPP,
    icon: MessageCircle,
    qualifier: 'Explicit opt-in',
    guardrails: [
      'Explicit opt-in with confirmation, quiet hours and one-tap unsubscribe',
      'only messages about your own applications, never recruiter outreach',
    ],
  },
] as const;

const SPOTLIGHT_MS = 3400;

function RoadmapItem({
  entry,
  active,
  onHover,
}: {
  entry: RoadmapEntry;
  active: boolean;
  onHover: (hovering: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const { cap, icon: Icon, qualifier, guardrails } = entry;
  return (
    <motion.li
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      animate={{ opacity: active ? 1 : 0.72 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 transition-colors duration-500 sm:p-5',
        active
          ? 'border-[hsl(var(--brand-to)/0.45)] bg-muted/70'
          : 'border-border bg-muted/50',
      )}
    >
      {/* The energy hairline, brighter while the card holds the spotlight. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px transition-opacity duration-500"
        style={{
          opacity: active ? 1 : 0.45,
          background:
            'linear-gradient(to right, transparent, hsl(var(--brand-to) / 0.75), transparent)',
        }}
      />
      {/* A soft bloom that breathes only on the active card (still under motion). */}
      {active && !reduce && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(closest-side, hsl(var(--brand-to) / 0.16), transparent 70%)',
          }}
        />
      )}
      <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span
          className={cn(
            'grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-background transition-colors duration-500',
            active ? 'text-[hsl(var(--brand-to))]' : 'text-muted-foreground',
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="text-[15px] font-bold tracking-[-0.01em] text-foreground">{cap.name}</h3>
        <StatusBadge status={cap.status} className="text-[10px]" />
        <span className="rounded-full border border-border bg-background px-1.5 py-[1px] text-[10px] font-semibold text-muted-foreground">
          {qualifier}
        </span>
      </div>

      <p className="relative mt-2.5 text-[14px] leading-relaxed text-muted-foreground">{cap.blurb}</p>

      <p className="relative mt-2.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-[2px] h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
        <span>{guardrails.join(' · ')}</span>
      </p>
    </motion.li>
  );
}

export function ComingNext() {
  const reduce = !!useReducedMotion();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(sectionRef, { margin: '-20% 0px' });
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? active;

  useEffect(() => {
    if (reduce || !inView || hover !== null) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % ROADMAP.length), SPOTLIGHT_MS);
    return () => window.clearInterval(id);
  }, [reduce, inView, hover]);

  return (
    <section
      id="coming-next"
      aria-labelledby="coming-next-heading"
      className="relative scroll-mt-24 pb-16 sm:pb-20 lg:pb-24"
    >
      <Container>
        <div className="rule-fade" />
        <div ref={sectionRef} className="mt-10 grid gap-6 lg:mt-12 lg:grid-cols-12 lg:gap-10">
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
              {ROADMAP.map((entry, i) => (
                <RoadmapItem
                  key={entry.cap.id}
                  entry={entry}
                  active={reduce ? true : i === display}
                  onHover={(hovering) => setHover(hovering ? i : null)}
                />
              ))}
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
