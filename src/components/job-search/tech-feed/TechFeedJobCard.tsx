/**
 * One posting in the tech feed.
 *
 * The card's job is to be HONEST about what the index knows:
 *  - a salary is shown only when `salary.published` is true, otherwise the
 *    card says "Salary not published" rather than implying a range;
 *  - a posting date is shown only when `posted_at_confidence` is "exact".
 *    "relative" is hedged, "unknown" falls back to first-seen and says the
 *    posting date is unknown. A date is never invented;
 *  - `hard_constraint_mismatches` are surfaced as "Important unknowns", not as
 *    disqualifications - they are things the index could not verify;
 *  - provenance (direct employer vs staffing, which source, which ATS) is on
 *    the face of the card, because "who is actually hiring" is the single most
 *    misrepresented fact in job search.
 */
import { useMemo } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Globe2,
  HelpCircle,
  Layers,
  MapPin,
  ShieldQuestion,
  Wallet,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NotInterestedMenu } from '@/components/job-search/tech-feed/NotInterestedMenu';
import type { NotInterestedReason, TechFeedJob } from '@/types/techFeed';

interface TechFeedJobCardProps {
  job: TechFeedJob;
  /** key -> label from the taxonomy, so chips read as words not slugs. */
  labels?: Record<string, string>;
  onNotInterested: (jobId: string, reason: NotInterestedReason) => void;
  onRestore?: (jobId: string) => void;
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
    caveat: 'Posting date unknown.',
  };
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
  onNotInterested,
  onRestore,
  className,
}: TechFeedJobCardProps) {
  const posted = useMemo(() => postedLabel(job), [job]);
  const pay = useMemo(() => salaryLabel(job), [job]);
  const lastVerified = formatDate(job.last_verified_at);

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

  const specialties = (job.role_specialties ?? []).slice(0, 4);
  const applyHref = job.apply_url || job.canonical_url;

  return (
    <article
      className={cn(
        'rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm transition-colors',
        'focus-within:ring-2 focus-within:ring-ring hover:border-primary/40',
        className,
      )}
      aria-labelledby={`tech-feed-job-title-${job.job_id}`}
      data-testid="tech-feed-job-card"
      data-job-id={job.job_id}
    >
      {/* Title + employer */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3
            id={`tech-feed-job-title-${job.job_id}`}
            className="text-sm font-semibold leading-snug text-foreground"
          >
            {job.normalized_title || job.title_raw}
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

        {job.match_score > 0 && (
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {Math.round(job.match_score)}% match
          </Badge>
        )}
      </div>

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
          <dt className="sr-only">Posting date</dt>
          <CalendarClock
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <dd className="text-muted-foreground" data-testid="tech-feed-posted">
            <span className={cn(posted.caveat ? 'italic' : 'text-foreground')}>{posted.text}</span>
            {posted.caveat && <span className="block">{posted.caveat}</span>}
            {lastVerified && <span className="block">Last verified {lastVerified}</span>}
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
        <li>
          <Badge
            variant={job.employer_kind === 'direct_employer' ? 'secondary' : 'outline'}
            className="gap-1 font-normal"
          >
            <Globe2 className="h-3 w-3" aria-hidden />
            {EMPLOYER_KIND_LABEL[job.employer_kind] ?? humanize(job.employer_kind)}
          </Badge>
        </li>
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
        {job.direct_apply && (
          <li>
            <Badge variant="outline" className="gap-1 font-normal text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Applies on the employer site
            </Badge>
          </li>
        )}
      </ul>

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

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" className="focus-visible:ring-2 focus-visible:ring-ring">
          <a href={applyHref} target="_blank" rel="noopener noreferrer">
            Apply
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">
              {' '}
              to {job.normalized_title || job.title_raw} at {job.employer_name} (opens in a new tab)
            </span>
          </a>
        </Button>
        <NotInterestedMenu
          jobId={job.job_id}
          employerName={job.employer_name}
          jobTitle={job.normalized_title || job.title_raw}
          onDismissed={onNotInterested}
          onRestored={onRestore}
        />
      </div>
    </article>
  );
}

export default TechFeedJobCard;
