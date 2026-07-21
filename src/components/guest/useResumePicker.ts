/**
 * useResumePicker — ONE résumé file input for the whole landing page.
 *
 * The landing has several upload triggers (hero CTA, nav "Upload résumé", the
 * drop zone's own button, the closing CTA, keyboard activation). They must all
 * open the SAME underlying `<input type="file">` in a single click — a CTA that
 * scrolls to, or focuses, a second uploader is a two-click upload and is
 * treated as a bug.
 *
 * The hook owns:
 *  - the hidden input element + its props (render it exactly once),
 *  - client-side validation (PDF/DOCX, 5 MB) shared by click AND drop,
 *  - an imperative `open()` any trigger can call.
 *
 * `open()` must be called inside a real user gesture — browsers block
 * programmatic `input.click()` otherwise. Every caller here is a click/key
 * handler, so that holds.
 */

import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const RESUME_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface ResumePicker {
  /** Opens the real OS file picker. Safe to call from any trigger. */
  open: () => void;
  /** Validate + hand off a file that arrived by drag-and-drop. */
  acceptFile: (file: File) => void;
  /** Spread onto the single hidden `<input type="file">`. */
  inputProps: {
    ref: React.RefObject<HTMLInputElement>;
    type: "file";
    accept: string;
    className: string;
    tabIndex: number;
    "aria-hidden": true;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

export interface UseResumePickerOptions {
  /** Fires with a VALIDATED file — the caller starts useGuestFlow.startUpload. */
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
      toast.error("Please upload a PDF or DOCX resume.");
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      toast.error("That file is over 5 MB. Please upload a smaller resume.");
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
        type: "file",
        accept: RESUME_ACCEPT,
        className: "hidden",
        tabIndex: -1,
        "aria-hidden": true,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          const f = e.target.files?.[0];
          if (f) acceptFile(f);
          // Reset so picking the SAME file twice still fires change.
          e.target.value = "";
        },
      }) as const,
    [acceptFile],
  );

  return { open, acceptFile, inputProps };
}
