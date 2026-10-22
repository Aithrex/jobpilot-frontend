/**
 * One posting in the tech feed.
 *
 * The card's job is to be HONEST about what the index knows:
 *  - a salary is shown only when `salary.published` is true, otherwise the
 *    card says "Salary not published" rather than implying a range;
 *  - a posting date is shown only when `posted_at_confidence` is "exact".
 *    "relative" is hedged, "unknown" falls back to first-seen and says the
 *    date was not stated by the employer. A date is never invented;
 *  - freshness separates "when the employer published it" from "when we last
 *    verified the posting is still live" - the second is a fact we own and can
 *    state precisely ("verified 2h ago"), the first often is not;
 *  - `eligibility: "ineligible"` never renders a match-score band. A band
 *    implies the candidate clears screening, and the engine has just said they
 *    do not;
 *  - a hard requirement the resume is SILENT about (a clearance, a licence) is
 *    a requirement to CHECK, not a deduction and not a reason a score is low;
 *  - `hard_constraint_mismatches` are surfaced as "Important unknowns", not as
 *    disqualifications - they are things the index could not verify;
 *  - provenance (direct employer vs staffing, applying on the employer's own
 *    board vs via a job board, which source, which ATS) is on the face of the
 *    card, because "who is actually hiring" is the single most misrepresented
 *    fact in job search.
 *
 * Every ACTION here is the existing `useJobSearch` flow, reached through the
 * one adapter in `lib/techFeedJobAdapter.ts`. Save, the did-you-apply
 * confirmation, the tailor handoff, the tracker touch and auto-apply are not
 * reimplemented for this surface - a second implementation would drift from
 * the tracker the rest of the product reads.
 */
import { useMemo, useState } from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Globe2,
  HelpCircle,
  Layers,
  Loader2,
  MapPin,
  ShieldAlert,
  ShieldQuestion,
  Target,
  Wallet,
  Wand2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GuestFitBreakdown, normalizeFit } from '@/components/guest/GuestFitBreakdown';
import { fitBand } from '@/components/job-search/fitBands';
import {
  ClearanceRequiredBadge,
  EmployerSponsorshipBadge,
  NoSponsorshipBadge,
} from '@/components/job-search/WorkAuthorizationSignals';
import { NotInterestedMenu } from '@/components/job-search/tech-feed/NotInterestedMenu';
import { JobEmployerContext } from '@/components/job-search/JobEmployerContext';
import { apiService } from '@/lib/api';
import { cacheJdText, readCachedJdText, stagePendingTailorJob } from '@/lib/craftHandoff';
import { isAppliedSavedJob } from '@/lib/savedJobs';
import { applicationStateLabel } from '@/lib/applicationState';
import { availabilityOf, employerProfileOf } from '@/lib/employerPolicy';
import {
  eligibilityOf,
  ineligibleReasonsOf,
  isTechFeedScored,
  requirementsToCheck,
  roleAlignmentLabel,
  roleAlignmentOf,
} from '@/lib/techFeedEligibility';
import {
  clearanceRequirementOf,
  statesNoSponsorship,
} from '@/lib/techFeedWorkAuth';
import { techFeedJobToJob } from '@/lib/techFeedJobAdapter';
import { cn } from '@/lib/utils';
import { isSponsorshipSignalRenderable } from '@/types/workAuthorization';
import type { GuestFitScore } from '@/types/guest';
import type { Job } from '@/types/jobs';
import type { TechFeedFeedbackReason, TechFeedJob } from '@/types/techFeed';

interface TechFeedJobCardProps {
  job: TechFeedJob;
  /** key -> label from the taxonomy, so chips read as words not slugs. */
  labels?: Record<string, string>;
  /** Rides along on feedback so the server can tie a dismissal to its search. */
  searchId?: string | null;
  onNotInterested: (jobId: string, reason: TechFeedFeedbackReason) => void;
  onRestore?: (jobId: string) => void;

