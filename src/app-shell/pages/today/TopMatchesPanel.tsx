/**
 * Home - "What's new and strong?"
 *
 * The founder's brief: show the top matching jobs on the landing screen with an
 * obvious way into the full list. This panel is that, and nothing more - it is
 * a READ of the job feed the Jobs tab already owns, not a second feed. It
 * mounts the shared `CombinedJobsProvider` scan (`ensureStarted`, idempotent
 * and server-cached) so opening Home at 9am is the same cost as opening Jobs,
 * and the results are already warm when the user clicks through.
 *
 * Every async state is designed, because "silently nothing" is the failure this
 * redesign exists to remove:
 *   loading  - skeleton rows in the final layout (zero shift when data lands)
 *   partial  - real rows plus an honest "still scanning" line with progress
 *   empty    - two distinct kinds: no search titles yet vs. nothing matched
 *   error    - recoverable, with the retry that actually re-runs the scan
 *   degraded - some catalogs failed but others returned; say so, show the rest
 */
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  BriefcaseBusiness,
  Loader2,
  MapPin,
  Search,
  Upload,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CompanyLogo } from '@/components/CompanyLogo';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { WhyThisScoreButton } from '@/components/job-search/JobFitDetails';
import { fitBandOf } from '@/components/job-search/fitBands';
import { RECENCY_OPTIONS, toJob, type SeniorityLevel } from '@/lib/careerJobs';
import { toTitleCase } from '@/lib/format';
import { listContainer, listItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/jobs';
import { PanelCard, PanelEmpty, PanelError, Stat, ZoneHeading } from './primitives';

const JOBS_HREF = '/app/jobs/for-you';
const RESUME_HREF = '/app/resume/library';
const TOP_N = 5;

/** Short labels mirrored from ExperienceLevelPicker so the dashboard chip reads
 *  the same vocabulary as the "For you" board's experience control. */
const LEVEL_SHORT: Record<SeniorityLevel, string> = {
  intern: 'Intern',
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  staff: 'Staff+',
};

function levelSummary(levels: readonly SeniorityLevel[]): string {
  return levels.map((l) => LEVEL_SHORT[l]).join(' + ');
}

function RowSkeleton() {
  return (
    <li className="flex items-center gap-3 rounded-control border border-border/60 p-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
    </li>
  );
}

function MatchRow({ job }: { job: Job }) {
  // The ROW, not the number: a `match_score` with no engine version stamp
  // gets no band words and no figure. See `fitBands.isFitScored`.
  const band = fitBandOf(job);
  const title = toTitleCase(job.title);
  const company = toTitleCase(job.company);
  const location = toTitleCase(job.location);
  const scored = band.key !== 'unscored';

  return (
    <motion.li
      variants={listItem}
      className="group flex flex-col gap-2 rounded-control border border-border/60 bg-background/40 p-3 transition-[border-color,background-color] duration-base ease-expo hover:border-primary/40 hover:bg-accent/40 sm:flex-row sm:items-center sm:gap-3"
    >
      <CompanyLogo
        company={job.company || job.title || 'Aspirely'}
        logoUrl={job.logo_url}
        size={40}
        className="shrink-0"
      />

      <div className="min-w-0 flex-1">
        {/* The title is the link. The score button is a SIBLING, never nested
            inside the anchor - nested interactives break keyboard order. */}
        <a
          href={job.apply_link || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="interactive block truncate rounded-sm text-body font-semibold text-foreground hover:text-primary"
          title={title}
        >
          {title}
          <ArrowUpRight
            className="ml-1 inline h-3.5 w-3.5 -translate-y-px opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100"
            aria-hidden
          />
          <span className="sr-only"> (opens the posting in a new tab)</span>
        </a>
        <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-caption text-muted-foreground">
          <span className="truncate font-medium text-foreground/80">{company}</span>
          {location && (
            <>
              <span aria-hidden>·</span>
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{location}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            band.chip,
          )}
        >
          {scored && <Stat>{Math.round(job.match_score)}</Stat>}
          {band.label}
        </span>
        <WhyThisScoreButton job={job} />
      </div>
    </motion.li>
  );
}

export function TopMatchesPanel() {
  const feed = useCombinedJobsCtx();
  const reduce = useReducedMotion();
  const { ensureStarted, seniorityLevels, sortBy, visibleJobs, recency } = feed;

  // Warm the shared scan. Idempotent, and `useAutoSync` fires a NON-forced
  // (server-cached) initial run, so this costs what opening Jobs costs.
  useEffect(() => {
    ensureStarted();
  }, [ensureStarted]);

  const rows = useMemo(() => visibleJobs.slice(0, TOP_N).map((job) => toJob(job, 'portal')), [visibleJobs]);
  const activeLevels = seniorityLevels;
  const showExperienceChip = activeLevels.length > 0;

  const sourceStates = [feed.states.workday, feed.states.careers, feed.states.mncs];
  const failedCount = sourceStates.filter((s) => s.error).length;
  const allFailed = failedCount === sourceStates.length;

  const exploreLink = (
    <Link
      to={JOBS_HREF}
      className="interactive group inline-flex min-h-11 items-center gap-1.5 rounded-control px-3 text-caption font-semibold text-primary hover:bg-primary/10"
    >
      Explore all jobs
      <ArrowRight className="icon-advance h-3.5 w-3.5" aria-hidden />
    </Link>
  );

  /* ── State resolution, most specific first ───────────────────────────── */

  let body: React.ReactNode;

  if (feed.ready && !feed.canSearch) {
    // No titles to search with: almost always "no resume parsed yet".
    body = (
      <PanelEmpty
        icon={Upload}
        title="Tell us what you are looking for"
        body="Matches come from your resume. Add one (or set your target job titles) and roles will start showing up here every morning."
        action={
          <Link
            to={RESUME_HREF}
            className="interactive interactive-press inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 text-caption font-semibold text-primary-foreground"
          >
            Add your resume <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />
    );
  } else if (rows.length === 0 && allFailed) {
    body = (
      <PanelError
        title="We could not reach the job sources"
        body="Nothing is lost. This is usually a passing network or provider hiccup."
        onRetry={() => feed.sync(true)}
      />
    );
  } else if (rows.length === 0 && (feed.loading || !feed.ready)) {
    body = (
      <ul className="space-y-2" aria-busy="true" aria-label="Loading your top matches">
        {Array.from({ length: 3 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </ul>
    );
  } else if (rows.length === 0 && feed.hasResult) {
    body = (
      <PanelEmpty
        icon={Search}
        title="No roles match your current filters"
        body="That is normal on a quiet day. Widen the date window or add a job title, and we will keep scanning in the background."
        action={
          <Link
            to={JOBS_HREF}
            className="interactive interactive-press inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 text-caption font-semibold text-primary-foreground"
          >
            Adjust your search <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        }
      />
    );
  } else if (rows.length === 0) {
    // Ready, not loading, no result yet, no error: the scan has not begun.
    body = (
      <PanelEmpty
        icon={Briefcase}
        title="Ready when you are"
        body="Run a scan and the strongest roles for your resume will land here."
        action={
          <button
            type="button"
            onClick={() => feed.sync(false)}
            className="interactive interactive-press inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 text-caption font-semibold text-primary-foreground"
          >
            Find roles <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        }
      />
    );
  } else {
    body = (
      <motion.ul
        initial={reduce ? false : 'hidden'}
        animate="visible"
        variants={listContainer}
        className="space-y-2"
      >
        {rows.map((job) => (
          <MatchRow key={job.job_id} job={job} />
        ))}
      </motion.ul>
    );
  }

  /* ── Partial / degraded notes, shown ALONGSIDE whatever body we picked ── */

  const scanning = feed.loading && rows.length > 0;
  const degraded = failedCount > 0 && !allFailed && rows.length > 0;

  return (
    <PanelCard aria-label="Top matches">
      <ZoneHeading
        title="Top matches for you"
        hint={`${RECENCY_OPTIONS.find((option) => option.key === recency)?.label ?? 'Today'} - ${visibleJobs.length} matching roles. Showing ${rows.length}${sortBy === 'score' ? ', strongest first' : ', newest first'}.`}
        action={exploreLink}
      />

      {showExperienceChip && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[0.75rem] font-medium text-primary">
            <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden />
            {levelSummary(activeLevels)}
          </span>
          <span className="min-w-0">
            Using your selected experience levels.{' '}
            <Link
              to={JOBS_HREF}
              className="interactive rounded-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Change on the board
            </Link>
          </span>
        </p>
      )}

      {feed.resumeSkillCount === 0 && (
        <p className="mb-3 flex items-start gap-2 rounded-control border border-warning/30 bg-warning/10 p-2.5 text-caption text-warning">
          <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            These roles are not scored yet - we could not read skills off your resume.{' '}
            <Link to={RESUME_HREF} className="font-semibold underline underline-offset-2">
              Check your resume
            </Link>
            .
          </span>
        </p>
      )}

      {body}

      <p className="sr-only" role="status" aria-live="polite">
        {scanning
          ? 'Still scanning for more roles.'
          : rows.length > 0
            ? `Showing your top ${rows.length} matches.`
            : ''}
      </p>

      {scanning && (
        <p className="mt-3 flex items-center gap-2 text-caption text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
          Still scanning
          {feed.progress.total > 0 && (
            <>
              {' '}
              <Stat>
                {feed.progress.done}/{feed.progress.total}
              </Stat>{' '}
              employers
            </>
          )}
          - this list keeps improving.
        </p>
      )}

      {degraded && (
        <p className="mt-3 text-caption text-muted-foreground">
          {failedCount === 1 ? 'One job source' : `${failedCount} job sources`} did not respond, so
          this list is partial.{' '}
          <button
            type="button"
            onClick={() => feed.sync(true)}
            className="interactive rounded-sm font-semibold text-primary underline underline-offset-2"
          >
            Rescan
          </button>
        </p>
      )}
    </PanelCard>
  );
}
