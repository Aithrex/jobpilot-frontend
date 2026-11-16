/**
 * MyResumesPage - the resumes a person uploaded (lazy-mounted at
 * /app/resume/library).
 *
 * Three jobs, in the order people need them: see what is on file, add or
 * swap a file, and understand what Aspirely took from it. The last one is the
 * "What we read" panel: job matches are scored against those skills and
 * titles, so showing them is how someone finds out their matches are off
 * because the resume is out of date.
 *
 * Words are the user's, not the system's: a resume is "used for job
 * matching" (not "active"), a new upload is "being read" (not "parsing").
 */
import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, FileText, Loader2, UploadCloud, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { appPath } from '@/app-shell/nav.config';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelError } from '@/app-shell/pages/today/primitives';
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
import {
  type BaseResume,
  formatDate,
  formatBytes,
  TrashIcon,
} from '@/components/resume/ResumeDashboard';
import type { ResumeStatus } from '@/types/resume';

const MAX_BYTES = 5 * 1024 * 1024;
const SKILLS_SHOWN = 14;

/** What state the file is in, in a sentence fragment. */
function readState(r: BaseResume): { label: string; tone: 'ok' | 'wait' | 'bad' } {
  if (r.parse_status === 'pending') return { label: 'Reading your resume', tone: 'wait' };
  if (r.parse_status === 'failed') return { label: 'Could not read this file', tone: 'bad' };
  return { label: 'Ready', tone: 'ok' };
}