  // ── The five existing flows, handed down from `useJobSearch` ──
  saved?: boolean;
  jobStatus?: string | null;
  onSave?: (job: Job) => void | Promise<unknown>;
  onUnsave?: (jobId: string) => void | Promise<unknown>;
  onQuickApply?: (job: Job) => void | Promise<unknown>;
  onApplyWithTailor?: (job: Job) => void | Promise<unknown>;
  onAutoApply?: (job: Job) => void | Promise<unknown>;
  autoApplying?: boolean;
  /** True after Apply opened the posting and we are waiting for yes / no. */
  applyConfirmPending?: boolean;
  /** Job currently in the page-level dialog - suppress the in-card copy then. */
  applyConfirmModalJobId?: string | null;
  onConfirmApplied?: (job: Job) => void | Promise<unknown>;
  onConfirmNotYet?: (jobId: string) => void;
  /** "I applied to this elsewhere" - files it under Applied without opening it. */
  onAlreadyApplied?: (job: Job) => void | Promise<unknown>;

  /**
   * Non-PII engagement telemetry. The ATS VENDOR is passed, never the job id:
   * "apply clicks on iCIMS boards" is a product fact and "this person clicked
   * apply on this requisition" is that person's job hunt.
   */
  onEngagement?: (
    kind: 'card_open' | 'card_apply_click' | 'card_save',
    ats?: string | null,
  ) => void;

  className?: string;
}

const WORK_MODE_LABEL: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On site',
  unknown: 'Work arrangement unknown',
};

const EMPLOYER_KIND_LABEL: Record<string, string> = {
  direct_employer: 'Direct employer',
  staffing: 'Staffing agency',
  marketplace: 'Marketplace listing',
};

