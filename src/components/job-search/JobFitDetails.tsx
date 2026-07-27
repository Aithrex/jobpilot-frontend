import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Crosshair,
  FileSearch,
  Info,
  Layers3,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GuestFitBreakdown, normalizeFit } from '@/components/guest/GuestFitBreakdown';
import { cn } from '@/lib/utils';
import { disclosure } from '@/lib/motion';
import {
  AUTO_APPLY_GATE,
  FEASIBILITY_META,
  SENIORITY_LABEL,
  fitBand,
  isScored,
} from './fitBands';
import type { Job } from '@/types/jobs';

/**
 * "Why this score" - the score's receipts.
 *
 * A bare number is a mystery and a mystery is not actionable. Every claim in
 * here is rendered from a field the SERVER sent; nothing is inferred, nothing
 * is averaged client-side, and when a signal is missing its row simply does not
 * render rather than showing a plausible-looking blank.
 *
 * Evidence, in the order a person actually asks for it:
 *   1. The verdict - number, band label, and what the band MEANS.
 *   2. Role read - is this even my kind of job, at my level?
 *   3. Skills matched - the positive evidence, in full.
 *   4. Requirements my resume does not show - framed as read off the posting,
 *      never as a judgement of the person.
 *   5. The full component breakdown, when a FitScore v2 block is present.
 *
 * The unscored case is a first-class state: score 0 out of the engine means it
 * DECLINED to score (no readable resume, or an unreadable posting), and we say
 * that plainly with the fix attached.
 */

const MAX_INLINE_SKILLS = 12;

function SkillChips({
  items,
  tone,
  emptyNote,
}: {
  items: string[];
  tone: 'matched' | 'missing';
  emptyNote?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) {
    return emptyNote ? <p className="text-caption text-muted-foreground">{emptyNote}</p> : null;
  }
  const shown = expanded ? items : items.slice(0, MAX_INLINE_SKILLS);
  const hidden = items.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((skill) => (
        <span
          key={skill}
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
            tone === 'matched'
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-warning/30 bg-warning/10 text-warning',
          )}
        >
          {tone === 'matched' ? (
            <Check className="h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
          )}
          {skill}
        </span>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="interactive rounded-md px-1 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          +{hidden} more
        </button>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Crosshair;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {title}
      </h4>
      {children}
    </section>
  );
}

export interface JobFitDetailsProps {
  job: Job;
  /** Rendered inside a popover (compact) vs inline in an expanded card. */
  className?: string;
}

/** The explanation body. Reused by the popover and by any inline placement. */
export function JobFitDetails({ job, className }: JobFitDetailsProps) {
  const band = fitBand(job.match_score);
  const scored = isScored(job.match_score);
  const matched = job.matched_skills ?? [];
  const missing = job.missing_skills ?? [];
  const fit = normalizeFit(job.fit);

  const seniorityLabel = job.seniority ? SENIORITY_LABEL[job.seniority] : undefined;
  const feasibility = job.tailor_feasibility
    ? FEASIBILITY_META[job.tailor_feasibility]
    : undefined;

  const hasRoleRead = Boolean(seniorityLabel || job.title_matched || feasibility);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 1. The verdict, in words. */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
              band.chip,
            )}
          >
            {band.label}
          </span>
          {scored && (
            <span className="font-mono text-caption tabular-nums text-muted-foreground">
              {Math.round(job.match_score)} / 100
            </span>
          )}
        </div>
        <p className="text-caption leading-relaxed text-muted-foreground">{band.meaning}</p>
      </div>

      {!scored ? (
        /* The honest "no verdict" state, with the fix attached. */
        <div className="space-y-2 rounded-control border border-dashed border-border bg-muted/40 p-3">
          <p className="text-caption leading-relaxed text-foreground">
            A fit score compares this posting&apos;s stated requirements against your resume. We
            could not do that here, usually because there is no parsed resume on your account yet,
            or because this employer&apos;s posting did not publish readable requirements.
          </p>
          <Link
            to="/app/resume/library"
            className="interactive inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border bg-card px-3 text-caption font-semibold text-foreground"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Add or check your resume
          </Link>
        </div>
      ) : (
        <>
          {/* 2. Role and level read. */}
          {hasRoleRead && (
            <Section icon={Crosshair} title="Role read">
              <div className="flex flex-wrap gap-1.5">
                {job.title_matched && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    <Check className="h-3 w-3" aria-hidden />
                    Title matches your target roles
                  </span>
                )}
                {seniorityLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Layers3 className="h-3 w-3" aria-hidden />
                    {seniorityLabel}
                  </span>
                )}
                {feasibility && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      feasibility.chip,
                    )}
                    title={job.feasibility_reason || undefined}
                  >
                    <FileSearch className="h-3 w-3" aria-hidden />
                    {feasibility.label}
                  </span>
                )}
              </div>
              {job.feasibility_reason && (
                <p className="text-caption leading-relaxed text-muted-foreground">
                  {job.feasibility_reason}
                </p>
              )}
            </Section>
          )}

          {/* 3. Positive evidence. */}
          <Section icon={Check} title={`Skills matched (${matched.length})`}>
            <SkillChips
              items={matched}
              tone="matched"
              emptyNote="No overlapping skills were found between this posting and your resume."
            />
          </Section>

          {/* 4. Gaps - phrased as the posting's asks, not the person's flaws. */}
          {missing.length > 0 && (
            <Section icon={AlertTriangle} title={`Asked for, not evidenced (${missing.length})`}>
              <SkillChips items={missing} tone="missing" />
              <p className="text-caption leading-relaxed text-muted-foreground">
                Read off this posting, not a judgement of your experience. Tailoring can surface any
                of these you actually have.
              </p>
            </Section>
          )}
        </>
      )}

      {/* 5. The full server breakdown, when the v2 block travelled with the row. */}
      {fit && <GuestFitBreakdown fit={fit} />}

      <p className="flex items-start gap-1.5 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        <span>
          Scored 0-100 against the requirements this posting actually published.{' '}
          {AUTO_APPLY_GATE} and above is the bar Auto-Apply uses to queue a role.
        </span>
      </p>
    </div>
  );
}

/**
 * The card-level affordance: a small "Why this score" button that opens the
 * evidence in a popover. A real `<button>` inside Radix's Popover, so it is
 * keyboard-operable, Escape-dismissable and focus-returning for free.
 */
export function WhyThisScoreButton({ job, className }: { job: Job; className?: string }) {
  const [open, setOpen] = useState(false);
  const band = fitBand(job.match_score);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Why this score: ${band.label}`}
          className={cn(
            'interactive inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground',
            className,
          )}
        >
          Why this score
          <ChevronDown
            className={cn('h-3 w-3 transition-transform duration-fast ease-standard', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-4"
      >
        <JobFitDetails job={job} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Inline disclosure variant for surfaces that have vertical room (an expanded
 * card, a detail pane) and should not trap the evidence behind a popover.
 */
export function JobFitDisclosure({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="interactive inline-flex min-h-11 items-center gap-1 rounded-control px-1 text-caption font-semibold text-muted-foreground hover:text-foreground"
      >
        Why this score
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-fast ease-standard', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="fit" {...disclosure(reduce)} className="overflow-hidden">
            <div className="pt-3">
              <JobFitDetails job={job} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
