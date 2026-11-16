/**
 * The right-hand column before anything is tailored: the resume we will start
 * from, shown as the real file.
 *
 * The preview frame used to sit empty here ("Ready to tailor"), which told a
 * first-time user nothing. Showing their own resume makes the page read as a
 * before and after: this is your resume now, paste a job, the tailored
 * version takes its place.
 */
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { appPath } from '@/app-shell/nav.config';
import { ResumeFilePreview } from '../ResumeFilePreview';
import type { ResumeAssetRow } from '@/types/resume';

export function StartPreview({ resume }: { resume: ResumeAssetRow | null }) {
  return (
    <div className="overflow-hidden rounded-container border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-caption-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your resume now
          </p>
          {resume && (
            <p className="truncate text-sm font-medium text-foreground">{resume.filename}</p>
          )}
        </div>
        <Link
          to={appPath('resume', 'library')}
          className="hit-target inline-flex shrink-0 items-center gap-1 rounded-sm text-caption font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {resume ? 'Change or add a resume' : 'Open my resumes'}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="space-y-3 bg-muted/40 p-3 sm:p-4">
        {resume ? (
          <ResumeFilePreview resume={resume} frameClassName="h-[min(62vh,640px)]" compactFallback />
        ) : (
          <p className="rounded-container border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            Your resume is not ready yet. We may still be reading it, or the file could not be read.
          </p>
        )}
        <p className="hidden px-1 text-caption leading-snug text-muted-foreground lg:block">
          After you tailor, the new version appears here with every change marked, so you can compare it with this one.
        </p>
      </div>
    </div>
  );
}
