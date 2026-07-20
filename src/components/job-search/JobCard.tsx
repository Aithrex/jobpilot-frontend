import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  MapPin, Clock, DollarSign, Briefcase, ExternalLink,
  BookmarkPlus, BookmarkCheck, Sparkles, Target, FileText, Wand2, ChevronDown,
  Users, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { JobAnalysisModal } from './JobAnalysisModal';
import { ResumeTailorModal } from './ResumeTailorModal';
import { JobTrustBadge } from './JobTrustBadge';
import { SponsorshipBadge, VisaFlagChips } from './JobVisaSignals';
import { ReferralModal } from './ReferralModal';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/jobs';

interface JobCardProps {
  job: Job;
  saved: boolean;
  jobStatus: string | null;
  onSave: () => void;
  onUnsave: () => void;
  onQuickApply: () => void;
}

/** Match band → accent. Green = strong fit, amber = partial, slate = low/unknown.
 *  Drives the score ring stroke AND the card's top accent rail so the fit signal
 *  reads at a glance without adding chrome. */
function matchBand(score: number): { stroke: string; rail: string; text: string } {
  if (score >= 70) {
    return { stroke: 'hsl(150 65% 45%)', rail: 'from-emerald-400 to-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (score >= 40) {
    return { stroke: 'hsl(38 90% 55%)', rail: 'from-amber-400 to-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  }
  return { stroke: 'hsl(var(--muted-foreground))', rail: 'from-slate-300 to-slate-400', text: 'text-muted-foreground' };
}

function MatchScoreRing({ score }: { score: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const band = matchBand(score);
  return (
    <div className="relative h-12 w-12 flex-shrink-0" title={`${score}% resume match`}>
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-muted/30" />
        <circle
          cx="24" cy="24" r={radius} fill="none" stroke={band.stroke} strokeWidth="3.5"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[12px] font-bold tabular-nums">{score}</span>
        <span className="text-[7px] font-medium uppercase tracking-wide text-muted-foreground">match</span>
      </span>
    </div>
  );
}

function buildApplyUrl(job: Job): { url: string; fallback: boolean } {
  if (job.apply_link) return { url: job.apply_link, fallback: false };
  const q = encodeURIComponent(`${job.title} ${job.company} apply`);
  return { url: `https://www.google.com/search?q=${q}`, fallback: true };
}

/** Compact ghost action used in the card's AI-actions cluster. */
function ActionIcon({
  label, icon: Icon, onClick, disabled,
}: {
  label: string;
  icon: typeof Sparkles;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-purple-500/10 hover:text-purple-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 dark:hover:text-purple-300"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

export function JobCard({ job, saved, jobStatus, onSave, onUnsave, onQuickApply }: JobCardProps) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisAction, setAnalysisAction] = useState<'summarize' | 'missing_skills' | 'cover_letter'>('summarize');
  const [tailorOpen, setTailorOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const openAnalysis = (action: typeof analysisAction) => {
    setAnalysisAction(action);
    setAnalysisOpen(true);
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
      const title =
        r.trust_band === 'high_risk'
          ? 'High scam / ghost-job risk'
          : r.trust_band === 'caution'
            ? 'Some risk signals found'
            : 'No scam signals found';
      const description =
        r.advice || r.llm_rationale || (r.trust_reasons || []).slice(0, 2).join(' · ') || undefined;
      if (r.trust_band === 'high_risk') toast.error(title, { description });
      else if (r.trust_band === 'caution') toast.warning(title, { description });
      else toast.success(title, { description });
    } catch {
      toast.error('Scan failed. Try again');
    } finally {
      setScanning(false);
    }
  };

  const apply = buildApplyUrl(job);
  const band = matchBand(job.match_score);
  const hasDescription = !!job.description && job.description.trim().length > 0;

  return (
    <>
      <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-border/60 bg-card/70 backdrop-blur-md transition-[transform,box-shadow,border-color] duration-200 ease-expo hover:-translate-y-1 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10">
        {/* Ambient brand wash — subtle, uniform (our identity, not per-card pastel). */}
        <span
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-purple-500/10 to-indigo-500/5 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-60"
          aria-hidden
        />
        {/* Score-keyed accent rail — brightens on hover. */}
        <span
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-70 transition-opacity duration-300 group-hover:opacity-100',
            band.rail,
          )}
          aria-hidden
        />

        <CardContent className="relative flex flex-1 flex-col gap-3 p-5">
          {/* Header: logo · company/meta · match ring */}
          <div className="flex items-start gap-3">
            {job.logo ? (
              <img
                src={job.logo}
                alt=""
                className="h-12 w-12 flex-shrink-0 rounded-xl border border-border/50 bg-background object-contain p-1 ring-1 ring-border/30"
              />
            ) : (
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/15 text-base font-bold text-purple-600 ring-1 ring-purple-500/20 dark:text-purple-300">
                {job.company.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground" title={job.company}>
                {job.company}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                  <span className="truncate">{job.location || 'Location undisclosed'}</span>
                </span>
                {job.posted_text && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 flex-shrink-0" aria-hidden />
                    {job.posted_text}
                  </span>
                )}
              </p>
            </div>
            <MatchScoreRing score={job.match_score} />
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground" title={job.title}>
            {job.title}
          </h3>

          {/* Trust + visa + eligibility signals (our differentiator) */}
          {(job.trust_band || job.sponsorship || job.visa_flags) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {job.trust_band && (
                <>
                  <JobTrustBadge band={job.trust_band} score={job.trust_score} reasons={job.trust_reasons} />
                  <button
                    type="button"
                    onClick={runDeepScan}
                    disabled={scanning}
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                  >
                    <ShieldCheck className="h-3 w-3" aria-hidden />
                    {scanning ? 'Scanning…' : 'Deep-scan'}
                  </button>
                </>
              )}
              {job.sponsorship && <SponsorshipBadge sponsorship={job.sponsorship} />}
              {job.visa_flags && <VisaFlagChips flags={job.visa_flags} />}
            </div>
          )}

          {/* Meta pills (status / H1B / remote / salary / type / source) */}
          <div className="flex flex-wrap gap-1.5 text-[10.5px]">
            {jobStatus === 'applied' && (
              <Badge className="gap-1 border border-amber-500/30 bg-amber-500/15 px-1.5 py-0 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300">
                <BookmarkCheck className="h-2.5 w-2.5" /> Applied
              </Badge>
            )}
            {jobStatus === 'interview' && (
              <Badge className="border border-blue-500/30 bg-blue-500/15 px-1.5 py-0 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300">Interview</Badge>
            )}
            {job.h1b_sponsor && (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-emerald-700 dark:text-emerald-300">
                H1B
              </Badge>
            )}
            {job.contract_friendly && (
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 px-1.5 py-0 text-blue-700 dark:text-blue-300">
                Contract
              </Badge>
            )}
            {job.is_remote && (
              <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 px-1.5 py-0 text-sky-700 dark:text-sky-300">
                Remote
              </Badge>
            )}
            {job.salary && (
              <Badge variant="outline" className="gap-0.5 border-border/60 px-1.5 py-0 text-muted-foreground">
                <DollarSign className="h-2.5 w-2.5" /> {job.salary}
              </Badge>
            )}
            {job.employment_type && (
              <Badge variant="outline" className="gap-0.5 border-border/60 px-1.5 py-0 text-muted-foreground">
                <Briefcase className="h-2.5 w-2.5" /> {job.employment_type}
              </Badge>
            )}
            {job.source && (
              <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 px-1.5 py-0 text-purple-600 dark:text-purple-300">
                {job.source}
              </Badge>
            )}
          </div>

          {/* Matched skills */}
          {job.matched_skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.matched_skills.slice(0, 8).map(skill => (
                <span
                  key={skill}
                  className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
                >
                  {skill}
                </span>
              ))}
              {job.matched_skills.length > 8 && (
                <span className="self-center text-[10px] text-muted-foreground">
                  +{job.matched_skills.length - 8} more
                </span>
              )}
            </div>
          )}

          {/* Expandable JD */}
          <AnimatePresence initial={false}>
            {expanded && hasDescription && (
              <motion.div
                key="jd"
                initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                animate={reduceMotion ? undefined : { height: 'auto', opacity: 1 }}
                exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border/40 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                  <p className="whitespace-pre-line">
                    {job.description.slice(0, 1400)}
                    {job.description.length > 1400 && '…'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer — primary actions + AI cluster */}
          <div className="mt-auto space-y-2 border-t border-border/40 pt-3">
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                onClick={onQuickApply}
                asChild={!job.apply_link}
                title={apply.fallback ? 'Apply link missing. Opens Google search' : 'Opens career page and marks as applied'}
                className="h-9 flex-1 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-semibold text-white shadow-sm shadow-purple-500/25 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/30"
              >
                {job.apply_link ? (
                  <>
                    <ExternalLink className="h-3.5 w-3.5" />
                    {jobStatus === 'applied' ? 'Reopen' : 'Apply'}
                  </>
                ) : (
                  <a href={apply.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Find Posting
                  </a>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={saved ? onUnsave : onSave}
                title={saved ? 'Remove from saved' : 'Save this job'}
                className={cn(
                  'h-9 gap-1.5 px-3 text-xs',
                  saved
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
                    : 'border-border/60',
                )}
              >
                {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                {saved ? 'Saved' : 'Save'}
              </Button>

              {hasDescription && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="h-9 gap-1 px-2.5 text-xs text-muted-foreground hover:text-purple-600 dark:hover:text-purple-300"
                >
                  Details
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
                </Button>
              )}
            </div>

            {/* AI actions — compact, icon-only with tooltips */}
            <div className="flex items-center gap-0.5">
              <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                <Sparkles className="h-3 w-3" aria-hidden /> AI
              </span>
              <ActionIcon label="Tailor resume to this role" icon={Wand2} onClick={() => setTailorOpen(true)} />
              <ActionIcon label="AI summary" icon={Sparkles} onClick={() => openAnalysis('summarize')} />
              <ActionIcon label="Skill-gap analysis" icon={Target} onClick={() => openAnalysis('missing_skills')} />
              <ActionIcon label="Generate cover letter" icon={FileText} onClick={() => openAnalysis('cover_letter')} />
              <ActionIcon label="Find someone who can refer you" icon={Users} onClick={() => setReferralOpen(true)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <JobAnalysisModal
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        job={job}
        action={analysisAction}
      />

      <ResumeTailorModal
        open={tailorOpen}
        onOpenChange={setTailorOpen}
        job={job}
      />

      <ReferralModal
        open={referralOpen}
        onOpenChange={setReferralOpen}
        job={job}
      />
    </>
  );
}
