/**
 * Resume workspace overview - the centre canvas at `/app/resume`.
 *
 * This is CONTENT, and is styled to say so: solid `bg-card` surfaces, no
 * glass, no chevrons on anything that is not genuinely a destination. The
 * navigable surfaces of this page are the left dock and the right tool tiles;
 * keeping this column visually plainer is what makes those read as clickable.
 *
 * Two questions in reading order - what am I working from, what have I
 * produced lately - each answered from data the section already loads and
 * each failing independently.
 */
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { appPath } from '@/app-shell/nav.config';
import { atsOverall } from '@/lib/atsScores';
import { toTitleCase } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelEmpty, PanelError, StatusPill } from '@/app-shell/pages/today/primitives';
import { formatBytes, formatDate, type BaseResume } from '@/components/resume/ResumeDashboard';
import { useResumeWorkspaceContext } from './ResumeWorkspaceContext';
import { ResumeFilePreview } from './ResumeFilePreview';
import type { TailoringRecord } from '@/types/resume';

/**
 * How many recent tailored versions the overview lists before deferring to
 * the Tailored page. Kept short because the resume preview above now occupies
 * the fold - this is a summary, not the list.
 */
const RECENT_LIMIT = 3;

/* ── Section shell ───────────────────────────────────────────────────────── */

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h2 text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ── 1. Active resume ────────────────────────────────────────────────────── */

/**
 * The active resume: an info row stating which file is in play, then the file
 * itself. The info row renders immediately from data already loaded; the
 * preview fetches independently and degrades to a fallback of its own, so a
 * slow or impossible preview never delays or breaks this card.
 */
function ActiveResumeCard({ resume }: { resume: BaseResume }) {
  const meta = [
    resume.uploaded_at ? `Updated ${formatDate(resume.uploaded_at)}` : null,
    resume.size_bytes ? formatBytes(resume.size_bytes) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-container border border-border bg-card p-4 shadow-soft">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-body font-medium text-foreground">{resume.filename}</p>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Active
            </span>
          </div>
          {meta && <p className="text-caption text-muted-foreground">{meta}</p>}
        </div>
        <Button asChild variant="outline" size="sm" className="min-h-11">
          <Link to={appPath('resume', 'library')}>Open library</Link>
        </Button>
      </div>

      <ResumeFilePreview resume={resume} />
    </div>
  );
}

/* ── 2. Recent tailored versions ─────────────────────────────────────────── */

/**
 * A full-width row where the WHOLE row is the link - not a small "Review"
 * text target at the end. Keyboard users get one stop per record, and the
 * trailing chevron plus a hover fill make the affordance visible without
 * relying on colour.
 */
function TailoredRow({ record }: { record: TailoringRecord }) {
  const role = toTitleCase(record.jd_analysis?.job_title) || 'Untitled role';
  const companyRaw = record.jd_analysis?.company;
  const company =
    companyRaw && companyRaw !== 'Not specified' ? toTitleCase(companyRaw) : null;
  const score = atsOverall(record.ats_scores);
  const status = record.application?.status;

  return (
    <li>
      <Link
        to={appPath('resume', 'tailored')}
        aria-label={`Review tailored resume for ${role}${company ? ` at ${company}` : ''}`}
        className={cn(
          'group flex min-h-[56px] flex-wrap items-center gap-x-3 gap-y-1 rounded-control px-3 py-2.5',
          'transition-colors duration-fast ease-standard outline-none',
          'hover:bg-foreground/[0.04]',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        )}
      >
        <span className="min-w-0 flex-1 basis-48">
          <span className="block truncate text-sm font-medium text-foreground">{role}</span>
          <span className="block truncate text-caption text-muted-foreground">
            {company ?? 'Company not specified'}
            {record.created_at ? ` · ${formatDate(record.created_at)}` : ''}
          </span>
        </span>

        {typeof score === 'number' && (
          <span className="shrink-0 font-mono text-caption tabular-nums text-muted-foreground">
            ATS {score}
          </span>
        )}
        {status && <StatusPill status={status} />}

        <ChevronRight
          className="icon-advance h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function ResumeOverviewPage() {
  const { resumesState, tailoredState, activeResume, recentRecords, reload } =
    useResumeWorkspaceContext();

  const recent = recentRecords.slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-8">
      <Section
        title="Your active resume"
        action={
          activeResume ? undefined : (
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link to={appPath('resume', 'library')}>Open library</Link>
            </Button>
          )
        }
      >
        {resumesState === 'loading' && <Skeleton className="h-24 rounded-container" />}
        {resumesState === 'error' && (
          <PanelError
            title="Could not load your resumes"
            body="The connection dropped or the server was busy. Your files are safe."
            onRetry={reload}
          />
        )}
        {resumesState === 'ready' &&
          (activeResume ? (
            <ActiveResumeCard resume={activeResume} />
          ) : (
            <PanelEmpty
              icon={UploadCloud}
              title="No resume yet"
              body="Upload a PDF or DOCX to use as the base for every tailored version."
              action={
                <Button asChild className="min-h-11">
                  <Link to={appPath('resume', 'library')}>Upload a resume</Link>
                </Button>
              }
            />
          ))}
      </Section>

      <Section
        title="Recent tailored versions"
        action={
          recent.length > 0 ? (
            <Button asChild variant="ghost" size="sm" className="min-h-11">
              <Link to={appPath('resume', 'tailored')}>View all</Link>
            </Button>
          ) : undefined
        }
      >
        {tailoredState === 'loading' && (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-control" />
            <Skeleton className="h-14 rounded-control" />
          </div>
        )}
        {tailoredState === 'error' && (
          <PanelError
            title="Could not load tailored versions"
            body="The connection dropped or the server was busy. Nothing was lost."
            onRetry={reload}
          />
        )}
        {tailoredState === 'ready' &&
          (recent.length > 0 ? (
            <ul className="divide-y divide-border rounded-container border border-border bg-card p-1 shadow-soft">
              {recent.map((record) => (
                <TailoredRow key={record.record_id} record={record} />
              ))}
            </ul>
          ) : (
            <PanelEmpty
              icon={FileText}
              title="Nothing tailored yet"
              body="Tailor your resume to a job description and the result will appear here."
              action={
                <Button asChild className="min-h-11">
                  <Link to={appPath('resume', 'tailor')}>Tailor a resume</Link>
                </Button>
              }
            />
          ))}
      </Section>
    </div>
  );
}
