import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const DEFAULT_MICROCOPY = 'PDF or DOCX, up to 5 MB';
// Transparent first-party anti-abuse note (spec v2): the server issues a
// device token we keep in this browser to keep the free trial fair.
const DEFAULT_PRIVACY_NOTE =
  'Free and private. We store a small first-party device token in your browser to prevent abuse of the free trial. It never identifies you and is not shared with anyone.';

export interface GuestDropzoneProps {
  /** Fires with a validated file (pdf/docx, 5 MB max) — the caller starts
   * the upload/parse flow (useGuestFlow.startUpload). */
  onStarted: (file: File) => void;
  /** 'full' = the /start hero card; 'compact' = a slim row for embeds
   * (e.g. the landing hero). */
  variant?: 'full' | 'compact';
  /** File-type line under the main label. */
  microcopy?: string;
  /** Privacy line under the control; pass null to hide (e.g. when the host
   * surface renders its own privacy copy). */
  privacyNote?: string | null;
  disabled?: boolean;
  className?: string;
}

/**
 * The guest resume upload control: drag-drop + click + keyboard accessible
 * (a real button, so Enter/Space activate natively; visible focus ring).
 * Owns client-side validation only — everything after file selection lives
 * in useGuestFlow.
 */
export function GuestDropzone({
  onStarted,
  variant = 'full',
  microcopy = DEFAULT_MICROCOPY,
  privacyNote = DEFAULT_PRIVACY_NOTE,
  disabled = false,
  className,
}: GuestDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const compact = variant === 'compact';

  const accept = (file: File) => {
    if (disabled) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      toast.error('Please upload a PDF or DOCX resume.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('That file is over 5 MB. Please upload a smaller resume.');
      return;
    }
    onStarted(file);
  };

  return (
    <div className={cn('w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={`Upload your resume: ${microcopy}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const f = e.dataTransfer.files?.[0];
          if (f) accept(f);
        }}
        className={cn(
          'flex w-full cursor-pointer items-center rounded-2xl border-2 border-dashed text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-60',
          compact
            ? 'gap-3 p-4'
            : 'flex-col justify-center gap-3 p-8 text-center sm:p-12',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/40',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-primary/10',
            compact ? 'h-10 w-10' : 'h-12 w-12',
          )}
        >
          <UploadCloud
            className={cn('text-primary', compact ? 'h-5 w-5' : 'h-6 w-6')}
            aria-hidden
          />
        </span>
        <span className={cn('min-w-0', compact ? 'flex-1' : undefined)}>
          <span className={cn('block font-medium', compact && 'text-sm')}>
            Drop your resume here, or tap to browse
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">{microcopy}</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        aria-label={`Resume file: ${microcopy}`}
        tabIndex={-1}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) accept(f);
          e.target.value = '';
        }}
      />
      {privacyNote && (
        <p
          className={cn(
            'mt-2 text-xs text-muted-foreground',
            compact ? 'text-left' : 'text-center',
          )}
        >
          {privacyNote}
        </p>
      )}
    </div>
  );
}
