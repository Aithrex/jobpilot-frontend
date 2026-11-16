/**
 * The newest tailored resumes, as one line at the TOP of the Tailor start
 * screen.
 *
 * Someone who comes back to Resume usually wants one of two things: tailor for
 * a new job, or pick up one they already made. This used to sit under the
 * whole form, so the second one needed a scroll nobody knew to do (owner,
 * 2026-11-16). Now it is a strip of chips above the form: each opens that
 * resume on the Tailored page, and "See all" opens the full list.
 *
 * Reads the shell's shared model; renders nothing when mounted outside the
 * Resume shell, while loading, or when there is nothing tailored yet.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, FileCheck2, History } from 'lucide-react';
import { appPath } from '@/app-shell/nav.config';
import { atsOverall } from '@/lib/atsScores';
import { toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import { formatDate } from '@/components/resume/ResumeDashboard';
import { useOptionalResumeWorkspace } from '../ResumeWorkspaceContext';
import { scoreTone } from './primitives';

const LIMIT = 4;

export function RecentTailored({ className }: { className?: string }) {
  const workspace = useOptionalResumeWorkspace();
  if (!workspace || workspace.tailoredState !== 'ready') return null;
  const records = workspace.recentRecords.slice(0, LIMIT);
  if (records.length === 0) return null;
  const total = workspace.tailoredCount;

  return (
    <section
      aria-label="Recently tailored"
      className={cn('flex min-w-0 items-center gap-2', className)}
    >
      <span className="hidden shrink-0 items-center gap-1.5 text-caption font-semibold text-muted-foreground sm:inline-flex">
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Recent
      </span>
      <ul className="scrollbar-hide flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pr-6 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]">
        {records.map((record) => {
          const role = toTitleCase(record.jd_analysis?.job_title) || 'Untitled role';
          const companyRaw = record.jd_analysis?.company;
          const company = companyRaw && companyRaw !== 'Not specified' ? toTitleCase(companyRaw) : null;
          const score = atsOverall(record.ats_scores);
          const when = record.created_at ? formatDate(record.created_at) : '';
          return (
            <li key={record.record_id} className="shrink-0">
              <Link
                to={`${appPath('resume', 'tailored')}?open=${encodeURIComponent(record.record_id)}`}
                title={[role, company, when].filter(Boolean).join(' · ')}
                aria-label={`Open the resume tailored for ${role}${company ? ` at ${company}` : ''}`}
                className={cn(
                  'press group inline-flex max-w-[17rem] items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3 shadow-soft outline-none',
                  'transition-colors duration-fast ease-standard hover:border-primary/40 hover:bg-primary/5',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate text-caption">
                  <span className="font-semibold text-foreground group-hover:text-primary">{role}</span>
                  {company && <span className="text-muted-foreground"> · {company}</span>}
                </span>
                {typeof score === 'number' && (
                  <span
                    className={cn('shrink-0 font-mono text-caption font-semibold tabular-nums', scoreTone(score).text)}
                    title="ATS score"
                  >
                    {score}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        to={appPath('resume', 'tailored')}
        className="hit-target inline-flex shrink-0 items-center gap-1 rounded-sm text-caption font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {total > records.length ? `See all ${total}` : 'See all'}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </section>
  );
}
