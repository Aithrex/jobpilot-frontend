import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  MapPin, ExternalLink, BookmarkPlus, BookmarkCheck, Sparkles, Target,
  FileText, Wand2, Users, ShieldCheck, CircleOff, Plane, Wifi,
  FileSignature, Zap, Loader2, ChevronDown,
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
import { ReferralModal } from './ReferralModal';
import { WhyThisScoreButton } from './JobFitDetails';
import { fitBandOf } from './fitBands';
import { apiService, companyLogoSrc } from '@/lib/api';
import { stagePendingTailorJob, cacheJdText, readCachedJdText } from '@/lib/craftHandoff';
import { isAppliedSavedJob } from '@/lib/savedJobs';
import { cn } from '@/lib/utils';
import { hueFromString, toTitleCase, decodeJobHtml } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';
import type { Job } from '@/types/jobs';

/** Compact tiles: 2 / 3 / 4 columns as the Jobs page widens. */
export const JOB_FEED_GRID_CLASS = 'grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

/** Shared frosted surface — same recipe as the Job feed drawer. */
export const JOB_CARD_CLASS =
  'group relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border liquid-glass shadow-none transition-[border-color,box-shadow] duration-200 hover:border-primary/40';

interface JobCardProps {
  job: Job;
  saved: boolean;
  jobStatus: string | null;
  onSave: () => void | Promise<unknown>;
  onUnsave: () => void | Promise<unknown>;
  onQuickApply: () => void;
  /** Optional: queue into auto-apply ledger (per-job Auto Apply CTA). */
  onAutoApply?: () => void | Promise<unknown>;
  autoApplying?: boolean;
  /** True after Apply opened the posting and we are waiting for yes/no. */
  applyConfirmPending?: boolean;
  /** Job currently in the page-level Did-you-apply modal. Hide the in-card copy while that overlay is open. */
  applyConfirmModalJobId?: string | null;
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
        className="h-9 w-9 flex-shrink-0 rounded-lg border border-border/50 bg-background object-contain p-1"
      />
    );
  }
  return <CompanyLogo company={job.company || job.title || 'JobPilot'} size={36} />;
}

function buildApplyUrl(job: Job): { url: string; fallback: boolean } {
  if (job.apply_link) return { url: job.apply_link, fallback: false };
  const q = encodeURIComponent(`${job.title} ${job.company} apply`);
  return { url: `https://www.google.com/search?q=${q}`, fallback: true };
}

