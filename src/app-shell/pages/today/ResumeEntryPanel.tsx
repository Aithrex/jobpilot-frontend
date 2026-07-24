/**
 * Today - resume upload entry point.
 *
 * Closes an onboarding gap: signed-in users land here but previously had no
 * obvious place to add a resume (it lived under Craft > My Resumes). This panel
 * surfaces upload inline via `apiService.uploadResumeForParser` (PDF/DOCX <=5MB),
 * which already encapsulates the async job/poll pattern.
 *
 *   - No base resume -> a prominent primary CTA card (the main next action).
 *   - Has a resume   -> a compact, quieter card so it stays discoverable.
 *
 * Owns its own presence check and its loading state so the top of the page never
 * flashes the wrong affordance. Tokens only; verified in both themes + mobile.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, FileUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Does the user already have a base resume? Mirrors TailorPage's check:
 * prefer /versions, fall back to /status if that read fails. Returns `null`
 * when presence can't be determined so the caller can stay silent.
 */
async function fetchHasResume(): Promise<boolean | null> {
  const resp = await apiService.listBaseResumes();
  if (resp.data) return (resp.data.versions || []).length > 0;
  const s = await apiService.getResumeStatus();
  if (s.data) return s.data.has_resume === true || s.data.has_base_file === true;
  return null;
}

export function ResumeEntryPanel({ onUploaded }: { onUploaded?: () => void }) {
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setHasResume(await fetchHasResume());
    setChecking(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const handleUpload = useCallback(
    async (file: File) => {
      const fname = file.name.toLowerCase();
      if (!fname.endsWith('.pdf') && !fname.endsWith('.docx')) {
        toast.error('Unsupported file', { description: 'Only PDF and DOCX files are accepted.' });
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error('File too large', { description: 'Maximum size is 5 MB.' });
        return;
      }
      setUploading(true);
      const resp = await apiService.uploadResumeForParser(file);
      setUploading(false);
      if (resp.error) {
        toast.error('Upload failed', { description: resp.error });
        return;
      }
      toast.success('Resume uploaded');
      setHasResume(true);
      onUploaded?.();
    },
    [onUploaded],
  );

  const openPicker = () => fileInputRef.current?.click();

  // Presence unknown on first paint - hold a skeleton so we never flash the
  // wrong CTA (prominent vs compact) before the check settles.
  if (checking && hasResume === null) {
    return <Skeleton className="h-[4.5rem] rounded-container" />;
  }
  // Couldn't determine presence at all - stay out of the way.
  if (hasResume === null) return null;

  const hiddenInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,.docx"
      className="hidden"
      aria-hidden="true"
      tabIndex={-1}
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void handleUpload(f);
        // Reset so re-selecting the same file fires onChange again.
        e.target.value = '';
      }}
    />
  );

  // ── No resume yet: the prominent primary onboarding CTA ──────────────────
  if (!hasResume) {
    return (
      <Card className="flex flex-col gap-4 border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        {hiddenInput}
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UploadCloud className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="font-semibold text-foreground">Upload your resume</h2>
            <p className="text-sm text-muted-foreground">
              Add your resume to unlock tailoring, job matching, and auto-apply.
            </p>
          </div>
        </div>
        <Button type="button" onClick={openPicker} disabled={uploading} className="min-h-11 shrink-0">
          {uploading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Uploading...
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" aria-hidden="true" /> Upload resume
            </>
          )}
        </Button>
      </Card>
    );
  }

  // ── Has a resume: a quiet, discoverable affordance to add or replace ─────
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-disabled={uploading}
      onClick={() => {
        if (!uploading) openPicker();
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
          e.preventDefault();
          openPicker();
        }
      }}
      className={cn(
        'card-interactive flex cursor-pointer items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        uploading && 'pointer-events-none opacity-70',
      )}
    >
      {hiddenInput}
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {uploading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <FileUp className="h-5 w-5" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-foreground">
          {uploading ? 'Uploading...' : 'Add or replace your resume'}
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          Upload a new PDF or DOCX to keep your tailoring current
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Card>
  );
}
