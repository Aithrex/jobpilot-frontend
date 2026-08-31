/**
 * MyResumesPage - base-resume manager in the Craft section
 * (lazy-mounted at /app/resume/library).
 *
 * Extracted from the ResumeParser monolith and rebuilt on the design system
 * (semantic tokens + shadcn). Manages the base resumes used as the source for
 * tailoring: upload (PDF/DOCX ≤5MB), set-active, delete.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelEmpty, PanelError } from '@/app-shell/pages/today/primitives';
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

export default function MyResumesPage() {
  const [resumes, setResumes] = useState<BaseResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Upload/validation feedback stays separate from the list-load failure so
  // the load error can render a dedicated retryable panel.
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [settingActive, setSettingActive] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
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
      if (file.size > 5 * 1024 * 1024) {
        setError('Max 5 MB');
        return;
      }
      setUploading(true);
      setError('');
      const resp = await apiService.uploadResumeForParser(file);
      setUploading(false);
      if (resp.error) {
        setError(resp.error);
        toast.error('Upload failed', { description: resp.error });
        return;
      }
      toast.success('Resume uploaded');
      await load();
    },
    [load],
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-container" />
        <Skeleton className="h-16 rounded-container" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="overline">Craft · Base resumes</p>
          <h2 className="font-display text-h2 text-foreground">My Resumes</h2>
          <p className="text-caption text-muted-foreground">
            Active is used for job matching. Tailor picks the best resume for
            each job unless you choose one.
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
        <Button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="min-h-11"
        >
          {uploading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" aria-hidden="true" /> Upload Resume
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

      {loadError ? (
        <PanelError
          title="Couldn't load your resumes"
          body={loadError}
          onRetry={() => load({ showSkeleton: true })}
        />
      ) : resumes.length === 0 ? (
        <PanelEmpty
          icon={FileText}
          title="No resumes uploaded yet"
          body="Upload a PDF or DOCX to get started. You can keep more than one. Tailor will pick the best fit for each job."
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-container border border-border bg-card shadow-soft">
          {resumes.map((r) => (
            <div
              key={r.resume_id}
              className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-accent"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    r.is_active ? 'bg-success' : 'bg-muted-foreground/50',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm text-foreground">{r.filename}</p>
                    {r.is_active && (
                      <span className="shrink-0 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                        Active
                      </span>
                    )}
                    {r.parse_status === 'pending' && (
                      <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Parsing
                      </span>
                    )}
                    {r.parse_status === 'failed' && (
                      <span className="shrink-0 rounded-full border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                        Parse failed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.uploaded_at)}
                    {r.size_bytes ? ` · ${formatBytes(r.size_bytes)}` : ''}
                  </p>
                </div>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-1">
                {!r.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    // A resume can only become active once parsed; the backend
                    // answers 409 resume_not_parsed otherwise.
                    disabled={settingActive === r.resume_id || r.parse_status !== 'parsed'}
                    onClick={async () => {
                      setSettingActive(r.resume_id);
                      const resp = await apiService.setActiveResume(r.resume_id);
                      setSettingActive(null);
                      if (resp.error) {
                        const notParsed =
                          resp.status === 409 &&
                          (resp.errorPayload as { error?: string } | undefined)?.error ===
                            'resume_not_parsed';
                        toast.error("Couldn't set active resume", {
                          description: notParsed
                            ? 'This resume has not finished parsing yet. Try again in a moment.'
                            : resp.error,
                        });
                        return;
                      }
                      await load();
                    }}
                    className="text-primary hover:text-primary"
                  >
                    {settingActive === r.resume_id ? 'Setting...' : 'Set as active'}
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
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
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
              {pendingDelete?.is_active ? ' (it is currently the active base for tailoring)' : ''}.
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
                  toast.error('Delete failed', { description: resp.error });
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
