import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  MapPin, ExternalLink, BookmarkPlus, BookmarkCheck, Sparkles, Target,
  FileText, Wand2, ChevronDown, Users, ShieldCheck, Plane, Wifi, FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { JobAnalysisModal } from './JobAnalysisModal';
import { ResumeTailorModal } from './ResumeTailorModal';
import { JobTrustBadge } from './JobTrustBadge';
import { VisaFlagChips } from './JobVisaSignals';
import { ReferralModal } from './ReferralModal';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import { hostFromUrl, hueFromString, toTitleCase } from '@/lib/format';
import { useCountUp } from '@/hooks/useCountUp';
import type { Job } from '@/types/jobs';

interface JobCardProps {
  job: Job;
  saved: boolean;
  jobStatus: string | null;
  onSave: () => void;
  onUnsave: () => void;
  onQuickApply: () => void;
}

/** Match band → ring stroke + label color. Green = strong fit, amber = partial. */
function matchBand(score: number): { stroke: string; text: string } {
  if (score >= 70) return { stroke: 'hsl(152 60% 44%)', text: 'text-emerald-600 dark:text-emerald-400' };
  if (score >= 40) return { stroke: 'hsl(38 92% 52%)', text: 'text-amber-600 dark:text-amber-400' };
  return { stroke: 'hsl(var(--muted-foreground))', text: 'text-muted-foreground' };
}

function MatchScoreRing({ score }: { score: number }) {
  const reduce = useReducedMotion();
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const band = matchBand(score);
  const shown = useCountUp(clamped);
  return (
    <div className="relative h-12 w-12 flex-shrink-0" title={`${score}% resume match`}>
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-muted/30" />
        <motion.circle
          cx="24" cy="24" r={radius} fill="none" stroke={band.stroke} strokeWidth="3.5"
          strokeDasharray={circumference} strokeLinecap="round"
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('font-mono text-[12px] font-bold tabular-nums', band.text)}>{shown}</span>
        <span className="text-[7px] font-medium uppercase tracking-wide text-muted-foreground">match</span>
      </span>
    </div>
  );
}

/** Company mark: real logo → favicon from the apply domain → hued monogram. */
function CompanyLogo({ job, hue }: { job: Job; hue: number }) {
  const host = hostFromUrl(job.apply_link);
  const chain = [
    job.logo,
    host ? `https://www.google.com/s2/favicons?domain=${host}&sz=128` : '',
  ].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const src = chain[idx];

  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setIdx((i) => i + 1)}
        className="h-12 w-12 flex-shrink-0 rounded-xl border border-border/50 bg-background object-contain p-1.5"
      />
    );
  }
  return (
    <div
      className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl text-lg font-bold"
      style={{
        backgroundColor: `hsl(${hue} 68% 55% / 0.14)`,
        color: `hsl(${hue} 60% 52%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 68% 55% / 0.28)`,
      }}
    >
      {(job.company || '?').charAt(0).toUpperCase()}
    </div>
  );
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
    sponsor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    remote: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    contract: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  }[tone];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold', cls)}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
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
      const title = r.trust_band === 'high_risk'
        ? 'High scam / ghost-job risk'
        : r.trust_band === 'caution' ? 'Some risk signals found' : 'No scam signals found';
      const description = r.advice || r.llm_rationale || (r.trust_reasons || []).slice(0, 2).join(' · ') || undefined;
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
  const hue = hueFromString(job.company || job.title || 'JobPilot');
  const hasDescription = !!job.description && job.description.trim().length > 0;

  const title = toTitleCase(job.title);
  const company = toTitleCase(job.company);
  const location = toTitleCase(job.location);

  // Muted meta line — dot-separated, only what exists.
  const meta = [
    job.salary,
    toTitleCase(job.employment_type),
    job.source ? toTitleCase(job.source) : '',
    job.posted_text,
  ].filter(Boolean);

  const hasSignals = job.trust_band || job.h1b_sponsor || job.is_remote || job.contract_friendly || job.visa_flags;

  return (
    <>
      <Card className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-border/60 bg-card/70 backdrop-blur-md transition-[transform,box-shadow,border-color] duration-200 ease-expo hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
        {/* Company-hued ambient wash + accent rail — the per-card color identity. */}
        <span
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-50 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
          style={{ backgroundColor: `hsl(${hue} 70% 55% / 0.18)` }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          style={{ backgroundImage: `linear-gradient(90deg, hsl(${hue} 72% 56%), hsl(${(hue + 45) % 360} 72% 60%))` }}
          aria-hidden
        />

        <CardContent className="relative flex flex-1 flex-col gap-3 p-5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <CompanyLogo job={job} hue={hue} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground" title={company}>{company}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
                <span className="truncate">{location || 'Location undisclosed'}</span>
              </p>
            </div>
            <MatchScoreRing score={job.match_score} />
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-foreground" title={title}>
            {title}
          </h3>

          {/* Primary signal row */}
          {hasSignals && (
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
              {job.h1b_sponsor && <SignalPill icon={Plane} label="H1B sponsor" tone="sponsor" />}
              {job.is_remote && <SignalPill icon={Wifi} label="Remote" tone="remote" />}
              {job.contract_friendly && <SignalPill icon={FileSignature} label="Contract" tone="contract" />}
              {job.visa_flags && <VisaFlagChips flags={job.visa_flags} />}
            </div>
          )}

          {/* Matched skills */}
          {job.matched_skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.matched_skills.slice(0, 7).map((skill) => (
                <span key={skill} className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                  {skill}
                </span>
              ))}
              {job.matched_skills.length > 7 && (
                <span className="self-center text-[10px] text-muted-foreground">+{job.matched_skills.length - 7} more</span>
              )}
            </div>
          )}

          {/* Muted meta line */}
          {meta.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
              {meta.map((m, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="text-muted-foreground/40" aria-hidden>·</span>}
                  <span className={i === 0 && job.salary ? 'font-medium text-foreground/80' : ''}>{m}</span>
                </span>
              ))}
            </p>
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
                    {job.description.slice(0, 1400)}{job.description.length > 1400 && '…'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
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
                className={cn('h-9 gap-1.5 px-3 text-xs',
                  saved
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
                    : 'border-border/60')}
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
                  className="h-9 gap-1 px-2.5 text-xs text-muted-foreground hover:text-primary"
                >
                  Details
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden />
                </Button>
              )}
            </div>

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

      <JobAnalysisModal open={analysisOpen} onOpenChange={setAnalysisOpen} job={job} action={analysisAction} />
      <ResumeTailorModal open={tailorOpen} onOpenChange={setTailorOpen} job={job} />
      <ReferralModal open={referralOpen} onOpenChange={setReferralOpen} job={job} />
    </>
  );
}
