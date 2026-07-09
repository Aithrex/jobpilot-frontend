/**
 * The hero recommended action (Compass §6.2).
 *
 * The dashboard hero is NOT a chart — it's ONE action chosen by a small ranker
 * over what matters most right now: OPT urgency, the user's strongest match,
 * sponsorship evidence, a ready-to-submit queue, or (for a brand-new user) the
 * single highest-leverage next step. One confident card, one primary button,
 * copy that's personal ("They sponsored 63 H-1Bs" beats "3 new jobs").
 *
 * Tone is calm by design: the OPT-priority variant uses warning (amber), never
 * an alarm-red screaming countdown.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, Target, CalendarClock, Send, Sparkles, Upload, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardCtx, NavKey } from './types';
import { EASE } from './types';
import type { Tone } from './primitives';
import { MetaChip } from './primitives';
import { topMatch, readyToSubmit, isVisaUser, hasBaseResume } from './selectors';

interface HeroMeta {
  label: string;
  tone?: Tone;
}

export interface HeroActionModel {
  key: string;
  tone: 'primary' | 'warning';
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  detail?: string;
  meta: HeroMeta[];
  ctaLabel: string;
  onCta: () => void;
  /** Optional quieter secondary link. */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/**
 * The ranker. Walks a short priority ladder and returns the single best action.
 * Earlier branches win; every branch produces personalized copy.
 */
export function pickHeroAction(ctx: DashboardCtx): HeroActionModel {
  const clock = ctx.optClock;
  const queue = readyToSubmit(ctx);
  const match = topMatch(ctx);
  const onVisa = isVisaUser(ctx);

  // 1) OPT runway is genuinely urgent → protect it. Calm, precise, amber.
  if (clock && clock.status_band === 'urgent' && clock.days_remaining != null) {
    const d = Math.max(clock.days_remaining, 0);
    const hasQueue = queue.length > 0;
    return {
      key: 'opt-urgent',
      tone: 'warning',
      icon: CalendarClock,
      eyebrow: 'OPT priority',
      title: `${d} ${plural(d, 'unemployment day', 'unemployment days')} of runway left`,
      detail: hasQueue
        ? `Submit the ${queue.length} ${plural(queue.length, 'application', 'applications')} you've already lined up — the fastest way to protect your clock.`
        : 'Focus this week on sponsor-friendly roles. Confirm every date with your DSO.',
      meta: clock.key_dates.slice(0, 1).map((k) => ({ label: k.label, tone: 'warning' as Tone })),
      ctaLabel: hasQueue ? 'Submit your queue' : 'Find sponsor roles',
      onCta: () => ctx.navigate(hasQueue ? 'applications' : 'jobs'),
      secondaryLabel: 'Review OPT clock',
      onSecondary: () => ctx.navigate('visa'),
    };
  }

  // 2) A strong, specific match exists → apply to it. The example hero.
  if (match) {
    const j = match.job_data;
    const score = Math.round(j.match_score || 0);
    const sponsor = j.sponsorship;
    const meta: HeroMeta[] = [];
    if (score > 0) meta.push({ label: `${score}% match`, tone: 'primary' });
    if (onVisa && sponsor && (sponsor.band === 'strong' || sponsor.band === 'moderate')) {
      meta.push({
        label: sponsor.approvals_5y > 0 ? `${sponsor.approvals_5y} H-1Bs sponsored` : 'Sponsor-friendly',
        tone: 'success',
      });
    }
    if (j.posted_text) meta.push({ label: j.posted_text, tone: 'default' });
    const matched = (j.matched_skills || []).length;
    const detail =
      onVisa && sponsor && sponsor.summary
        ? sponsor.summary
        : matched > 0
          ? `${matched} of your skills line up with what they're hiring for.`
          : 'One of your strongest saved matches — worth an application today.';
    return {
      key: 'top-match',
      tone: 'primary',
      icon: Target,
      eyebrow: 'Top match for you',
      title: `Apply to ${j.company}${j.title ? ` — ${j.title}` : ''}`,
      detail,
      meta,
      ctaLabel: 'Open & apply',
      onCta: () => {
        if (j.apply_link) window.open(j.apply_link, '_blank', 'noopener,noreferrer');
        else ctx.navigate('jobs');
      },
      secondaryLabel: 'See all matches',
      onSecondary: () => ctx.navigate('jobs'),
    };
  }

  // 3) A ready-to-submit queue but no scored match surfaced → clear the queue.
  if (queue.length > 0) {
    return {
      key: 'ready-to-submit',
      tone: 'primary',
      icon: Send,
      eyebrow: 'Ready to submit',
      title: `${queue.length} ${plural(queue.length, 'application is', 'applications are')} ready to send`,
      detail: "You've saved these — submitting today keeps your momentum and your pipeline warm.",
      meta: [{ label: `${queue.length} queued`, tone: 'primary' }],
      ctaLabel: 'Review & submit',
      onCta: () => ctx.navigate('applications'),
    };
  }

  // 4) Brand-new user with no resume → the highest-leverage first step.
  if (!hasBaseResume(ctx)) {
    return {
      key: 'upload-resume',
      tone: 'primary',
      icon: Upload,
      eyebrow: 'Start here',
      title: 'Add your resume to unlock JobPilot',
      detail: 'Everything — matches, tailoring, your readiness score, and your OPT clock — builds on your resume. It takes a minute.',
      meta: [],
      ctaLabel: 'Add your resume',
      onCta: () => ctx.navigate('tailor'),
      secondaryLabel: 'Set your target role',
      onSecondary: () => ctx.navigate('profile'),
    };
  }

  // 5) The Compass already computed a single next step → use it verbatim.
  if (ctx.readiness?.next_step) {
    const step = ctx.readiness.next_step;
    return {
      key: 'next-step',
      tone: 'primary',
      icon: Compass,
      eyebrow: 'Your next step',
      title: step.label,
      detail: step.description,
      meta: ctx.readiness.target_role ? [{ label: ctx.readiness.target_role, tone: 'primary' }] : [],
      ctaLabel: "Let's do it",
      onCta: () => ctx.navigate(step.cta_tab as NavKey),
    };
  }

  // 6) Nothing yet → invite the first search.
  return {
    key: 'first-search',
    tone: 'primary',
    icon: Sparkles,
    eyebrow: 'Get started',
    title: 'Find roles that actually fit you',
    detail: 'Run your first search and JobPilot will start scoring matches, sponsorship, and skill gaps for you.',
    meta: [],
    ctaLabel: 'Search jobs',
    onCta: () => ctx.navigate('jobs'),
  };
}

