import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MapPin, ExternalLink, BookmarkPlus, BookmarkCheck, Sparkles,
  CircleOff, Plane, Wifi, FileSignature, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CompanyLogo } from '@/components/CompanyLogo';
import { JobAnalysisModal } from './JobAnalysisModal';
import { JobTrustBadge } from './JobTrustBadge';
import { VisaFlagChips } from './JobVisaSignals';
import { WhyThisScoreButton } from './JobFitDetails';
import { fitBandOf } from './fitBands';
import { apiService, companyLogoSrc } from '@/lib/api';
import { stagePendingTailorJob, cacheJdText, readCachedJdText } from '@/lib/craftHandoff';
import { cn } from '@/lib/utils';
import { toTitleCase } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';
import type { Job } from '@/types/jobs';

interface JobCardProps {
  job: Job;
  saved: boolean;
  jobStatus: string | null;
  onSave: () => void;
  onUnsave: () => void;
  onQuickApply: () => void;
  /** Optional: queue into auto-apply ledger (per-job Auto Apply CTA). */
  onAutoApply?: () => void | Promise<unknown>;
  autoApplying?: boolean;
  /** True after Apply opened the posting and we are waiting for yes/no. */
  applyConfirmPending?: boolean;
  onConfirmApplied?: () => void;
  onConfirmNotYet?: () => void;
  onApplyWithTailor?: () => void | Promise<unknown>;
  onAlreadyApplied?: () => void | Promise<unknown>;
  /** Hide this posting from For you (session-only). */
  onHide?: () => void;
}

/**
 * The score dial.
 *
 * Bands come from `./fitBands`, which mirrors the scoring engine's real cut-offs
 * (80 strong / 65 good / 50 possible / 35 weak). The previous 70/40 split here
 * was invented on the client and disagreed with the number's own meaning, so a
 * 66 - a "good match", the exact threshold Auto-Apply queues on - rendered in
 * caution amber.
 *
 * Takes the whole ROW, not the number: `fitBandOf` refuses to attach fit_score's
 * band words to a `match_score` that did not come from fit_score. This card is
 * rendered by `JobSearchPanel`, `WorkdayJobsPanel` and `CombinedJobsPanel`, which
 * historically fed it three different engines' numbers under that one key, and
 * streamed scan previews still carry a provisional value with no version stamp.
 * An unstamped row reads "Not scored" - true, rather than confidently wrong.
 *
 * Colour is never the only cue: the band LABEL sits directly under the number,
 * and the whole dial is labelled for assistive tech.
 */
function MatchScoreRing({ job }: { job: Job }) {
  const reduce = useReducedMotion();
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, job.match_score ?? 0));
  const band = fitBandOf(job);
  const scored = band.key !== 'unscored';
  const offset = circumference - ((scored ? clamped : 0) / 100) * circumference;
  const shown = useCountUp(clamped);
  return (
    <div
      className="relative h-12 w-12 flex-shrink-0"
      role="img"
      aria-label={scored ? `${clamped} out of 100. ${band.label}.` : 'Not scored against your resume'}
    >
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-muted/30" />
        {scored && (
          <motion.circle
            cx="24" cy="24" r={radius} fill="none" stroke={band.stroke} strokeWidth="3.5"
            strokeDasharray={circumference} strokeLinecap="round"
            initial={reduce ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none" aria-hidden>
        <span className={cn('font-mono text-[12px] font-bold tabular-nums', band.text)}>
          {scored ? shown : '--'}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide text-muted-foreground">
          {scored ? 'fit' : 'n/a'}
        </span>
      </span>
    </div>
  );
}

/** Company mark: backend-served icon (`logo_url`, cached in our own storage)
 *  → scraped logo → shared hued monogram (`CompanyLogo` owns that terminal
 *  fallback).
 *
 *  Deliberately NO client-side favicon lookup by apply-link domain: it
 *  hotlinks a third party from every card, and the apply domain is usually
 *  the ATS (boards.greenhouse.io, myworkdayjobs.com), so it rendered the
 *  applicant-tracking vendor's logo instead of the employer's. */
function CompanyMark({ job }: { job: Job }) {
  const chain = [
    companyLogoSrc(job.logo_url),
    job.logo,
  ].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const src = chain[idx];

  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        onError={() => setIdx((i) => i + 1)}
        className="h-10 w-10 flex-shrink-0 rounded-lg border border-border/50 bg-background object-contain p-1"
      />
    );
  }
  return <CompanyLogo company={job.company || job.title || 'JobPilot'} size={40} />;
}

function buildApplyUrl(job: Job): { url: string; fallback: boolean } {
  if (job.apply_link) return { url: job.apply_link, fallback: false };
  const q = encodeURIComponent(`${job.title} ${job.company} apply`);
  return { url: `https://www.google.com/search?q=${q}`, fallback: true };
}

