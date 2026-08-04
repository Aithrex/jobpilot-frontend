/**
 * Inline preview of the active base resume.
 *
 * The Resume page previously showed only metadata about the document (name,
 * size, a placeholder glyph). This renders the actual file.
 *
 * Preview is genuinely not always possible, and the component is built around
 * that rather than pretending otherwise:
 *   - PDF on desktop  -> inline iframe from a blob object URL
 *   - DOCX            -> browsers cannot render it; offer Open instead
 *   - mobile          -> inline PDF iframes paint blank on most mobile
 *                        browsers, so the same fallback applies
 *   - any failure     -> the fallback, never an error banner. A resume that
 *                        cannot preview is not a broken page; the metadata
 *                        above it is still correct and useful.
 *
 * `src/components/ResumeViewer.tsx` is a hardcoded demo (a personal filename
 * in `public/`) so it is not reused, but two details are borrowed from it
 * because they were already proven here: the mobile sniff and revoking the
 * object URL on unmount.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { ResumeAssetRow } from '@/types/resume';

/** Inline PDF iframes typically render a blank page on mobile/tablet. */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
  );
}

function isPdf(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

type State = 'idle' | 'loading' | 'ready' | 'unavailable';

export function ResumeFilePreview({ resume }: { resume: ResumeAssetRow }) {
  const [state, setState] = useState<State>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [mobile] = useState(isMobileDevice);
  const urlRef = useRef<string | null>(null);

  const previewable = isPdf(resume.filename) && !mobile;

  // One object URL at a time, always revoked - a leaked blob URL pins the
  // whole file in memory for the life of the tab.
  const setObjectUrl = useCallback((next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setUrl(next);
  }, []);

  useEffect(() => {
    if (!previewable) {
      setState('unavailable');
      return;
    }

    let alive = true;
    setState('loading');

    void (async () => {
      try {
        const blob = await apiService.downloadResumeFile(resume.resume_id);
        if (!alive) return;
        setObjectUrl(URL.createObjectURL(blob));
        setState('ready');
      } catch {
        // Deliberately silent: fall back to the metadata card.
        if (alive) setState('unavailable');
      }
    })();

    return () => {
      alive = false;
    };
  }, [resume.resume_id, previewable, setObjectUrl]);

  // Revoke on unmount.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const openFile = useCallback(async () => {
    try {
      const blob = await apiService.downloadResumeFile(resume.resume_id);
      const href = URL.createObjectURL(blob);
      window.open(href, '_blank', 'noopener,noreferrer');
      // Give the new tab time to claim the URL before releasing it.
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch {
      /* No-op: the Open button simply does nothing rather than erroring. */
    }
  }, [resume.resume_id]);

  if (state === 'loading') {
    return (
      <div
        className="flex aspect-[8.5/11] max-h-[420px] items-center justify-center rounded-container border border-border bg-muted/40"
        aria-live="polite"
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading resume preview</span>
      </div>
    );
  }

  if (state === 'ready' && url) {
    return (
      // Solid surface, never glass: blur behind a dense page of text costs
      // legibility for nothing.
      <div className="overflow-hidden rounded-container border border-border bg-card">
        <iframe
          src={`${url}#view=FitH&toolbar=0`}
          title={`Preview of ${resume.filename}`}
          className="h-[420px] w-full"
        />
      </div>
    );
  }

  // Fallback: DOCX, mobile, or a failed fetch.
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-container',
        'border border-dashed border-border bg-muted/30 px-6 py-10 text-center',
      )}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="text-body font-medium text-foreground">Preview not available here</p>
      <p className="max-w-sm text-caption text-muted-foreground">
        {isPdf(resume.filename)
          ? 'Inline preview needs a larger screen. Open the file to read it.'
          : 'Inline preview works for PDF files. Open the file to read it.'}
      </p>
      <Button variant="outline" size="sm" className="mt-1 min-h-11" onClick={openFile}>
        <Download className="mr-2 h-4 w-4" aria-hidden="true" />
        Open resume
      </Button>
    </div>
  );
}
