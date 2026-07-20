import { FileText, Sparkles, Target, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GuestDropzone } from '@/components/guest/GuestDropzone';

/**
 * The idle state of the guest workspace panel: the ENTIRE surface is the real
 * upload control, with the journey preview and honest microcopy underneath.
 * A returning guest with a resume on file gets a one-click path to today's
 * matches instead of re-uploading.
 */
export interface GuestUploadStateProps {
  onFile: (file: File) => void;
  /** Returning guest with a parsed resume on file. */
  hasReturningResume?: boolean;
  onSeeMatches?: () => void;
  className?: string;
}

const NEXT_STEPS = [
  { Icon: FileText, label: 'We read your resume' },
  { Icon: Target, label: 'Up to 5 matched jobs, with reasons' },
  { Icon: Wand2, label: 'One tailored resume, PDF and DOCX' },
] as const;

export function GuestUploadState({
  onFile,
  hasReturningResume = false,
  onSeeMatches,
  className,
}: GuestUploadStateProps) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-4', className)}>
      {hasReturningResume && onSeeMatches && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center">
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
        variant="panel"
        label="Upload my resume to find matches"
        microcopy="PDF or DOCX · Up to 5 MB · No account required"
        privacyNote={null}
        onStarted={onFile}
        className="min-h-0 flex-1"
      />

      {/* What happens next — quiet, never competing with the upload control. */}
      <ol className="grid gap-2 sm:grid-cols-3" aria-label="What happens next">
        {NEXT_STEPS.map(({ Icon, label }, i) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span>
              <span className="mr-1 font-mono text-[10px] font-bold text-primary/70" aria-hidden>
                {i + 1}
              </span>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Free and private. We store a small first-party device token in your browser to help keep
        the free trial fair. It is used for abuse prevention and free-trial limits. See our{' '}
        <a
          href="/privacy"
          className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