/** Compact ghost action for the card's AI cluster. */
function ActionIcon({ label, icon: Icon, onClick, disabled }: {
  label: string; icon: typeof Sparkles; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
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
      <AlertDialogContent solid>
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
  applyConfirmPending, applyConfirmModalJobId, onConfirmApplied, onConfirmNotYet,
  onApplyWithTailor, onAlreadyApplied, onHide,
}: JobCardProps) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [jdText, setJdText] = useState('');
  const [jdLoading, setJdLoading] = useState(false);
  const [jdError, setJdError] = useState('');
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisAction, setAnalysisAction] = useState<'summarize' | 'missing_skills' | 'cover_letter'>('summarize');
  const [tailoring, setTailoring] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [applyChoiceOpen, setApplyChoiceOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openAnalysis = (action: typeof analysisAction) => {
    setAnalysisAction(action);
    setAnalysisOpen(true);
  };

  /**
   * Open the full Tailor tool prefilled with THIS job's description - no
   * manual copy-paste. Listing rows (Workday / inventory feed) frequently
   * ship without an inline `description`, so when it's missing we recover the
   * JD from the posting URL via the lazy fetcher before handing off. If the
   * JD still can't be fetched, we hand off with `jd_fetch_failed` so Tailor
   * can retry / prompt a paste rather than silently opening empty.
   */
  const handleTailor = async () => {
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
  };

  /** Card Tailor is a Craft handoff only — never open the posting or ask Did you apply. */
  const startTailor = async () => {
    if (tailoring) return;
    setTailoring(true);
    try {
      await onApplyWithTailor?.();
      await handleTailor();
    } catch {
      toast.error('Could not open Tailor');
      setTailoring(false);
    }
  };

  useEffect(() => {
    if (!expanded) return;
    const stored = (job.description || '').trim();
    if (stored) {
      setJdText(decodeJobHtml(stored));
      setJdLoading(false);
      setJdError('');
      return;
    }
    const url = job.apply_link || '';
    if (!url) {
      setJdText('');
      setJdLoading(false);
      setJdError('No description is stored for this listing.');
      return;
    }
    const cached = readCachedJdText(url);
    if (cached) {
      setJdText(decodeJobHtml(cached));
      setJdLoading(false);
      setJdError('');
      return;
    }
    let cancelled = false;
    setJdLoading(true);
    setJdError('');
    setJdText('');
    apiService.fetchJobDescription(url).then((resp) => {
      if (cancelled) return;
      setJdLoading(false);
      if (resp.data?.ok && resp.data.jd_text) {
        const jd = resp.data.jd_text.trim();
        cacheJdText(url, jd);
        setJdText(decodeJobHtml(jd));
        return;
      }
      setJdError('We could not load this job description. Open the posting to read it.');
    }).catch(() => {
      if (cancelled) return;
      setJdLoading(false);
      setJdError('We could not load this job description. Open the posting to read it.');
    });
    return () => { cancelled = true; };
  }, [expanded, job.description, job.apply_link, job.job_id]);

  const showInlineApplyConfirm =
    !!applyConfirmPending
    && !!onConfirmApplied
    && !!onConfirmNotYet
    && applyConfirmModalJobId !== job.job_id;

  const toggleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await (saved ? onUnsave() : onSave());
    } finally {
      setSaving(false);
    }
  };

  const runDeepScan = async () => {
    setScanning(true);
    try {
      const res = await apiService.checkJobTrust(job);
      const r = res.data;
      if (!r) {
        toast.error('Could not scan this posting');
        return;
      }
      const scanTitle = r.trust_band === 'high_risk'
        ? 'High scam / ghost-job risk'
        : r.trust_band === 'caution' ? 'Some risk signals found' : 'No scam signals found';
      const description = r.advice || r.llm_rationale || (r.trust_reasons || []).slice(0, 2).join(' · ') || undefined;
      if (r.trust_band === 'high_risk') toast.error(scanTitle, { description });
      else if (r.trust_band === 'caution') toast.warning(scanTitle, { description });
      else toast.success(scanTitle, { description });
    } catch {
      toast.error('Scan failed. Try again');
    } finally {
      setScanning(false);
    }
  };

  const apply = buildApplyUrl(job);
  const hue = hueFromString(job.company || job.title || 'JobPilot');
  const band = fitBandOf(job);
  const title = toTitleCase(job.title);
  const company = toTitleCase(job.company);
  const location = toTitleCase(job.location);
  const sourceLabel = job.source ? toTitleCase(job.source) : '';
  const meta = [
    job.salary,
    toTitleCase(job.employment_type),
    job.seniority ? String(job.seniority).replace(/_/g, ' ') : '',
    sourceLabel ? `Via ${sourceLabel}` : '',
    job.posted_text || job.date_posted || '',
  ].filter(Boolean);
  const hasSignals = job.trust_band || job.h1b_sponsor || job.is_remote || job.contract_friendly || job.visa_flags;
  const inAppliedPipeline = isAppliedSavedJob({ status: jobStatus ?? undefined });
  const skills = job.matched_skills ?? [];

  return (
    <>
      <div className={cn('flex min-h-0 flex-col', expanded ? 'h-auto' : 'h-full')}>
      <Card className={cn(JOB_CARD_CLASS, expanded && 'h-auto overflow-visible')}>
        <span
          className="pointer-events-none absolute -right-16 -top-16 z-0 h-40 w-40 rounded-full opacity-40 blur-3xl"
          style={{ backgroundColor: `hsl(${hue} 70% 55% / 0.18)` }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-1 opacity-70"
          style={{ backgroundImage: `linear-gradient(90deg, hsl(${hue} 72% 56%), hsl(${(hue + 45) % 360} 72% 60%))` }}
          aria-hidden
        />
        <CardContent className="relative z-[2] flex min-h-0 flex-1 flex-col gap-2.5 p-3.5">
          <div className="flex items-start gap-2.5">
            <CompanyMark job={job} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-muted-foreground" title={company}>{company}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{location || 'Location undisclosed'}</span>
              </p>
              {sourceLabel ? (
                <p className="mt-0.5 truncate text-[11px] font-medium text-foreground/80" title={`Posted via ${sourceLabel}`}>
                  Via {sourceLabel}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-center">
              <MatchScoreRing job={job} />
              <span
                className={cn(
                  'mt-0.5 inline-flex max-w-[4.75rem] items-center justify-center rounded-full border px-1.5 py-px text-center text-[9px] font-semibold leading-tight',
                  band.chip,
                )}
              >
                {band.label}
              </span>
            </div>
          </div>

          <h3 className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground" title={title}>
            {title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <WhyThisScoreButton job={job} />
          </div>

          <div className="min-h-[3.5rem] shrink-0 space-y-1.5">
            {hasSignals && (
              <div className="flex flex-wrap items-center gap-1.5">
                {job.trust_band && (
                  <>
                    <JobTrustBadge band={job.trust_band} score={job.trust_score} reasons={job.trust_reasons} />
                    <button
                      type="button"
                      onClick={() => void runDeepScan()}
                      disabled={scanning}
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-primary hover:underline disabled:opacity-50"
                    >
                      <ShieldCheck className="h-3 w-3" aria-hidden />
                      {scanning ? 'Scanning...' : 'Deep-scan'}
                    </button>
                  </>
                )}
                {job.h1b_sponsor && <SignalPill icon={Plane} label="H1B sponsor" tone="sponsor" />}
                {job.is_remote && <SignalPill icon={Wifi} label="Remote" tone="remote" />}
                {job.contract_friendly && <SignalPill icon={FileSignature} label="Contract" tone="contract" />}
                {job.visa_flags && <VisaFlagChips flags={job.visa_flags} />}
              </div>
            )}

            {skills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {skills.slice(0, 7).map((skill) => (
                  <span key={skill} className="rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                    {skill}
                  </span>
                ))}
                {skills.length > 7 && (
                  <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                    +{skills.length - 7} more
                  </span>
                )}
                {job.missing_skills?.length > 0 && (
                  <span className="shrink-0 whitespace-nowrap text-[10px] text-muted-foreground">
                    · {job.missing_skills.length} gap{job.missing_skills.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            )}
          </div>

          {meta.length > 0 && (
            <p className="truncate text-[11px] text-muted-foreground" title={meta.join(' · ')}>
              {meta.join(' · ')}
            </p>
          )}

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                key="jd"
                initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                animate={reduceMotion ? undefined : { height: 'auto', opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border/40 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                  {jdLoading && <p>Loading the job description...</p>}
                  {jdError && !jdLoading && <p>{jdError}</p>}
                  {jdText && !jdLoading && (
                    <p className="whitespace-pre-line">
                      {jdText.slice(0, 1400)}{jdText.length > 1400 ? '...' : ''}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto space-y-2 border-t border-border/40 pt-2.5">
            {showInlineApplyConfirm ? (
              <div
                role="group"
                aria-label={`Did you apply for ${job.title}?`}
                className="rounded-lg border border-primary/30 bg-primary/[0.06] px-2.5 py-2"
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onConfirmNotYet}
                    className="h-9 min-w-[5.5rem] text-xs font-semibold hover:border-primary hover:bg-primary/10 hover:text-primary"
                  >
                    Not yet
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onQuickApply}
                    title="Open the posting again"
                    className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-transparent hover:text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Reopen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (inAppliedPipeline) onQuickApply();
                      else setApplyChoiceOpen(true);
                    }}
                    title={apply.fallback ? 'Apply link missing. Opens Google search, then asks how you want to apply' : 'Choose tailor, apply with your base resume, or mark already applied'}
                    className="btn-premium h-9 min-w-0 gap-1.5 text-xs font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {inAppliedPipeline ? 'Reopen' : 'Apply'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void startTailor()}
                    disabled={tailoring}
                    aria-busy={tailoring}
                    title="Open Tailor with this job’s description"
                    className="h-9 min-w-0 gap-1.5 border-border bg-white text-xs font-semibold text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary disabled:opacity-70 dark:bg-zinc-900"
                  >
                    {tailoring ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    {tailoring ? 'Opening…' : 'Tailor resume'}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {onAutoApply && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void onAutoApply()}
                      disabled={autoApplying || inAppliedPipeline}
                      title="Queue this job for Aspirely auto-apply"
                      className="h-9 gap-1.5 px-2.5 text-xs font-semibold text-muted-foreground hover:bg-transparent hover:text-primary"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {autoApplying ? 'Queuing…' : 'Auto Apply'}
                    </Button>
                  )}
                  {!inAppliedPipeline && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void toggleSave()}
                      disabled={saving}
                      aria-busy={saving}
                      title={saved ? 'Remove from saved' : 'Save this job'}
                      className={cn('h-9 min-w-[5.5rem] gap-1.5 px-2.5 text-xs',
                        saved
                          ? 'border-success/40 bg-success/10 text-success hover:border-success hover:bg-success/20 hover:text-success'
                          : 'border-border/60 text-muted-foreground hover:text-primary')}
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : saved ? (
                        <BookmarkCheck className="h-3.5 w-3.5" />
                      ) : (
                        <BookmarkPlus className="h-3.5 w-3.5" />
                      )}
                      {saving ? (saved ? 'Removing…' : 'Saving…') : saved ? 'Saved' : 'Save'}
                    </Button>
                  )}
                  {onHide && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onHide}
                      title="Hide this job from For you"
                      aria-label="Hide this job"
                      className="h-9 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-transparent hover:text-primary"
                    >
                      <CircleOff className="h-3.5 w-3.5" />
                      Hide
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="h-9 gap-1 px-2.5 text-xs text-muted-foreground hover:bg-transparent hover:text-primary"
                  >
                    Details
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-0.5">
              <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                <Sparkles className="h-3 w-3" aria-hidden /> AI
              </span>
              <ActionIcon label="Tailor resume to this role" icon={Wand2} onClick={() => void startTailor()} disabled={tailoring} />
              <ActionIcon label="AI summary" icon={Sparkles} onClick={() => openAnalysis('summarize')} />
              <ActionIcon label="Skill-gap analysis" icon={Target} onClick={() => openAnalysis('missing_skills')} />
              <ActionIcon label="Generate cover letter" icon={FileText} onClick={() => openAnalysis('cover_letter')} />
              <ActionIcon label="Find someone who can refer you" icon={Users} onClick={() => setReferralOpen(true)} />
            </div>
          </div>
        </CardContent>
      </Card>
      </div>

      <JobAnalysisModal open={analysisOpen} onOpenChange={setAnalysisOpen} job={job} action={analysisAction} />
      <ReferralModal open={referralOpen} onOpenChange={setReferralOpen} job={job} />
      <AlertDialog open={applyChoiceOpen} onOpenChange={setApplyChoiceOpen}>
        <AlertDialogContent solid>
          <AlertDialogHeader>
            <AlertDialogTitle>How do you want to apply?</AlertDialogTitle>
            <AlertDialogDescription>
              Tailor a resume for {title} at {company}, apply with your current resume, or mark that you already submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {onAlreadyApplied && (
              <Button
                type="button"
                variant="outline"
                className="hover:border-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => {
                  setApplyChoiceOpen(false);
                  void onAlreadyApplied();
                }}
              >
                Already applied
              </Button>
            )}
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
                void startTailor();
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