/** Primary eligibility signal pill. */
function SignalPill({ icon: Icon, label, tone }: {
  icon: typeof Plane; label: string; tone: 'sponsor' | 'remote' | 'contract';
}) {
  const cls = {
    sponsor: 'border-success/30 bg-success/10 text-success',
    remote: 'border-info/30 bg-info/10 text-info',
    contract: 'border-border bg-secondary text-secondary-foreground',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold', cls)}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

export function ApplyConfirmDialog({
  job,
  onApplied,
  onNotYet,
  onDismiss,
}: {
  job: Job | null;
  onApplied: () => void;
  onNotYet: () => void;
  onDismiss: () => void;
}) {
  return (
    <AlertDialog open={!!job} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Did you apply for this role?</AlertDialogTitle>
          <AlertDialogDescription>
            {job
              ? `The posting for ${job.title} at ${job.company} opened in a new tab. If you submitted an application, we’ll move it to Applied in your tracker. If not, it stays where it is.`
              : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onNotYet}>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={onApplied}>Yes, I applied</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function JobCard({
  job, saved, jobStatus, onSave, onUnsave, onQuickApply, onAutoApply, autoApplying,
  applyConfirmPending, onConfirmApplied, onConfirmNotYet,
  onApplyWithTailor, onAlreadyApplied, onHide,
}: JobCardProps) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [applyChoiceOpen, setApplyChoiceOpen] = useState(false);

  /**
   * Open the full Tailor tool prefilled with THIS job's description - no
   * manual copy-paste. Listing rows (Workday / inventory feed) frequently
   * ship without an inline `description`, so when it's missing we recover the
   * JD from the posting URL via the lazy fetcher before handing off. If the
   * JD still can't be fetched, we hand off with `jd_fetch_failed` so Tailor
   * can retry / prompt a paste rather than silently opening empty.
   */
  const handleTailor = async () => {
    if (tailoring) return;
    setTailoring(true);
    try {
      const url = job.apply_link || '';
      let jdText = (job.description || '').trim();
      let fetchFailed = false;

      if (!jdText && url) {
        const cached = readCachedJdText(url);
        if (cached) {
          jdText = cached;
        } else {
          toast.info('Fetching the job description. Opening Tailor in a moment...');
          try {
            const resp = await apiService.fetchJobDescription(url);
            if (resp.data?.ok && resp.data.jd_text) {
              jdText = resp.data.jd_text.trim();
              cacheJdText(url, jdText);
            } else {
              fetchFailed = true;
            }
          } catch {
            fetchFailed = true;
          }
        }
      }

      stagePendingTailorJob({
        job_id: job.job_id,
        jd_text: fetchFailed ? '' : jdText,
        jd_fetch_failed: fetchFailed,
        title: job.title,
        company: job.company,
        url,
      });
    } finally {
      setTailoring(false);
    }
  };

  const apply = buildApplyUrl(job);
  const band = fitBandOf(job);
  const scored = band.key !== 'unscored';
  const title = toTitleCase(job.title);
  const company = toTitleCase(job.company);
  const location = toTitleCase(job.location);
  const snippet = (job.description || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const reasons = [
    job.title_matched ? 'Title match' : '',
    job.h1b_sponsor ? 'H-1B' : '',
    job.is_remote ? 'Remote' : '',
  ].filter(Boolean);
  const hasSignals = job.trust_band || job.h1b_sponsor || job.is_remote || job.contract_friendly || job.visa_flags;

  return (
    <>
      <Card className="overflow-hidden rounded-xl border-border bg-card transition-colors hover:border-primary/35">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="min-w-0 flex-1 p-4">
              <div className="flex items-start gap-3">
                <CompanyMark job={job} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground" title={title}>
                    {title}
                  </h3>
                  <p className="truncate text-[13px] text-muted-foreground" title={company}>{company}</p>
                  {snippet ? (
                    <p className="mt-1 line-clamp-1 text-[12px] text-muted-foreground">{snippet}{job.description.length > 140 ? '…' : ''}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  {location || 'Location undisclosed'}
                </span>
                {job.employment_type ? <span>{toTitleCase(job.employment_type)}</span> : null}
                {job.seniority ? <span className="capitalize">{job.seniority}</span> : null}
                {job.salary ? <span className="font-medium text-foreground/80">{job.salary}</span> : null}
                {job.posted_text ? <span>{job.posted_text}</span> : null}
              </div>

              {hasSignals && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {job.trust_band && (
                    <JobTrustBadge band={job.trust_band} score={job.trust_score} reasons={job.trust_reasons} />
                  )}
                  {job.h1b_sponsor && <SignalPill icon={Plane} label="H1B sponsor" tone="sponsor" />}
                  {job.is_remote && <SignalPill icon={Wifi} label="Remote" tone="remote" />}
                  {job.contract_friendly && <SignalPill icon={FileSignature} label="Contract" tone="contract" />}
                  {job.visa_flags && <VisaFlagChips flags={job.visa_flags} />}
                </div>
              )}

              {job.matched_skills.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {job.matched_skills.slice(0, 5).map((skill) => (
                    <span key={skill} className="rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                      {skill}
                    </span>
                  ))}
                  {job.matched_skills.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">+{job.matched_skills.length - 5}</span>
                  )}
                </div>
              )}

              {applyConfirmPending && onConfirmApplied && onConfirmNotYet ? (
                <div
                  role="group"
                  aria-label={`Did you apply for ${job.title}?`}
                  className="mt-3 rounded-xl border border-primary/30 bg-primary/[0.06] px-3 py-2.5"
                >
                  <p className="text-xs font-medium text-foreground">
                    Did you apply for <span className="font-semibold">{job.title}</span>?
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Yes moves it to Applied. Not yet leaves it in Draft.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Button size="sm" onClick={onConfirmApplied} className="h-9 min-w-[7.5rem] gap-1.5 text-xs font-semibold">
                      Yes, I applied
                    </Button>
                    <Button size="sm" variant="outline" onClick={onConfirmNotYet} className="h-9 min-w-[5.5rem] text-xs font-semibold">
                      Not yet
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onQuickApply}
                      title="Open the posting again"
                      className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Reopen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (jobStatus === 'applied' || applyConfirmPending) onQuickApply();
                      else setApplyChoiceOpen(true);
                    }}
                    title={apply.fallback ? 'Apply link missing. Opens Google search, then asks how you want to apply' : 'Choose tailor, apply with your base resume, or mark already applied'}
                    className="btn-premium h-9 min-w-[6.5rem] gap-1.5 text-xs font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {jobStatus === 'applied' ? 'Reopen' : 'Apply'}
                  </Button>
                  {onAutoApply && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void onAutoApply()}
                      disabled={autoApplying || jobStatus === 'applied'}
                      title="Queue this job for Aspirely auto-apply"
                      className="h-9 gap-1.5 px-3 text-xs font-semibold"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {autoApplying ? 'Queuing…' : 'Auto Apply'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={saved ? onUnsave : onSave}
                    title={saved ? 'Remove from saved' : 'Save this job'}
                    className={cn('h-9 gap-1.5 px-3 text-xs',
                      saved
                        ? 'border-success/40 bg-success/10 text-success hover:bg-success/20 hover:text-success'
                        : 'border-border/60')}
                  >
                    {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                    {saved ? 'Saved' : 'Save'}
                  </Button>
                  {onHide && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onHide}
                      title="Hide this job from For you"
                      aria-label="Hide this job"
                      className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground"
                    >
                      <CircleOff className="h-3.5 w-3.5" />
                      Hide
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAnalysisOpen(true)}
                    className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Ask
                  </Button>
                </div>
              )}
            </div>

            <aside className="flex shrink-0 items-center gap-3 border-t border-border bg-muted/25 px-4 py-3 sm:w-[9.5rem] sm:flex-col sm:items-center sm:justify-center sm:border-l sm:border-t-0 sm:py-4">
              <MatchScoreRing job={job} />
              <div className="min-w-0 text-center sm:px-1">
                <p className={cn('text-[11px] font-semibold leading-tight', band.text)}>{band.label}</p>
                {scored && reasons.length > 0 && (
                  <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{reasons.slice(0, 2).join(' · ')}</p>
                )}
                <div className="mt-1">
                  <WhyThisScoreButton job={job} />
                </div>
              </div>
            </aside>
          </div>
        </CardContent>
      </Card>

      <JobAnalysisModal open={analysisOpen} onOpenChange={setAnalysisOpen} job={job} action="summarize" />
      <AlertDialog open={applyChoiceOpen} onOpenChange={setApplyChoiceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>How do you want to apply?</AlertDialogTitle>
            <AlertDialogDescription>
              Tailor a resume for {job.title} at {job.company}, apply with your current resume, or mark that you already submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setApplyChoiceOpen(false);
                void onAlreadyApplied?.();
              }}
            >
              Already applied
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setApplyChoiceOpen(false);
                onQuickApply();
              }}
            >
              Apply without tailoring
            </Button>
            <Button
              type="button"
              onClick={() => {
                setApplyChoiceOpen(false);
                void (async () => {
                  await onApplyWithTailor?.();
                  await handleTailor();
                })();
              }}
            >
              Tailor resume
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
