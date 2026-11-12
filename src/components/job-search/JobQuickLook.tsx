import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BookmarkCheck, BookmarkPlus, Building2, ChevronLeft, ChevronRight, CircleOff,
  ExternalLink, Loader2, MapPin, Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { CompanyLogo } from '@/components/CompanyLogo';
import { JobFitDetails } from '@/components/job-search/JobFitDetails';
import { EmployerSponsorshipBadge } from '@/components/job-search/WorkAuthorizationSignals';
import { VisaFlagChips } from '@/components/job-search/JobVisaSignals';
import { fitBandOf } from '@/components/job-search/fitBands';
import { useJobDescription } from '@/hooks/useJobDescription';
import { stagePendingTailorJob } from '@/lib/craftHandoff';
import { postedAgeLabel } from '@/lib/careerJobs';
import { companyTypeLabel } from '@/lib/companyTypes';
import { jobLevelLabel } from '@/lib/jobLevel';
import { legacySponsorshipSignal } from '@/lib/sponsorshipSignal';
import { toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/jobs';

interface JobQuickLookProps {
  job: Job | null;
  onClose: () => void;
  /** Position in the list the panel walks ("3 of 25"). */
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  saved: boolean;
  onSave: () => void | Promise<unknown>;
  onUnsave: () => void | Promise<unknown>;
  onApply: () => void;
  onHide?: () => void;
}

/**
 * The quick look: everything needed to decide on a job without leaving the
 * board. Opens from a card click or Enter; J / K (or the arrows) walk the
 * board's own order (the board's keyboard handler drives it), and closing
 * returns focus to the card, so the list never loses its place.
 *
 * One entrance per container: the sheet slides in, its body does not stagger.
 * Moving to the next job swaps the body with a 120ms cross-fade, because it is
 * a frequent, keyboard-driven action.
 */
export function JobQuickLook({
  job, onClose, index, total, onPrev, onNext, saved, onSave, onUnsave, onApply, onHide,
}: JobQuickLookProps) {
  const reduce = useReducedMotion();
  const { text, loading, error } = useJobDescription(job, !!job);
  const bodyRef = useRef<HTMLDivElement>(null);

  // A new job starts at the top of its description.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [job?.job_id]);

  const open = !!job;
  const level = job ? jobLevelLabel(job) : null;
  const band = job ? fitBandOf(job) : null;
  const typeLabel = job?.company_type ? companyTypeLabel(job.company_type.type) : '';

  const tailor = () => {
    if (!job) return;
    stagePendingTailorJob({
      job_id: job.job_id,
      jd_text: text,
      jd_fetch_failed: !text,
      title: job.title,
      company: job.company,
      url: job.apply_link || '',
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/30 backdrop-blur-[2px]"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl data-[state=open]:duration-slow data-[state=closed]:duration-base ease-decelerate"
        data-testid="job-quick-look"
      >
        {job && level && band && (
          <>
            <div className="border-b border-border/60 px-5 pb-4 pt-5 pr-12">
              <div className="flex items-start gap-3">
                <CompanyLogo company={job.company || job.title} logoUrl={job.logo_url} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-caption font-medium text-muted-foreground">{toTitleCase(job.company)}</p>
                  <SheetTitle className="mt-0.5 font-display text-h3 leading-snug tracking-tight">
                    {toTitleCase(job.title)}
                  </SheetTitle>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {toTitleCase(job.location) || 'Location undisclosed'}
                    </span>
                    {postedAgeLabel(job) && <span className="tabular-nums">{postedAgeLabel(job)}</span>}
                    {job.salary && <span className="tabular-nums">{job.salary}</span>}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-caption-sm font-semibold',
                    level.kind === 'stated' ? 'border-border bg-secondary text-secondary-foreground'
                      : 'border-dashed border-border text-muted-foreground',
                  )}
                  title={level.title}
                >
                  {level.text}
                </span>
                {typeLabel && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-caption-sm font-medium text-muted-foreground"
                    title={job.company_type?.basis || undefined}
                  >
                    <Building2 className="h-3 w-3" aria-hidden /> {typeLabel}
                  </span>
                )}
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-caption-sm font-semibold', band.chip)}>
                  {band.key === 'unscored' ? band.label : `${job.match_score} ${band.label}`}
                </span>
                {job.visa_flags && <VisaFlagChips flags={job.visa_flags} />}
                <EmployerSponsorshipBadge signal={legacySponsorshipSignal(job.sponsorship)} />
              </div>
              {level.kind !== 'stated' && (
                <p className="mt-2 text-caption-sm leading-snug text-muted-foreground">{level.title}</p>
              )}
            </div>

            <motion.div
              key={job.job_id}
              ref={bodyRef}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4"
            >
              <section aria-label="Why this matches">
                <h3 className="mb-2 text-label-md text-foreground">Why this matches you</h3>
                <JobFitDetails job={job} />
              </section>
              <section aria-label="Job description">
                <h3 className="mb-2 text-label-md text-foreground">Job description</h3>
                {loading && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading the description...
                  </p>
                )}
                {error && !loading && <p className="text-xs text-muted-foreground">{error}</p>}
                {text && !loading && (
                  <p className="max-w-prose whitespace-pre-line text-caption leading-relaxed text-foreground">{text}</p>
                )}
              </section>
            </motion.div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-5 py-3">
              <Button size="sm" className="btn-premium h-10 gap-1.5 px-4 text-xs font-semibold" onClick={onApply}>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Apply
              </Button>
              <Button size="sm" variant="outline" className="hit-target h-9 gap-1.5 text-xs" onClick={tailor} disabled={loading}>
                <Wand2 className="h-3.5 w-3.5" aria-hidden /> Tailor resume
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={cn('hit-target h-9 gap-1.5 text-xs', saved && 'border-success/40 bg-success/10 text-success')}
                onClick={() => void (saved ? onUnsave() : onSave())}
              >
                {saved ? <BookmarkCheck className="h-3.5 w-3.5" aria-hidden /> : <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />}
                {saved ? 'Saved' : 'Save'}
              </Button>
              {onHide && (
                <Button size="sm" variant="ghost" className="hit-target h-9 gap-1.5 text-xs text-muted-foreground" onClick={onHide}>
                  <CircleOff className="h-3.5 w-3.5" aria-hidden /> Not interested
                </Button>
              )}
              <div className="ml-auto flex items-center gap-1">
                <span className="mr-1 text-caption-sm tabular-nums text-muted-foreground">
                  {index + 1} of {total}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hit-target h-8 w-8"
                  onClick={onPrev}
                  disabled={!onPrev}
                  aria-label="Previous job (K)"
                  title="Previous job (K)"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hit-target h-8 w-8"
                  onClick={onNext}
                  disabled={!onNext}
                  aria-label="Next job (J)"
                  title="Next job (J)"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
