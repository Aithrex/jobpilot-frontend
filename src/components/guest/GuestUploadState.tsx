import type { Ref } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GuestDropzone } from '@/components/guest/GuestDropzone';

/**
 * The real upload surface of the guest workspace panel: a compact dropzone
 * that stays visible in the first viewport while the interactive demo below
 * it (DemoWorkspace, composed by the host) shows what happens after upload.
 * A returning guest with a resume on file gets a one-click path to today's
 * matches instead of re-uploading.
 */
export interface GuestUploadStateProps {
  onFile: (file: File) => void;
  /** Returning guest with a parsed resume on file. */
  hasReturningResume?: boolean;
  onSeeMatches?: () => void;
  /** Focus target for "Use my resume" actions in the demo below. */
  dropButtonRef?: Ref<HTMLButtonElement>;
  /** Briefly emphasized after a "Use my resume" hand-back. */
  highlighted?: boolean;
  className?: string;
}

export function GuestUploadState({
  onFile,
  hasReturningResume = false,
  onSeeMatches,
  dropButtonRef,
  highlighted = false,
  className,
}: GuestUploadStateProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {hasReturningResume && onSeeMatches && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5 sm:flex-row sm:items-center">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p className="flex-1 text-sm">
            Your resume is already on file from a previous visit.
          </p>
          <Button size="sm" variant="outline" className="shrink-0" onClick={onSeeMatches}>
            See today's matches
          </Button>
        </div>
      )}

      <GuestDropzone
        variant="compact"
        label="Upload my resume to find matches"
        microcopy="PDF or DOCX · Up to 5 MB · No account required"
        privacyNote={null}
        onStarted={onFile}
        buttonRef={dropButtonRef}
        className={cn(
          'rounded-2xl transition-shadow duration-300',
          highlighted && 'shadow-[0_0_0_3px_hsl(var(--ring)/0.35)]',
        )}
      />
    </div>
  );
}
