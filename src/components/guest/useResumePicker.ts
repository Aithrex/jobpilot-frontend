/**
 * useResumePicker - ONE resume file input, shared by every upload trigger.
 *
 * This hook only guarantees that ONE picker drives ONE input. It cannot
 * guarantee the page uses a single picker: that is the HOST's job. On the
 * landing page, LandingExperience calls this hook exactly once, renders the
 * single `<input type="file">`, and hands the same picker to the hero CTA, the
 * nav CTA, the workspace window's drop surface and the closing CTA. Each of
 * them calls `open()` and gets the same OS dialog on that click.
 *
 * A CTA that scrolls to, or focuses, a second uploader is a two-click upload
 * and is treated as a bug (see landing-redesign.test.tsx, "every upload CTA
 * opens the same file input"). If you add a new trigger, pass it the existing
 * picker - do not call this hook again.
 *
 * GuestDropzone may still self-own a picker when no `picker` prop is given;
 * that mode is for standalone embeds and tests, never the landing page.
 *
 * The hook owns:
 *  - the hidden input element + its props (render it exactly once),
 *  - client-side validation (PDF/DOCX, 5 MB) shared by click AND drop,
 *  - an imperative `open()` any trigger can call.
 *
 * `open()` must be called inside a real user gesture - browsers block
 * programmatic `input.click()` otherwise. Every caller today is a click/key
 * handler, so that holds.
 */

import { useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const RESUME_ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface ResumePicker {
  /** Opens the real OS file picker. Safe to call from any trigger. */
  open: () => void;
  /** Validate + hand off a file that arrived by drag-and-drop. */
  acceptFile: (file: File) => void;
  /** Spread onto the single hidden `<input type="file">`. */
  inputProps: {
    ref: React.RefObject<HTMLInputElement>;
    type: 'file';
    accept: string;
    className: string;
    tabIndex: number;
    'aria-hidden': true;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

export interface UseResumePickerOptions {
  /** Fires with a VALIDATED file - the caller starts useGuestFlow.startUpload. */
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function useResumePicker({
  onFile,
  disabled = false,
}: UseResumePickerOptions): ResumePicker {
  const inputRef = useRef<HTMLInputElement>(null);
  // Keep the latest callback without re-identifying `open`/`acceptFile`, so
  // triggers holding the picker don't re-render on every parent update.
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const acceptFile = useCallback((file: File) => {
    if (disabledRef.current) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      toast.error('Please upload a PDF or DOCX resume.');
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      toast.error('That file is over 5 MB. Please upload a smaller resume.');
      return;
    }
    onFileRef.current(file);
  }, []);

  const open = useCallback(() => {
    if (disabledRef.current) return;
    inputRef.current?.click();
  }, []);

  const inputProps = useMemo(
    () =>
      ({
        ref: inputRef,
        type: 'file',
        accept: RESUME_ACCEPT,
        className: 'hidden',
        tabIndex: -1,
        'aria-hidden': true,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) acceptFile(f);
          // Reset so picking the SAME file twice still fires change.
          e.target.value = '';
        },
      }) as const,
    [acceptFile],
  );

  return { open, acceptFile, inputProps };
}
