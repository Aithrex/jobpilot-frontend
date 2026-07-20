import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ErrorCard,
  SignupCta,
  WorkingHeader,
} from '@/components/guest/_shared';
import {
  TAILOR_STAGES,
  useStagedCopy,
  type GuestCta,
  type GuestTailorState,
} from '@/hooks/useGuestFlow';
import type {
  GuestDownloadFormat,
  GuestJobMatch,
  GuestTailorResult,
} from '@/types/guest';
import type { TailoredFullResume } from '@/types/resume';

export interface GuestTailorPanelProps {
  activeMatch: GuestJobMatch | null;
  state: GuestTailorState;
  error: string | null;
  cta: GuestCta | null;
  tailored: GuestTailorResult | null;
  /** Format currently being prepared for download, if any. */
  downloading: GuestDownloadFormat | null;
  onDownload: (format: GuestDownloadFormat) => void;
  onRetry: () => void;
  onBack: () => void;
}

/**
 * The tailor step: honest staged progress while the async job runs, then the
 * finished preview with polished PDF/DOCX downloads (token endpoints — both
 * formats are the SAME single free tailor). Quota/capacity/challenge 429s
 * arrive as conversion CTA copy, never errors.
 */
export function GuestTailorPanel({
  activeMatch,
  state,
  error,
  cta,
  tailored,
  downloading,
  onDownload,
  onRetry,
  onBack,
}: GuestTailorPanelProps) {
  const stage = useStagedCopy(state === 'working', TAILOR_STAGES, 7000);
  const formats: GuestDownloadFormat[] = tailored?.download?.formats?.length
    ? tailored.download.formats
    : ['pdf', 'docx'];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="-my-2 mb-2 inline-flex min-h-[44px] items-center gap-1.5 rounded py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to matches
      </button>

      {activeMatch && (
        <div className="mb-6">
          <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
            {activeMatch.title} · {activeMatch.company}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground" role="status">
            {state === 'done'
              ? 'Your tailored resume is ready. It keeps your real employers, titles, dates, and skills. Review it before you send it.'
              : 'Tailoring your resume for this role.'}
          </p>
        </div>
      )}

      {state === 'working' && (
        <Card>
          <CardContent className="space-y-6 p-6 sm:p-8" aria-live="polite">
            <WorkingHeader
              stage={stage}
              hint="Usually one to two minutes. Every line is checked against your real experience. Nothing invented."
            />
            <div className="space-y-3">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      )}

      {state === 'cta' && cta && <SignupCta title={cta.title} body={cta.body} />}

      {state === 'error' && (
        <ErrorCard title="Tailoring didn't finish" body={error}>
          {activeMatch && <Button onClick={onRetry}>Try again</Button>}
          <Button variant="outline" onClick={onBack}>
            Back to matches
          </Button>
        </ErrorCard>
      )}

      {state === 'done' && tailored && (
        <div className="space-y-4">
          {tailored.record_id ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {formats.map((format) => (
                <Button
                  key={format}
                  variant={format === 'pdf' ? 'default' : 'outline'}
                  disabled={downloading !== null}
                  onClick={() => onDownload(format)}
                >
                  {downloading === format ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="h-4 w-4" aria-hidden />
                  )}
                  Download {format.toUpperCase()}
                </Button>
              ))}
              <p className="text-xs text-muted-foreground">
                Both formats are the same single free tailor. Downloading again never uses
                another one.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Downloads for this tailored resume are not available right now. Create a free
              account to keep it saved.
            </p>
          )}

          <TailoredPreview resume={tailored.tailored_resume} />

          <SignupCta
            title="Save your work, and get 5 free tailors every day."
            body="Create a free account to save this work and unlock 5 tailors a day. Your resume, today's matches, and this tailored version all carry over automatically."
          />
        </div>
      )}
    </div>
  );
}

function TailoredPreview({ resume }: { resume: TailoredFullResume }) {
  const skillGroups = Object.entries(resume.skills || {});
  return (
    <Card>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div>
          <h3 className="text-lg font-semibold">{resume.contact?.name || 'Your tailored resume'}</h3>
          {resume.target_role && (
            <p className="text-sm text-muted-foreground">Tailored for: {resume.target_role}</p>
          )}
        </div>
        {resume.summary && (
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</h4>
            <p className="text-sm leading-relaxed">{resume.summary}</p>
          </section>
        )}
        {skillGroups.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</h4>
            <div className="space-y-2">
              {skillGroups.map(([group, items]) => (
                <div key={group} className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">{group}:</span>
                  {(items || []).map((s) => (
                    <Badge key={s} variant="secondary" className="text-[11px] font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
        {(resume.experience || []).length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experience</h4>
            <div className="space-y-4">
              {resume.experience.map((exp, i) => (
                <div key={`${exp.company}-${i}`}>
                  <p className="text-sm font-medium">
                    {exp.title} · <span className="text-muted-foreground">{exp.company}</span>
                    {exp.dates ? <span className="text-muted-foreground"> · {exp.dates}</span> : null}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {(exp.bullets || []).map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
        {(resume.projects || []).length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projects</h4>
            <div className="space-y-3">
              {resume.projects.map((p, i) => (
                <div key={`${p.name}-${i}`}>
                  <p className="text-sm font-medium">{p.name}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {(p.bullets || []).map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
