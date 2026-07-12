/**
 * MyResumesPage — base-résumé manager in the Craft section
 * (lazy-mounted at /next/craft/my-resumes).
 *
 * Extracted from the ResumeParser monolith and rebuilt on the design system
 * (semantic tokens + shadcn). Manages the base résumés used as the source for
 * tailoring: upload (PDF/DOCX ≤5MB), set-active, delete.
 */
import { useCallback, useEffect, useState } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelEmpty } from '@/app-shell/pages/today/primitives';
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
  const [error, setError] = useState('');
  const [settingActive, setSettingActive] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const resp = await apiService.listBaseResumes();
    if (resp.data) setResumes(resp.data.versions || []);
    else if (resp.error) setError(resp.error);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
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
      toast.success('Résumé uploaded');
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
          <p className="overline">Craft · Base résumés</p>
          <h2 className="font-display text-h2 text-foreground">My Resumes</h2>
          <p className="text-caption text-muted-foreground">
            Uploaded résumés used as the base for tailoring
          </p>
        </div>
        <Button asChild disabled={uploading} className="cursor-pointer">
          <label>
            {uploading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Uploading…
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" aria-hidden="true" /> Upload Resume
              </>
            )}
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </label>
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

      {resumes.length === 0 ? (
        <PanelEmpty
          icon={FileText}
          title="No resumes uploaded yet"
          body="Upload a PDF or DOCX to get started — it becomes the base for every tailored résumé."
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-container border border-border bg-card shadow-soft">
          {resumes.map((r) => (
            <div
              key={r.s3_key}
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
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.uploaded_at)}
                    {r.size ? ` · ${formatBytes(r.size)}` : ''}
                  </p>
                </div>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-1">
                {!r.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={settingActive === r.s3_key}
                    onClick={async () => {
                      setSettingActive(r.s3_key);
                      const resp = await apiService.setActiveResume(r.s3_key);
                      setSettingActive(null);
                      if (resp.error) {
                        toast.error("Couldn't set active résumé", { description: resp.error });
                        return;
                      }
                      await load();
                    }}
                    className="text-primary hover:text-primary"
                  >
                    {settingActive === r.s3_key ? 'Setting…' : 'Use for Tailoring'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deleting === r.s3_key}
                  title="Delete"
                  onClick={async () => {
                    setDeleting(r.s3_key);
                    const resp = await apiService.deleteResume(r.s3_key);
                    setDeleting(null);
                    if (resp.error) {
                      toast.error('Delete failed', { description: resp.error });
                      return;
                    }
                    await load();
                  }}
                  className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
