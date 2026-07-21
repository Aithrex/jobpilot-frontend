import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
 * "Coming next" — the roadmap, kept visually and structurally separate from
 * the shipped product above it.
 *
 * Every guardrail here is load-bearing, not decoration:
 *  - Nothing is called an autonomous agent. Auto Apply is approval-first, and
 *    the copy says so before it says anything else.
 *  - No application counts, success rates, employer names or ATS logos appear,
 *    because none of those numbers exist.
 *  - The WhatsApp panel describes opt-in alerts and approval requests the user
 *    asked for — never recruiter outreach — and never implies Meta endorses
 *    Aspirely.
 *  - The only action offered is creating an account. There is no waitlist
 *    table in the backend, so no control here may claim someone joined one.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

function Guardrails({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-1.5">
      {items.map((g) => (
        <li key={g} className="flex items-start gap-2 text-[13px] text-muted-foreground">
          <ShieldCheck className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-400/70" aria-hidden />
          <span>{g}</span>
        </li>
      ))}
    </ul>
  );
}

function PreviewFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-black/25 p-3">
      <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground/50">
        {label}
      </span>
      {children}
    </div>
  );
}

/** Redacted job card — no company, no title, no score. */
function RedactedCard({ state }: { state: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2">
      <span aria-hidden className="h-6 w-6 shrink-0 rounded bg-foreground/10" />
      <span className="min-w-0 flex-1 space-y-1">
        <span aria-hidden className="block h-[5px] w-[70%] rounded-full bg-foreground/25" />
        <span aria-hidden className="block h-[5px] w-[45%] rounded-full bg-foreground/15" />
      </span>
      <span className="shrink-0 rounded-full border border-[hsl(var(--brand-to)/0.35)] bg-[hsl(var(--brand-to)/0.12)] px-2 py-[2px] text-[10px] font-semibold text-[hsl(var(--brand-to))]">
        {state}
      </span>
    </div>
  );
}

/** ── 1. Auto Apply ── */
function AutoApplyPreview() {
  return (
    <PreviewFrame label="Concept preview">
      <div className="space-y-2">
        <RedactedCard state="Ready to apply" />

        {/* The approval gate — the whole point of the feature. */}
        <div className="flex items-center justify-between rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-2.5 py-2">
          <span className="text-[11px] font-medium text-amber-200/90">
            Waiting for your approval
          </span>
          <span className="flex gap-1.5">
            <span className="rounded-md bg-white/10 px-2 py-[3px] text-[10px] font-semibold text-foreground/70">
              Decline
            </span>
            <span className="rounded-md bg-[hsl(var(--brand-to))] px-2 py-[3px] text-[10px] font-semibold text-white">
              Approve
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
          <span className="text-[11px] font-medium text-emerald-200/90">
            Submitted · pipeline updated
          </span>
        </div>
      </div>
    </PreviewFrame>
  );
}

/** ── 2. WhatsApp alerts and approvals ── */
function WhatsAppPreview() {
  return (
    <PreviewFrame label="Concept preview">
      <div className="space-y-1.5">
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-white/[0.08] bg-white/[0.05] px-3 py-2">
          <span className="block text-[11px] font-medium text-foreground/85">
            An application is ready for your approval.
          </span>
          <span aria-hidden className="mt-1.5 block h-[5px] w-[60%] rounded-full bg-foreground/15" />
        </div>
        <div className="flex gap-1.5 pl-1">
          {['Review', 'Approve', 'Decline'].map((a) => (
            <span
              key={a}
              className="rounded-full border border-white/[0.10] bg-white/[0.05] px-2.5 py-[3px] text-[10px] font-semibold text-foreground/70"
            >
              {a}
            </span>
          ))}
        </div>
        <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-sm border border-[hsl(var(--brand-to)/0.3)] bg-[hsl(var(--brand-to)/0.12)] px-3 py-2">
          <span className="block text-[11px] font-medium text-foreground/85">Approve</span>
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-white/[0.08] bg-white/[0.05] px-3 py-2">
          <span className="block text-[11px] font-medium text-foreground/85">
            Sent. Your pipeline is up to date.
          </span>
        </div>
      </div>
    </PreviewFrame>
  );
}

interface MomentProps {
  cap: Capability;
  icon: typeof Send;
  secondaryLabel?: string;
  guardrails: string[];
  preview: React.ReactNode;
  reverse?: boolean;
}

function Moment({ cap, icon: Icon, secondaryLabel, guardrails, preview, reverse }: MomentProps) {
  return (
    <Reveal>
      <div
        className={cn(
          'grid items-center gap-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 sm:p-6 lg:grid-cols-2 lg:gap-10',
        )}
      >
        <div className={cn('min-w-0', reverse && 'lg:order-2')}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06]">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </span>
            <h3 className="text-lg font-bold tracking-[-0.01em] text-foreground">{cap.name}</h3>
            <StatusBadge status={cap.status} className="text-[10px]" />
            {secondaryLabel && (
              <span className="rounded-full border border-white/12 bg-white/[0.05] px-1.5 py-[1px] text-[10px] font-semibold text-muted-foreground">
                {secondaryLabel}
              </span>
            )}
          </div>

          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{cap.blurb}</p>

          <Guardrails items={guardrails} />

          <p className="mt-5 text-[13px] text-muted-foreground">
            {NO_WAITLIST_CTA}{' '}
            <Link
              to="/register"
              className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Create a free account
            </Link>
          </p>
        </div>

        <div className={cn('min-w-0', reverse && 'lg:order-1')}>{preview}</div>
      </div>
    </Reveal>
  );
}

export function ComingNext() {
  return (
    <section
      id="coming-next"
      aria-labelledby="coming-next-heading"
      className="relative scroll-mt-24 border-t border-white/[0.06] py-16 sm:py-20"
    >
      <Container>
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
            Coming next
          </p>
          <h2
            id="coming-next-heading"
            className="mt-2 max-w-2xl text-balance font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl"
          >
            From matched to applied.
          </h2>
          <p className="mt-3 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            Aspirely is growing from a career workspace into an approval-first
            application assistant. Nothing below is available yet.
          </p>
        </Reveal>

        <div className="mt-9 space-y-5">
          <Moment
            cap={AUTO_APPLY}
            icon={Send}
            secondaryLabel="Approval-first"
            guardrails={[
              'Supported applications only — we will never claim to apply everywhere.',
              'Your approval is required for every submission. No silent sending.',
              'Not every employer or ATS can be supported.',
            ]}
            preview={<AutoApplyPreview />}
          />

          <Moment
            cap={WHATSAPP}
            icon={MessageCircle}
            reverse
            guardrails={[
              'Explicit opt-in, with confirmation before anything is sent.',
              'Quiet hours, rate limits and one-tap unsubscribe.',
              'Only messages about your own applications — never recruiter outreach, never anyone else contacted on your behalf.',
            ]}
            preview={<WhatsAppPreview />}
          />
        </div>

        {/* Secondary roadmap — deliberately a weaker status than the two above. */}
        <Reveal>
          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <span className="text-[13px] font-medium text-muted-foreground/70">
              Also on the roadmap:
            </span>
            {ROADMAP_SECONDARY.map((cap) => (
              <span key={cap.id} className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-foreground/75">{cap.name}</span>
                <StatusBadge status={cap.status} />
              </span>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

/** Exported for the dock's concept-preview affordance. */
export const ROADMAP_STATUS_TEXT = STATUS_LABEL;

/* eslint-disable-next-line react-refresh/only-export-components */
export default ComingNext;