/** The facts job matching runs on, read from the resume in use. */
function WhatWeRead({ status }: { status: ResumeStatus }) {
  const skills = status.skills ?? [];
  const titles = status.job_titles ?? [];
  const years = status.experience_years;
  if (!skills.length && !titles.length && typeof years !== 'number') return null;

  return (
    <aside
      aria-label="What we read from your resume"
      className="space-y-4 rounded-container border border-border bg-card p-5 shadow-soft"
    >
      <div className="space-y-1">
        <h3 className="font-display text-h3 text-foreground">What we read from your resume</h3>
        <p className="text-caption leading-snug text-muted-foreground">
          {status.filename ? `From ${status.filename}. ` : ''}Your job matches are scored against
          this. If something is missing or out of date, upload a newer resume.
        </p>
      </div>
      <dl className="space-y-3 text-sm">
        {typeof years === 'number' && (
          <div>
            <dt className="text-caption font-medium text-muted-foreground">Experience</dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {years === 0 ? 'Less than a year' : `${years} ${years === 1 ? 'year' : 'years'}`}
            </dd>
          </div>
        )}
        {titles.length > 0 && (
          <div>
            <dt className="text-caption font-medium text-muted-foreground">Job titles you have held</dt>
            <dd className="mt-0.5 text-foreground">{titles.slice(0, 4).join(', ')}</dd>
          </div>
        )}
        {skills.length > 0 && (
          <div>
            <dt className="text-caption font-medium text-muted-foreground">
              Skills ({skills.length})
            </dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {skills.slice(0, SKILLS_SHOWN).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-caption-sm font-medium text-foreground"
                >
                  {skill}
                </span>
              ))}
              {skills.length > SKILLS_SHOWN && (
                <span className="px-1 py-0.5 text-caption-sm text-muted-foreground">
                  and {skills.length - SKILLS_SHOWN} more
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </aside>
  );
}

export default function MyResumesPage() {
  const [resumes, setResumes] = useState<BaseResume[]>([]);
  const [status, setStatus] = useState<ResumeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Upload/validation feedback stays separate from the list-load failure so
  // the load error can render a dedicated retryable panel.
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [settingActive, setSettingActive] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // Delete confirmation target - deletes are permanent, so they must be
  // confirmed through an AlertDialog rather than firing on first tap.
  const [pendingDelete, setPendingDelete] = useState<BaseResume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async ({ showSkeleton = false }: { showSkeleton?: boolean } = {}) => {
    // Post-action refreshes stay in place; only the initial load and explicit
    // retries repaint the skeleton.
    if (showSkeleton) setLoading(true);
    setLoadError('');
    const resp = await apiService.listBaseResumes();
    if (resp.data) setResumes(resp.data.versions || []);
    else if (resp.error) setLoadError(resp.error);
    setLoading(false);
    // What we read is a bonus panel: it must never block or break the list.
    try {
      const read = await apiService.getResumeStatus();
      setStatus(read?.data ?? null);
    } catch {
      setStatus(null);
    }
  }, []);
  useEffect(() => {
    load({ showSkeleton: true });
  }, [load]);

  const handleUpload = useCallback(
    async (file: File) => {
      const fname = file.name.toLowerCase();
      if (!fname.endsWith('.pdf') && !fname.endsWith('.docx')) {
        setError('Only PDF and DOCX files accepted');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('Max 5 MB');
        return;
      }
      setUploading(true);
      setError('');
      const resp = await apiService.uploadResumeForParser(file);
      setUploading(false);
      if (resp.error) {
        setError(resp.error);
        toast.error("Couldn't upload that file", { description: resp.error });
        return;
      }
      toast.success('Resume uploaded');
      await load();
    },
    [load],
  );

  const openFile = useCallback(async (r: BaseResume) => {
    setOpening(r.resume_id);
    try {
      const blob = await apiService.downloadResumeFile(r.resume_id);
      const href = URL.createObjectURL(blob);
      window.open(href, '_blank', 'noopener,noreferrer');
      // Give the new tab time to claim the URL before releasing it.
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch {
      toast.error("Couldn't open the file. Please try again in a moment.");
    } finally {
      setOpening(null);
    }
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && !uploading) void handleUpload(file);
  };

  const pick = () => fileInputRef.current?.click();

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-h2 text-foreground">My resumes</h2>
          <p className="max-w-prose text-caption text-muted-foreground">
            Keep each version of your resume here. One is used to find jobs for you. When you
            tailor, we start from whichever fits the job best.
          </p>
        </div>
        {/* Real button + hidden input: unlike a `label` styled as a Button,
  `disabled` genuinely blocks interaction while uploading. */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            // Reset so re-selecting the same file fires onChange again.
            e.target.value = '';
          }}
        />
        <Button type="button" disabled={uploading} onClick={pick} className="min-h-11">
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" aria-hidden="true" /> Upload resume
            </>
          )}
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-container border border-destructive/30 bg-destructive/10 px-4 py-3"
        >
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        // Same footprint as the populated list, so nothing jumps on load.
        <div className="space-y-2" role="status" aria-label="Loading your resumes">
          <Skeleton className="h-20 rounded-container" />
          <Skeleton className="h-20 rounded-container" />
        </div>
      ) : loadError ? (
        <PanelError
          title="Couldn't load your resumes"
          body={loadError}
          onRetry={() => load({ showSkeleton: true })}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {resumes.map((r) => {
              const state = readState(r);
              return (
                <div
                  key={r.resume_id}
                  className={cn(
                    'flex flex-wrap items-center gap-x-4 gap-y-3 rounded-container border bg-card p-4 shadow-soft',
                    r.is_active ? 'border-primary/40' : 'border-border',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-control',
                      r.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                    aria-hidden="true"
                  >
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{r.filename}</p>
                      {r.is_active && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-caption-sm font-semibold text-primary">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Used for job matching
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-caption text-muted-foreground">
                      <span>Uploaded {formatDate(r.uploaded_at)}</span>
                      {r.size_bytes ? <span>· {formatBytes(r.size_bytes)}</span> : null}
                      <span aria-hidden="true">·</span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-medium',
                          state.tone === 'ok' && 'text-success',
                          state.tone === 'wait' && 'text-muted-foreground',
                          state.tone === 'bad' && 'text-destructive',
                        )}
                      >
                        {state.tone === 'wait' && (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        )}
                        {state.label}
                      </span>
                    </p>
                    {r.parse_status === 'failed' && (
                      <p className="mt-1 text-caption-sm text-muted-foreground">
                        Try saving it again as a PDF with selectable text, then upload it once more.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={opening === r.resume_id}
                      onClick={() => void openFile(r)}
                      className="min-h-11 gap-1.5 text-muted-foreground hover:text-foreground"
                    >
                      {opening === r.resume_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      )}
                      View
                    </Button>
                    {!r.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        // A resume can only be used for matching once read;
                        // the backend answers 409 resume_not_parsed otherwise.
                        disabled={settingActive === r.resume_id || r.parse_status !== 'parsed'}
                        title={
                          r.parse_status !== 'parsed'
                            ? 'Available once we finish reading this resume'
                            : 'Find jobs and score matches with this resume'
                        }
                        onClick={async () => {
                          setSettingActive(r.resume_id);
                          const resp = await apiService.setActiveResume(r.resume_id);
                          setSettingActive(null);
                          if (resp.error) {
                            const notParsed =
                              resp.status === 409 &&
                              (resp.errorPayload as { error?: string } | undefined)?.error ===
                                'resume_not_parsed';
                            toast.error("Couldn't switch resumes", {
                              description: notParsed
                                ? 'We are still reading this resume. Try again in a moment.'
                                : resp.error,
                            });
                            return;
                          }
                          toast.success('Job matching now uses this resume');
                          await load();
                        }}
                        className="min-h-11"
                      >
                        {settingActive === r.resume_id ? 'Switching...' : 'Use for job matching'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deleting === r.resume_id}
                      title="Delete"
                      aria-label={`Delete resume ${r.filename}`}
                      onClick={() => setPendingDelete(r)}
                      className="h-11 w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      {deleting === r.resume_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* The way in for a new file: drop it here or pick it. With no
                resumes yet this is the whole page, so it says what happens. */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-container border border-dashed px-6 text-center transition-colors',
                resumes.length === 0 ? 'py-12' : 'py-7',
                dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
              )}
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                <UploadCloud className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {resumes.length === 0 ? 'No resumes uploaded yet' : 'Add another version'}
              </p>
              <p className="max-w-sm text-caption text-muted-foreground">
                {resumes.length === 0
                  ? 'Drop a PDF or Word file (.docx) here to get started. Once we have read it, we find jobs that fit.'
                  : 'Drop a PDF or Word file (.docx) here, for example one resume per kind of role.'}{' '}
                Up to 5 MB.
              </p>
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={pick} className="mt-1 min-h-11">
                Choose a file
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {status?.has_resume && <WhatWeRead status={status} />}
            {resumes.some((r) => r.parse_status === 'parsed') && (
              <Link
                to={appPath('resume', 'tailor')}
                className="group flex items-center gap-3 rounded-container border border-border bg-card p-4 shadow-soft outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-primary/10 text-primary" aria-hidden="true">
                  <Wand2 className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground group-hover:text-primary">
                    Tailor it for a job
                  </span>
                  <span className="block text-caption text-muted-foreground">
                    Paste a job posting and get a version written for it.
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Permanent-delete confirmation */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.filename}" will be permanently deleted
              {pendingDelete?.is_active ? ' (it is the one used for job matching)' : ''}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const target = pendingDelete;
                setPendingDelete(null);
                if (!target) return;
                setDeleting(target.resume_id);
                const resp = await apiService.deleteResume(target.resume_id);
                setDeleting(null);
                if (resp.error) {
                  toast.error("Couldn't delete that", { description: resp.error });
                  return;
                }
                toast.success('Resume deleted');
                await load();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