export function HeroAction({ ctx }: { ctx: DashboardCtx }) {
  const reduce = useReducedMotion();
  const action = pickHeroAction(ctx);
  const Icon = action.icon;
  const warning = action.tone === 'warning';

  return (
    <motion.section
      key={action.key}
      aria-label="Recommended next action"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-7',
        warning ? 'mesh-warning border-warning/40 border-l-2 border-l-warning' : 'mesh-accent border-primary/20',
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 lg:max-w-2xl">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider',
              warning ? 'text-warning' : 'text-primary',
            )}
          >
            <Icon className="h-3.5 w-3.5" /> {action.eyebrow}
          </div>
          <h2 className="mt-2 text-balance font-display text-xl font-extrabold leading-tight tracking-tight sm:text-[1.6rem]">
            {action.title}
          </h2>
          {action.detail && (
            <p className="mt-2 max-w-prose text-balance text-sm leading-relaxed text-muted-foreground">
              {action.detail}
            </p>
          )}
          {action.meta.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {action.meta.map((m, i) => (
                <MetaChip key={i} tone={m.tone}>
                  {m.label}
                </MetaChip>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          <button
            type="button"
            onClick={action.onCta}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {action.ctaLabel} <ArrowRight className="h-4 w-4" />
          </button>
          {action.secondaryLabel && action.onSecondary && (
            <button
              type="button"
              onClick={action.onSecondary}
              className="rounded text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {action.secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export default HeroAction;
