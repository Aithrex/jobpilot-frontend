import { useState } from 'react';
import { ArrowLeft, Check, Download, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SignupCta } from '@/components/guest/_shared';
import { cn } from '@/lib/utils';
import type {
  GuestDownloadFormat,
  GuestJobMatch,
  GuestTailorResult,
} from '@/types/guest';
import type { TailoredFullResume } from '@/types/resume';

/**
 * The finished tailor: downloads first (the promised free result is never
 * hidden), the IntegrityGuard statement, and an original-versus-tailored
 * comparison when the original parse is still in memory (it does not survive
 * a refresh; the tailored side always renders).
 */
export interface GuestCompletedStateProps {
  activeMatch: GuestJobMatch | null;
  tailored: GuestTailorResult;
  /** Structured resume from the parse step — enables the comparison view. */
  parsedResume: Record<string, unknown> | null;
  downloading: GuestDownloadFormat | null;
  onDownload: (format: GuestDownloadFormat) => void;
  onBack: () => void;
}

/** Tolerant view of a parsed/tailored resume body (both share this shape). */
interface Resumeish {
  contact?: { name?: string };
  summary?: string;
  skills?: Record<string, string[]>;
  experience?: Array<{ title?: string; company?: string; dates?: string; bullets?: string[] }>;
  projects?: Array<{ name?: string; bullets?: string[] }>;
}

function ResumeBody({ resume, title }: { resume: Resumeish; title?: string }) {
  const skillGroups = Object.entries(resume.skills || {});
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">{resume.contact?.name || 'Your resume'}</h3>
        {title && <p className="text-sm text-muted-foreground">{title}</p>}
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
            {resume.experience!.map((exp, i) => (
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
            {resume.projects!.map((p, i) => (
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
    </div>
  );
}

export function GuestCompletedState({
  activeMatch,
  tailored,
  parsedResume,
  downloading,
  onDownload,
  onBack,
}: GuestCompletedStateProps) {
  const resume: TailoredFullResume = tailored.tailored_resume;
  const original = parsedResume as Resumeish | null;
  const canCompare = !!original && !!(original.summary || original.experience?.length);
  const [view, setView] = useState<'tailored' | 'original'>('tailored');
  const formats: GuestDownloadFormat[] = tailored.download?.formats?.length
    ? tailored.download.formats
    : ['pdf', 'docx'];

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="-my-2 inline-flex min-h-[44px] items-center gap-1.5 rounded py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to matches
      </button>

      <div>
        {activeMatch && (
          <h2 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
            {activeMatch.title} · {activeMatch.company}
          </h2>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" role="status">
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            IntegrityGuard: nothing invented
          </span>
          Your tailored resume keeps your real employers, titles, dates, and skills. Review it
          before you send it.
        </p>
      </div>

      {tailored.record_id ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {formats.map((format) => (
            <Button
              key={format}
              variant={format === 'pdf' ? 'default' : 'outline'}
              className="h-11"
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
            Both formats are the same single free tailor. Downloading again never uses another
            one.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Downloads for this tailored resume are not available right now. Create a free account to
          keep it saved.
        </p>
      )}

      {/* Original vs tailored. Side by side at lg+ when the original parse is
          available; a toggle below lg. Tailored-only after a refresh. */}
      {canCompare ? (
        <>
          <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5 lg:hidden" role="tablist" aria-label="Compare versions">
            {(['tailored', 'original'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  'min-h-[44px] rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  view === v ? 'bg-background text-primary shadow-soft' : 'text-muted-foreground',
                )}
              >
                {v === 'tailored' ? 'Tailored' : 'Original'}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={cn(view !== 'original' && 'hidden', 'lg:block')}>
              <CardContent className="p-5 sm:p-6">
                <p className="mb-4 inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  Original, as parsed
                </p>
                <ResumeBody resume={original!} />
              </CardContent>
            </Card>
            <Card className={cn(view !== 'tailored' && 'hidden', 'border-primary/30 lg:block')}>
              <CardContent className="p-5 sm:p-6">
                <p className="mb-4 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <Check className="h-3 w-3" aria-hidden />
                  Tailored for this role
                </p>
                <ResumeBody
                  resume={resume as Resumeish}
                  title={resume.target_role ? `Tailored for: ${resume.target_role}` : undefined}
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-primary/30">
          <CardContent className="p-5 sm:p-6">
            <ResumeBody
              resume={resume as Resumeish}
              title={resume.target_role ? `Tailored for: ${resume.target_role}` : undefined}
            />
          </CardContent>
        </Card>
      )}

      <SignupCta
        title="You've used your guest tailor. Nice work."
        body="Create a free account to save your resume, keep these matches and continue in your career workspace."
      />
    </div>
  );
}
