import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, MessageCircle, Send, ShieldCheck, type LucideIcon } from 'lucide-react';
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
import { Container, EASE, Reveal, Section } from './_shared';

/**
 * "Coming next" - the roadmap. Still the QUIETEST movement on the page, but it
 * is no longer a paragraph in a box.
 *
 * The problem it had: two features described only in prose, in a flat list,
 * with the single most important fact about both of them - that YOU approve
 * every action - buried in a run-on guardrail sentence at the bottom of each
 * row. It read as filler, so it got skipped, so the guardrails nobody read were
 * doing no work at all.
 *
 * What it does now: each card SHOWS the shape of the interaction it is
 * promising - an approval request you accept or decline, a message thread you
 * opted into - so "approval-first" is something a visitor sees in two seconds
 * instead of a phrase they take on faith. The guardrails became individual
 * checked lines, because four short verifiable statements are read and one long
 * comma-spliced one is not.
 *
 * Every guardrail here is load-bearing, not decoration:
 *  - Nothing is called an autonomous agent. Auto Apply is approval-first, and
 *    the copy says so before it says anything else.
 *  - No application counts, success rates, employer names or ATS logos appear.
 *  - The WhatsApp line describes opt-in alerts and approval requests the user
 *    asked for - never recruiter outreach - and never implies Meta is involved.
 *  - The only action offered is creating an account. There is no waitlist.
 *  - No padlock: a lock reads "pay to unlock", and none of this is purchasable.
 *  - The mini-illustrations are redacted structure and are aria-hidden: they
 *    restate, in shapes, what the text above them already says in words. They
 *    contain no control that can be operated and no invented content.
 */

interface RoadmapEntry {
  cap: Capability;
  icon: LucideIcon;
  /** The single defining constraint, shown next to the status. */
  qualifier: string;
  guardrails: readonly string[];
  /** The redacted shape of the interaction being promised. */
  Preview: () => JSX.Element;
}

/* ── Redacted preview primitives ─────────────────────────────────── */

function Bar({ w, lit }: { w: string; lit?: boolean }) {
  return (
    <span
      style={{ width: w }}
      className={cn('block h-[5px] rounded-full', lit ? 'bg-foreground/35' : 'bg-foreground/15')}
    />
  );
}

/**
 * Auto Apply: one application waiting on a decision. The two responses are
 * inert shapes, not buttons - the whole block is aria-hidden and nothing in it
 * can be focused, so it can never be mistaken for a live control.
 */
function ApprovalPreview() {
  return (
    <div
      aria-hidden
      className="relative mt-4 rounded-xl border border-border bg-background/70 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5)]"
      style={{
        backgroundImage:
          'radial-gradient(hsl(var(--foreground) / 0.045) 1px, transparent 1px)',
        backgroundSize: '10px 10px',
      }}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Waiting for you
      </p>
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
        <span className="h-6 w-6 shrink-0 rounded bg-foreground/10" />
        <span className="min-w-0 flex-1 space-y-1">
          <Bar w="72%" lit />
          <Bar w="48%" />
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-[3px] text-[10px] font-semibold text-success">
          <Check className="h-3 w-3" />
          Approve
        </span>
        <span className="rounded-md border border-border bg-muted px-2 py-[3px] text-[10px] font-semibold text-muted-foreground">
          Not this one
        </span>
      </div>
    </div>
  );
}

/**
 * WhatsApp: a thread you asked for. One inbound alert, one reply from you.
 * Redacted, aria-hidden, and carrying no phone number, contact or brand mark.
 */
function ThreadPreview() {
  return (
    <div
      aria-hidden
      className="relative mt-4 rounded-xl border border-border bg-background/70 p-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.5)]"
      style={{
        backgroundImage:
          'radial-gradient(hsl(var(--foreground) / 0.045) 1px, transparent 1px)',
        backgroundSize: '10px 10px',
      }}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Only if you opt in
      </p>
      <div className="mt-2 space-y-1.5">
        <span className="block w-[80%] space-y-1 rounded-lg rounded-tl-sm border border-border bg-muted/60 p-2">
          <Bar w="86%" lit />
          <Bar w="58%" />
        </span>
        <span className="ml-auto block w-[62%] space-y-1 rounded-lg rounded-tr-sm border border-success/25 bg-success/10 p-2">
          <Bar w="72%" lit />
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="flex h-[14px] w-[24px] items-center rounded-full bg-success/25 p-[2px]">
          <span className="ml-auto h-[10px] w-[10px] rounded-full bg-success" />
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">Quiet hours on</span>
      </div>
    </div>
  );
}

const ROADMAP: readonly RoadmapEntry[] = [
  {
    cap: AUTO_APPLY,
    icon: Send,
    qualifier: 'Beta · mode-gated',
    guardrails: [
      'Prepare only never submits; Ask me first waits for your approval; Apply within my rules submits inside the daily limit you set',
      'Workday and other multi-step ATS may still hit account/OTP walls',
    ],
    Preview: ApprovalPreview,
  },
  {
    cap: WHATSAPP,
    icon: MessageCircle,
    qualifier: 'Explicit opt-in',
    guardrails: [
      'Explicit opt-in, quiet hours, one-tap unsubscribe',
      'Only your own applications, never recruiter outreach',
    ],
    Preview: ThreadPreview,
  },
] as const;

const SPOTLIGHT_MS = 3800;

