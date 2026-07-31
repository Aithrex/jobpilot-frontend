/**
 * Cover Letter inspector panel (Tailor right column).
 *
 * Presentational only - typed props in, render out. Ported from the classic
 * "Cover Letter" tab in ResumeParser, rebuilt on semantic tokens + shadcn/ui.
 * Three states: generated letter, loading, and empty (pre-generate) preview.
 */
import { Sparkles, FileDown, Clipboard, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface CoverLetterPanelProps {
  coverLetter: string | null;
  loading: boolean;
  downloading: boolean;
  onGenerate: () => void;
  onDownload: () => void;
  onClear: () => void;
  onCopy: () => void;
  jobTitle: string;
  company: string;
}

export function CoverLetterPanel({
  coverLetter,
  loading,
  downloading,
  onGenerate,
  onDownload,
  onClear,
  onCopy,
  jobTitle,
  company,
}: CoverLetterPanelProps) {
  const hasCompany = company && company !== 'Not specified';

  return (
    <div className="space-y-5 p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-control shadow-soft">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Cover Letter
            </h2>
            <p className="text-xs text-muted-foreground">
              Personalized to the role and your resume
            </p>
          </div>
        </div>
        {!coverLetter && (
          <Button
            onClick={onGenerate}
            disabled={loading}
            className="rounded-control"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        )}
      </div>

      {coverLetter ? (
        <>
          {/* Generated letter */}
          <div className="surface max-h-[480px] overflow-y-auto rounded-container p-5 shadow-soft sm:p-6">
            <div className="whitespace-pre-line font-serif text-[14px] leading-[1.75] text-foreground">
              {coverLetter}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={onDownload}
              disabled={downloading}
              className="rounded-control"
            >
              <FileDown className="h-4 w-4" />
              {downloading ? 'Preparing...' : 'Download PDF'}
            </Button>
            <Button
              onClick={onCopy}
              variant="outline"
              className="rounded-control"
            >
              <Clipboard className="h-4 w-4" />
              Copy text
            </Button>
            <Button onClick={onClear} variant="ghost" className="rounded-control">
              <RotateCw className="h-4 w-4" />
              Regenerate
            </Button>
          </div>
        </>
      ) : loading ? (
        /* Loading state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-4 h-14 w-14">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <p className="mb-1 text-sm font-semibold text-foreground">
            Writing your cover letter...
          </p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Matching your experience to the role. Usually takes 15 to 30 seconds.
          </p>
        </div>
      ) : (
        /* Empty / pre-generate preview */
        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 rounded-container border border-primary/20 bg-primary/5 p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              We'll generate a personalized 3-4 paragraph cover letter tailored
              to <span className="font-semibold text-foreground">{jobTitle}</span>
              {hasCompany ? (
                <>
                  {' '}
                  at <span className="font-semibold text-foreground">{company}</span>
                </>
              ) : null}{' '}
              using your tailored resume.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
