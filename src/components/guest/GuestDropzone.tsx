import { useState, type Ref } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResumePicker, type ResumePicker } from './useResumePicker';

const DEFAULT_MICROCOPY = 'PDF or DOCX, up to 5 MB';
// Transparent first-party anti-abuse note (spec v2): the server issues a
// device token we keep in this browser to keep the free trial fair.
const DEFAULT_PRIVACY_NOTE =
  'Free and private. We store a small first-party device token in your browser to help keep the free trial fair. It is used for abuse prevention and free-trial limits.';

export interface GuestDropzoneProps {
  /**
   * The page's ONE shared résumé picker (see useResumePicker). When the host
   * provides it, the drop zone owns no `<input type="file">` of its own — the
   * hero CTA, the nav action and this control all open the same element, so a
   * single click anywhere starts the same upload. Omitted (standalone embeds,
   * tests), the drop zone self-owns a picker + input via `onStarted`.
   */
  picker?: ResumePicker;
  /** Validated-file callback for the SELF-OWNED mode (ignored when `picker`
   * is provided — the shared picker already carries its own onFile). */
  onStarted?: (file: File) => void;
  /** 'full' = a standalone hero card; 'compact' = a slim row for embeds;
   * 'panel' = the landing workspace's primary surface (fills its parent's
   * height, larger type and target). */
  variant?: 'full' | 'compact' | 'panel';
  /** Primary action label on the control. */
  label?: string;
  /** File-type line under the main label. */
  microcopy?: string;
  /** Privacy line under the control; pass null to hide (e.g. when the host
   * surface renders its own privacy copy). */
  privacyNote?: string | null;
  disabled?: boolean;
  className?: string;
  /** Ref to the visible drop button so a host action (e.g. the demo's "Use
   * my resume") can return focus to the real upload control. */
  buttonRef?: Ref<HTMLButtonElement>;
}

/**
 * The guest resume upload control: drag-drop + click + keyboard accessible
 * (a real button, so Enter/Space activate natively; visible focus ring).
 * Owns client-side validation only — everything after file selection lives
 * in useGuestFlow.
 */
export function GuestDropzone({
  picker,
  onStarted,
  variant = 'full',
  label = 'Drop your resume here, or tap to browse',
  microcopy = DEFAULT_MICROCOPY,
  privacyNote = DEFAULT_PRIVACY_NOTE,
  disabled = false,
  className,
  buttonRef,
}: GuestDropzoneProps) {
  // Self-owned fallback picker — created unconditionally (hooks rule), used
  // only when the host didn't hand a shared one down.
  const ownPicker = useResumePicker({
    onFile: (file) => onStarted?.(file),
    disabled,
  });
  const active = picker ?? ownPicker;
  const [dragActive, setDragActive] = useState(false);
  const compact = variant === 'compact';
  const panel = variant === 'panel';

  return (
    <div className={cn('w-full', panel && 'flex h-full flex-col', className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={active.open}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const f = e.dataTransfer.files?.[0];
          if (f) active.acceptFile(f);
        }}
        className={cn(
          'flex w-full cursor-pointer items-center rounded-2xl border-2 border-dashed text-left transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-60',
          compact
            ? 'gap-3 p-4'
            : panel
              ? 'min-h-0 flex-1 flex-col justify-center gap-2.5 p-4 text-center'
              : 'flex-col justify-center gap-3 p-8 text-center sm:p-12',
          dragActive
            ? 'scale-[1.01] border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/40',
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-primary/10 transition-transform',
            compact ? 'h-10 w-10' : panel ? 'h-11 w-11' : 'h-12 w-12',
            dragActive && !compact && 'scale-110',
          )}
        >
          <UploadCloud
            className={cn('text-primary', compact ? 'h-5 w-5' : panel ? 'h-5 w-5' : 'h-6 w-6')}
            aria-hidden
          />
        </span>
        <span className={cn('min-w-0', compact ? 'flex-1' : undefined)}>
          <span
            className={cn(
              'block font-medium',
              compact && 'text-sm',
              panel && 'text-sm font-semibold sm:text-[15px]',
            )}
          >
            {label}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">{microcopy}</span>
          {panel && (
            <span className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-panel">
              Browse files
            </span>
          )}
        </span>
      </button>
      {/* With a SHARED picker the page renders exactly one input elsewhere;
          self-owned mode renders it here (aria-label preserved for tests +
          assistive tech). */}
      {!picker && (
        <input
          {...ownPicker.inputProps}
          aria-hidden={undefined}
          aria-label={`Resume file: ${microcopy}`}
        />
      )}
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