/**
 * The secondary row states its items' status ONCE, in its own label, when they
 * all share one - "Also planned: SMS alerts, Web and mobile push" needs no
 * further badges. Derived from the registry rather than typed, so the label can
 * never claim a readiness the data does not have; if the two ever diverge, this
 * falls back to a neutral heading and each item carries its own badge again.
 */
const sharedSecondaryStatus =
  ROADMAP_SECONDARY.length > 0 &&
  ROADMAP_SECONDARY.every((c) => c.status === ROADMAP_SECONDARY[0].status)
    ? ROADMAP_SECONDARY[0].status
    : null;

const secondaryLabel = sharedSecondaryStatus
  ? `Also ${STATUS_LABEL[sharedSecondaryStatus].toLowerCase()}:`
  : 'Also on the roadmap:';

function RoadmapCard({
  entry,
  active,
  onHover,
}: {
  entry: RoadmapEntry;
  active: boolean;
  onHover: (hovering: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const { cap, icon: Icon, qualifier, guardrails, Preview } = entry;

  return (
    <motion.li
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      animate={reduce ? undefined : { y: active ? -4 : 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-colors duration-500',
        active
          ? 'border-[hsl(var(--brand-to)/0.45)] bg-card shadow-pop'
          : 'border-border bg-muted/40',
      )}
    >
      {/* The energy hairline, brighter while the card holds the spotlight. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px transition-opacity duration-500"
        style={{
          opacity: active ? 1 : 0.35,
          background:
            'linear-gradient(to right, transparent, hsl(var(--brand-to) / 0.75), transparent)',
        }}
      />
      {/* A soft bloom that breathes only on the spotlit card. Decorative, so
          it is aria-hidden and stops entirely under reduced motion. */}
      {active && !reduce && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 3.2, ease: 'easeInOut', repeat: Infinity }}
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, hsl(var(--brand-to) / 0.18), transparent 70%)',
          }}
        />
      )}

      <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-xl border transition-colors duration-500',
            active
              ? 'border-[hsl(var(--brand-to)/0.35)] bg-[hsl(var(--brand-to)/0.12)] text-[hsl(var(--brand-to))] shadow-[0_0_0_4px_hsl(var(--brand-to)/0.06)]'
              : 'border-border bg-background text-muted-foreground',
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <h3 className="text-[15px] font-bold tracking-[-0.01em] text-foreground">{cap.name}</h3>
        <StatusBadge status={cap.status} className="text-[10px]" />
        <span className="rounded-full border border-border bg-background px-1.5 py-[1px] text-[10px] font-semibold text-muted-foreground">
          {qualifier}
        </span>
      </div>

      <p className="relative mt-3 text-[14px] leading-relaxed text-muted-foreground">{cap.blurb}</p>

      <Preview />

      {/* Short checkable statements beat one long guardrail sentence: these
          are the promises, so they have to be readable at a glance. */}
      <ul className="relative mt-4 space-y-1.5 border-t border-border pt-3">
        {guardrails.map((g) => (
          <li
            key={g}
            className="flex items-start gap-1.5 text-[12px] leading-relaxed text-muted-foreground"
          >
            <ShieldCheck className="mt-[2px] h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
            {g}
          </li>
        ))}
      </ul>
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
    <Section id="coming-next" labelledBy="coming-next-heading">
      <Container>
        {/* The boundary above this section is drawn by the page's shared
            `SectionRule`, like every other boundary. There used to be a second
            `rule-fade` here as well, so the roadmap was fenced off by two
            hairlines a few pixels apart while every other seam had one. */}
        <div ref={sectionRef}>
          <Reveal className="max-w-2xl">
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
              Aspirely is growing into an application assistant you control. You pick how much it
              may do: prepare only, prepare and wait for your approval, or submit inside a daily
              limit you set. Sensitive fields still stop and ask you.
            </p>
          </Reveal>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {ROADMAP.map((entry, i) => (
              <RoadmapCard
                key={entry.cap.id}
                entry={entry}
                active={reduce ? true : i === display}
                onHover={(hovering) => setHover(hovering ? i : null)}
              />
            ))}
          </ul>

          {/* Secondary roadmap - a deliberately weaker status than the two
              above, on one line so it can never out-weigh shipped product.

              Same two-column grid as the cards, so "Also planned" sits under
              the first card and the account line starts exactly where the
              SECOND card starts. Pushing the CTA to the far right with
              `ml-auto` left it floating at a margin nothing else shared. */}
          <Reveal className="mt-4">
            <div className="grid gap-4 text-[13px] sm:grid-cols-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
                <span className="font-medium text-muted-foreground">{secondaryLabel}</span>
                {ROADMAP_SECONDARY.map((cap) => (
                  <span
                    key={cap.id}
                    className="flex items-center gap-1.5 font-semibold text-foreground"
                  >
                    {cap.name}
                    {/* Only when this row's own label cannot speak for the
                        item. Saying "Also planned:" and then stamping every
                        name with a "Planned" chip states the same fact twice
                        in four words. */}
                    {sharedSecondaryStatus === null && <StatusBadge status={cap.status} />}
                  </span>
                ))}
              </div>
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3 text-muted-foreground">
                {NO_WAITLIST_CTA}
                <Link
                  to="/register"
                  className="focus-ring-visible rounded font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Create a free account
                </Link>
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

/** Exported for the dock's concept-preview affordance. */
export const ROADMAP_STATUS_TEXT = STATUS_LABEL;

/* eslint-disable-next-line react-refresh/only-export-components */
export default ComingNext;
