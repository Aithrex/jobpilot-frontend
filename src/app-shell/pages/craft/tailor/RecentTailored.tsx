/**
 * The newest tailored resumes, under the Tailor start form.
 *
 * Someone who comes back to Resume usually wants one of two things: tailor
 * for a new job, or pick up one they already made. This puts the second one
 * a single click from the first, without a separate overview page.
 *
 * Reads the shell's shared model; renders nothing when mounted outside the
 * Resume shell, while loading, or when there is nothing tailored yet.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, FileCheck2 } from 'lucide-react';
import { appPath } from '@/app-shell/nav.config';
import { atsOverall } from '@/lib/atsScores';
import { toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import { formatDate } from '@/components/resume/ResumeDashboard';
import { useOptionalResumeWorkspace } from '../ResumeWorkspaceContext';
import { scoreTone } from './primitives';

const LIMIT = 3;

export function RecentTailored() {
  const workspace = useOptionalResumeWorkspace();
  if (!workspace || workspace.tailoredState !== 'ready') return null;
  const records = workspace.recentRecords.slice(0, LIMIT);
  if (records.length === 0) return null;

  return (
    <section aria-label="Recently tailored" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-h3 text-foreground">Recently tailored</h2>
        <Link
          to={appPath('resume', 'tailored')}
          className="hit-target inline-flex items-center gap-1 rounded-sm text-caption font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {workspace.tailoredCount > records.length ? `See all ${workspace.tailoredCount}` : 'See all'}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {records.map((record) => {
          const role = toTitleCase(record.jd_analysis?.job_title) || 'Untitled role';
          const companyRaw = record.jd_analysis?.company;
          const company = companyRaw && companyRaw !== 'Not specified' ? toTitleCase(companyRaw) : null;
          const score = atsOverall(record.ats_scores);
          return (
            <li key={record.record_id}>
              <Link
                to={appPath('resume', 'tailored')}
                aria-label={`Open the resume tailored for ${role}${company ? ` at ${company}` : ''}`}
                className={cn(
                  'group flex h-full items-center gap-3 rounded-container border border-border bg-card px-4 py-3 shadow-soft outline-none',
                  'transition-colors duration-fast ease-standard hover:border-primary/40',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">{role}</span>
                  <span className="block truncate text-caption text-muted-foreground">
                    {company ?? 'Company not specified'}
                    {record.created_at ? ` · ${formatDate(record.created_at)}` : ''}
                  </span>
                </span>
                {typeof score === 'number' && (
                  <span className="shrink-0 text-right">
                    <span className={cn('block font-mono text-sm font-semibold tabular-nums', scoreTone(score).text)}>
                      {score}
                    </span>
                    <span className="block text-caption-sm text-muted-foreground">match score</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