function humanize(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRelativeDays(days: number | null): string {
  if (days === null || !Number.isFinite(days)) return 'an unknown time ago';
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${Math.round(days)} days ago`;
}

/** The single place a posting age turns into copy. Never fabricates a date. */
export function postedLabel(job: TechFeedJob): { text: string; caveat: string | null } {
  if (job.posted_at_confidence === 'exact') {
    const exact = formatDate(job.posted_at);
    if (exact) return { text: `Posted ${exact}`, caveat: null };
  }
  if (job.posted_at_confidence === 'relative' && job.days_ago !== null) {
    return {
      text: `Posted about ${formatRelativeDays(job.days_ago)}`,
      caveat: 'The source gave a relative age, not a date.',
    };
  }
  return {
    text: `First seen ${formatRelativeDays(job.first_seen_days_ago)}`,
    caveat: 'Posting date not stated by the employer.',
  };
}

/**
 * "verified 2h ago" - when WE last saw this posting live.
 *
 * A distinct fact from the posting date and a much stronger one: it is our own
 * observation, so it is stated with real precision instead of hedged.
 */
export function verifiedLabel(job: TechFeedJob, now: number = Date.now()): string | null {
  const stamp = job.last_verified_at ? new Date(job.last_verified_at).getTime() : NaN;
  if (Number.isNaN(stamp)) return null;
  const minutes = Math.floor((now - stamp) / 60_000);
  if (minutes < 0) return 'verified just now';
  if (minutes < 60) return `verified ${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `verified ${hours}h ago`;
  return `verified ${Math.floor(hours / 24)}d ago`;
}

/** Pay copy. `published: false` means there is no pay data - say so. */
export function salaryLabel(job: TechFeedJob): string {
  const salary = job.salary;
  if (!salary?.published) return 'Salary not published';
  if (salary.display) return salary.display;

  const currency = salary.currency ? `${salary.currency} ` : '';
  const interval = salary.interval && salary.interval !== 'year' ? ` / ${salary.interval}` : '';
  if (salary.min_annual !== null && salary.max_annual !== null) {
    return `${currency}${salary.min_annual.toLocaleString()} - ${salary.max_annual.toLocaleString()}${interval}`;
  }
  if (salary.min_annual !== null) {
    return `${currency}${salary.min_annual.toLocaleString()}+${interval}`;
  }
  if (salary.max_annual !== null) {
    return `Up to ${currency}${salary.max_annual.toLocaleString()}${interval}`;
  }
  return 'Salary published, range not given';
}

export function sponsorshipLabel(job: TechFeedJob): string {
  if (!job.sponsorship) return 'Sponsorship not stated';
  return `Sponsorship: ${humanize(job.sponsorship)}`;
}

export function TechFeedJobCard({
  job,
  labels = {},
  searchId,
  onNotInterested,
  onRestore,
  saved = false,
  jobStatus,
  onSave,
  onUnsave,
  onQuickApply,
  onApplyWithTailor,
  onAutoApply,
  autoApplying = false,
  applyConfirmPending = false,
  applyConfirmModalJobId,
  onConfirmApplied,
  onConfirmNotYet,
  onAlreadyApplied,
  onEngagement,
  className,
}: TechFeedJobCardProps) {
  const posted = useMemo(() => postedLabel(job), [job]);
  const pay = useMemo(() => salaryLabel(job), [job]);
  const verified = useMemo(() => verifiedLabel(job), [job]);
  const posting = useMemo(() => techFeedJobToJob(job), [job]);

  const eligibility = eligibilityOf(job);
  const ineligible = eligibility === 'ineligible';
  const ineligibleReasons = ineligibleReasonsOf(job);
  const alignment = roleAlignmentOf(job);
  const requirements = requirementsToCheck(job);
  /**
   * A number is only shown when the ENGINE stamped it.
   *
   * `eligibility` alone is not enough: a server that says `eligible` on a row
   * it never scored leaves `match_score` at 0, and this card used to render
   * that as "0% match" beside a "Not scored" label. An account with no parsed
   * resume saw a page of zeroes and read them as a verdict. The stamp is the
   * only thing that licenses a number - see `fitBands.isFitScored` for why.
   */
  const scored = isTechFeedScored(job) && job.match_score > 0;
  const band = fitBand(job.match_score);

  // The stated facts about THIS posting's access barriers. Both are the
  // employer speaking; neither is an assessment of the person reading.
  const clearance = clearanceRequirementOf(job);
  const noSponsorship = statesNoSponsorship(job);
  // Renderable, not merely present: a `no_data` payload is an object that
  // draws nothing, and gating on truthiness alone would leave an empty row.
  const employerSponsorship = isSponsorshipSignalRenderable(job.employer_sponsorship)
    ? job.employer_sponsorship
    : null;

  // The score's receipts, when the engine sent them. `fit` is an open record
  // on the wire; `normalizeFit` renders only the parts it recognises and
  // returns null when the v2 block is absent, so an older row loses nothing.
  const fitBreakdown = useMemo(
    () => (scored ? normalizeFit(job.fit as GuestFitScore | null | undefined) : null),
    [job.fit, scored],
  );

  const [saving, setSaving] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [fitOpen, setFitOpen] = useState(false);

  const locationText = job.locations?.length
    ? job.locations
        .slice(0, 3)
        .map((loc) => loc.raw || [loc.city, loc.region, loc.country].filter(Boolean).join(', '))
        .filter(Boolean)
        .join(' | ')
    : 'Location not stated';

  const otherLocations = job.location_variants?.length ?? 0;
  const otherBoards = useMemo(() => {
    const boards = new Set<string>();
    for (const variant of job.source_variants ?? []) {
      const board = variant.ats || variant.source;
      if (board && board.toLowerCase() !== (job.ats || job.source || '').toLowerCase()) {
        boards.add(humanize(board));
      }
    }
    return Array.from(boards);
  }, [job.source_variants, job.ats, job.source]);

  // The employer-policy blocks supersede the legacy single-axis fields when
  // the row carries them: `employer_kind` can read "direct_employer" for an
  // employer whose business model is unknown, and `last_verified_at` carries
  // no method. Absent blocks leave the legacy rendering untouched.
  const hasEmployerProfile = employerProfileOf(job) !== null;
  const hasAvailability = availabilityOf(job) !== null;
  const appState = applicationStateLabel(jobStatus, { opened: applyConfirmPending });

  const specialties = (job.role_specialties ?? []).slice(0, 4);
  const applyHref = job.apply_url || job.canonical_url;
  const title = job.normalized_title || job.title_raw;

  const toggleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await (saved ? onUnsave?.(job.job_id) : onSave?.(posting));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Tailor: record `tailor_started` through the existing flow, then hand the
   * posting to Craft. Feed rows never carry a description, so the JD is
   * recovered from the posting URL first; a failed fetch hands off with
   * `jd_fetch_failed` so Tailor can prompt for a paste instead of opening
   * silently empty.
   */
  const startTailor = async () => {
    if (tailoring) return;
    setTailoring(true);
    try {
      await onApplyWithTailor?.(posting);

      let jdText = '';
      let fetchFailed = false;
      if (applyHref) {
        const cached = readCachedJdText(applyHref);
        if (cached) {
          jdText = cached;
        } else {
          const resp = await apiService.fetchJobDescription(applyHref);
          if (resp.data?.ok && resp.data.jd_text) {
            jdText = resp.data.jd_text.trim();
            cacheJdText(applyHref, jdText);
          } else {
            fetchFailed = true;
          }
        }
      }

      stagePendingTailorJob({
        job_id: job.job_id,
        jd_text: fetchFailed ? '' : jdText,
        jd_fetch_failed: fetchFailed,
        title,
        company: job.employer_name,
        url: applyHref,
      });
    } catch {
      toast.error('Could not open Tailor');
    } finally {
      setTailoring(false);
    }
  };

  const showInlineApplyConfirm =
    applyConfirmPending && !!onConfirmApplied && applyConfirmModalJobId !== job.job_id;

  // Offered only while the posting is NOT already in the applied part of the
  // funnel - "mark as applied" on something already marked is noise.
  const showAlreadyApplied =
    !!onAlreadyApplied && !isAppliedSavedJob({ status: jobStatus ?? undefined });

  return (
    <article
      className={cn(
        'rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors',
        'focus-within:ring-2 focus-within:ring-ring hover:border-primary/40',
        ineligible ? 'border-warning/50 bg-warning/[0.04]' : 'border-border',
        className,
      )}
      aria-labelledby={`tech-feed-job-title-${job.job_id}`}
      data-testid="tech-feed-job-card"
      data-job-id={job.job_id}
      data-eligibility={eligibility}
    >
      {/* Title + employer */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3
            id={`tech-feed-job-title-${job.job_id}`}
            className="text-sm font-semibold leading-snug text-foreground"
          >
            {title}
          </h3>
          {job.normalized_title && job.title_raw && job.normalized_title !== job.title_raw && (
            <p className="text-xs text-muted-foreground">Listed as {job.title_raw}</p>
          )}
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            <span className="font-medium text-foreground">{job.employer_name}</span>
            {job.employer_name_conflict && (
              <span
                title={
                  job.employer_name_variants?.length
                    ? `Also listed as: ${job.employer_name_variants.join(', ')}`
                    : 'Sources disagree on this employer name.'
                }
              >
                (name disputed)
              </span>
            )}
          </p>
        </div>

        {/* Screening verdict. An ineligible row gets NO match band: a band
            would say the candidate clears screening, and it has just been
            said that they do not. */}
        <div className="flex shrink-0 flex-col items-end gap-1" data-testid="tech-feed-match">
          {ineligible ? (
            <Badge
              variant="outline"
              className="gap-1 border-warning/40 bg-warning/10 font-normal text-warning"
            >
              <ShieldAlert className="h-3 w-3" aria-hidden />
              Does not meet a stated requirement
            </Badge>
          ) : !scored || eligibility === 'not_scored' ? (
            <Badge
              variant="outline"
              className="border-dashed border-border bg-muted/50 font-normal text-muted-foreground"
              title={
                'We have not compared this posting to your resume. That is ' +
                'usually because there is no parsed resume on your account yet.'
              }
              data-testid="tech-feed-not-scored"
            >
              Not scored
            </Badge>
          ) : (
            <>
              <Badge
                variant="secondary"
                className="tabular-nums"
                title="How well your resume covers this posting. Not a chance of getting an interview."
              >
                {Math.round(job.match_score)}% match
              </Badge>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-px text-[10px] font-semibold',
                  band.chip,
                )}
              >
                {band.label}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Why the engine will not put this candidate forward. Stated reasons only. */}
      {ineligible && ineligibleReasons.length > 0 && (
        <ul className="mt-3 space-y-0.5 text-xs text-warning" data-testid="tech-feed-ineligible">
          {ineligibleReasons.slice(0, 4).map((reason) => (
            <li key={reason} className="flex items-start gap-1.5">
              <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {reason}
            </li>
          ))}
        </ul>
      )}

      {/* Work-authorization signals. Facts about the posting and the employer:
          what the employer stated, and what the public filing record shows.
          Each renders only when the data says so - nothing here is inferred
          from silence, and none of it is a judgement about the reader. */}
      {(clearance || noSponsorship || employerSponsorship) && (
        <ul
          className="mt-3 flex flex-wrap items-center gap-1.5"
          aria-label="Work authorization and clearance signals"
          data-testid="tech-feed-work-auth-signals"
        >
          {clearance && (
            <li>
              <ClearanceRequiredBadge detail={clearance.detail} />
            </li>
          )}
          {noSponsorship && (
            <li>
              <NoSponsorshipBadge />
            </li>
          )}
          {employerSponsorship && (
            <li>
              <EmployerSponsorshipBadge signal={employerSponsorship} />
            </li>
          )}
        </ul>
      )}

      {/* Role taxonomy */}
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Role classification">
        {job.role_family && (
          <li>
            <Badge variant="outline" className="font-normal">
              {labels[job.role_family] ?? humanize(job.role_family)}
            </Badge>
          </li>
        )}
        {specialties.map((specialty) => (
          <li key={specialty}>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {labels[specialty] ?? humanize(specialty)}
            </Badge>
          </li>
        ))}
        {job.tech_scope && job.tech_scope !== 'core' && (
          <li>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {humanize(job.tech_scope)}
            </Badge>
          </li>
        )}
        {job.seniority && job.seniority !== 'unknown' && (
          <li>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {humanize(job.seniority)}
            </Badge>
          </li>
        )}
      </ul>

      {/* Facts grid */}
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
        <div className="flex items-start gap-1.5">
          <dt className="sr-only">Work arrangement and location</dt>
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <dd className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {WORK_MODE_LABEL[job.work_mode] ?? humanize(job.work_mode)}
            </span>{' '}
            - {locationText}
            {job.remote_eligibility && (
              <span className="block">Eligible from: {job.remote_eligibility}</span>
            )}
          </dd>
        </div>

        <div className="flex items-start gap-1.5">
          <dt className="sr-only">Salary</dt>
          <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <dd
            className={cn(
              job.salary?.published ? 'font-medium text-foreground' : 'italic text-muted-foreground',
            )}
            data-testid="tech-feed-salary"
          >
            {pay}
          </dd>
        </div>

        <div className="flex items-start gap-1.5">
          <dt className="sr-only">Posting date and freshness</dt>
          <CalendarClock
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <dd className="text-muted-foreground" data-testid="tech-feed-posted">
            <span className={cn(posted.caveat ? 'italic' : 'text-foreground')}>{posted.text}</span>
            {posted.caveat && <span className="block">{posted.caveat}</span>}
            {verified && !hasAvailability && (
              <span className="block text-foreground" data-testid="tech-feed-verified">
                Live on the source board, {verified}
              </span>
            )}
          </dd>
        </div>

        <div className="flex items-start gap-1.5">
          <dt className="sr-only">Sponsorship</dt>
          <ShieldQuestion
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <dd
            className={cn(job.sponsorship ? 'text-foreground' : 'italic text-muted-foreground')}
            data-testid="tech-feed-sponsorship"
          >
            {sponsorshipLabel(job)}
            {job.clearance_required && (
              <span className="block text-foreground">Security clearance required</span>
            )}
          </dd>
        </div>
      </dl>

      {/* Provenance */}
      <ul
        className="mt-3 flex flex-wrap items-center gap-1.5"
        aria-label="Where this posting came from"
        data-testid="tech-feed-provenance"
      >
        {!hasEmployerProfile && (
          <li>
            <Badge
              variant={job.employer_kind === 'direct_employer' ? 'secondary' : 'outline'}
              className="gap-1 font-normal"
            >
              <Globe2 className="h-3 w-3" aria-hidden />
              {EMPLOYER_KIND_LABEL[job.employer_kind] ?? humanize(job.employer_kind)}
            </Badge>
          </li>
        )}
        {job.source && (
          <li>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              Via {humanize(job.source)}
            </Badge>
          </li>
        )}
        {job.ats && (
          <li>
            <Badge variant="outline" className="font-normal text-muted-foreground">
              {humanize(job.ats)}
            </Badge>
          </li>
        )}
        {/* Both states are stated. "Not direct" is a fact a seeker wants
            before clicking, not an absence to be inferred from a missing chip. */}
        <li>
          <Badge
            variant="outline"
            className="gap-1 font-normal text-muted-foreground"
            data-testid="tech-feed-direct-apply"
          >
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            {job.direct_apply
              ? "Apply on the employer's own board"
              : 'Apply via a job board'}
          </Badge>
        </li>
      </ul>

      {/* Employer type, posting relationship, availability with its method,
          the application destination and any warnings. Renders nothing for a
          row from a backend that predates employer-policy-1.0.0. */}
      <JobEmployerContext
        row={job}
        sourceLabel={job.source ? humanize(job.source) : null}
        className="mt-2"
      />

      {/* Duplicates / variants */}
      {(otherLocations > 0 || otherBoards.length > 0) && (
        <p
          className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground"
          data-testid="tech-feed-variants"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden />
          {otherLocations > 0 && (
            <span>
              Also in {otherLocations} other location{otherLocations === 1 ? '' : 's'}
            </span>
          )}
          {otherBoards.length > 0 && <span>Also on {otherBoards.join(', ')}</span>}
        </p>
      )}

      {/* How close this discipline is to the candidate's. `detail` comes from
          the scoring engine and is rendered VERBATIM - it is written to be
          read, and paraphrasing it would put a claim in the engine's mouth. */}
      {alignment && (
        <div className="mt-3" data-testid="tech-feed-role-alignment">
          <h4 className="text-xs font-semibold text-foreground">
            {roleAlignmentLabel(alignment.tier)}
          </h4>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Target className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            {alignment.detail}
          </p>
        </div>
      )}

      {/* Why matched */}
      {job.why_matched?.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold text-foreground">Why this matched</h4>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {job.why_matched.slice(0, 4).map((reason) => (
              <li key={reason} className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* The score's receipts. A 45 with a visible breakdown is a reason; a
          bare 45 is a verdict nobody can argue with. Rendered only from what
          the engine sent - `normalizeFit` invents no component and no band. */}
      {fitBreakdown && (
        <Collapsible open={fitOpen} onOpenChange={setFitOpen} className="mt-3">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              data-testid="tech-feed-why-score"
            >
              {fitOpen ? 'Hide the score breakdown' : 'Why this score'}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {fitBreakdown.explanation && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {fitBreakdown.explanation}
              </p>
            )}
            <GuestFitBreakdown fit={fitBreakdown} />
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Stated gates the resume is silent about. A requirement to READ, never
          a deduction: nothing on a resume can contradict "holds a clearance". */}
      {requirements.length > 0 && (
        <div className="mt-3" data-testid="tech-feed-requirements">
          <h4 className="text-xs font-semibold text-foreground">Requirements to check</h4>
          <p className="text-[11px] text-muted-foreground">
            Read these before applying. They are not counted against your score.
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {requirements.slice(0, 4).map((entry) => (
              <li key={`${entry.type}-${entry.key ?? ''}`} className="flex items-start gap-1.5">
                <HelpCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {entry.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unverifiable constraints - stated as unknowns, never as rejections */}
      {job.hard_constraint_mismatches?.length > 0 && (
        <div className="mt-3" data-testid="tech-feed-unknowns">
          <h4 className="text-xs font-semibold text-foreground">Important unknowns</h4>
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {job.hard_constraint_mismatches.slice(0, 4).map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <HelpCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Did you apply? Asked in the card when the page dialog is not already
          asking about this exact posting. */}
      {showInlineApplyConfirm && (
        <div
          className="mt-3 rounded-lg border border-border bg-muted/30 p-2 text-xs"
          data-testid="tech-feed-apply-confirm"
        >
          <p className="text-foreground">Did you apply for this role?</p>
          <div className="mt-1.5 flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={() => void onConfirmApplied?.(posting)}
            >
              Yes, I applied
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => onConfirmNotYet?.(job.job_id)}
            >
              Not yet
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {onQuickApply ? (
          <Button
            type="button"
            size="sm"
            className="focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              onEngagement?.('card_apply_click', job.ats);
              void onQuickApply(posting);
            }}
          >
            Apply
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">
              {' '}
              to {title} at {job.employer_name} (opens in a new tab)
            </span>
          </Button>
        ) : (
          <Button asChild size="sm" className="focus-visible:ring-2 focus-visible:ring-ring">
            <a href={applyHref} target="_blank" rel="noopener noreferrer">
              Apply
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">
                {' '}
                to {title} at {job.employer_name} (opens in a new tab)
              </span>
            </a>
          </Button>
        )}

        {onApplyWithTailor && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={tailoring}
            className="gap-1.5 focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => void startTailor()}
          >
            {tailoring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Wand2 className="h-3.5 w-3.5" aria-hidden />
            )}
            Tailor and apply
          </Button>
        )}

        {(onSave || onUnsave) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            className="gap-1.5 text-xs focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={saved}
            aria-label={saved ? `Remove ${title} from saved jobs` : `Save ${title}`}
            onClick={() => void toggleSave()}
          >
            {saved ? (
              <BookmarkCheck className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <BookmarkPlus className="h-3.5 w-3.5" aria-hidden />
            )}
            {saved ? 'Saved' : 'Save'}
          </Button>
        )}

        {onAutoApply && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={autoApplying}
            className="gap-1.5 text-xs focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => void onAutoApply(posting)}
          >
            {autoApplying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Zap className="h-3.5 w-3.5" aria-hidden />
            )}
            Auto Apply
          </Button>
        )}

        {showAlreadyApplied && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => void onAlreadyApplied?.(posting)}
          >
            I already applied
          </Button>
        )}

        <NotInterestedMenu
          jobId={job.job_id}
          employerName={job.employer_name}
          jobTitle={title}
          dedupeGroupId={job.dedupe_group_id}
          employerId={job.employer_id}
          searchId={searchId}
          onDismissed={onNotInterested}
          onRestored={onRestore}
        />

        {jobStatus && (
          <span className="ml-auto text-[11px] text-muted-foreground" data-testid="tech-feed-tracker-state">
            In your tracker: {appState?.label ?? humanize(jobStatus)}
          </span>
        )}
      </div>
    </article>
  );
}

export default TechFeedJobCard;
