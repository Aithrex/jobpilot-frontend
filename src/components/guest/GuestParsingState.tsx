import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { FileText, GraduationCap, Briefcase, User, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ErrorCard,
  PhaseAnnouncer,
  PhaseStepper,
  SignupCta,
  WorkingHeader,
  stepTransition,
  type PhaseDef,
} from '@/components/guest/_shared';
import { PARSE_STAGES, useStagedCopy, type GuestCta } from '@/hooks/useGuestFlow';
import type { GuestJobProgress } from '@/types/guest';
import type { JobStatus } from '@/types/resume';

/**
 * The parsing state: the uploaded document morphs into a structured resume
 * preview while the REAL async parse job runs. When the backend emits
 * progress markers (v3: parsing -> extracting_skills -> finalizing) the
 * stepper and section sweep follow the SERVER truthfully; without markers the
 * staged copy rotates flavor text but nothing is ever marked "done" until
 * the job completes.
 */
export interface GuestParsingStateProps {
  fileName: string | null;
  parseStatus: JobStatus | null;
  /** Server-emitted sub-phase (null until the first marker arrives). */
  progress?: GuestJobProgress | null;
  error: string | null;
  cta: GuestCta | null;
  canRetry: boolean;
  onRetry: () => void;
  onChooseAnother: () => void;
  className?: string;
}

/** The backend's guest_parse phases, in emission order (v3 3.4). */
const PARSE_PHASES: readonly PhaseDef[] = [
  { key: 'parsing', label: 'Reading the document' },
  { key: 'extracting_skills', label: 'Extracting skills' },
  { key: 'finalizing', label: 'Finalizing' },
];

const SECTIONS = [
  { Icon: User, label: 'Contact and summary', widths: ['w-2/5', 'w-4/5'] },
  { Icon: Briefcase, label: 'Experience', widths: ['w-3/5', 'w-full', 'w-4/5'] },
  { Icon: Wrench, label: 'Skills', widths: ['w-full', 'w-3/5'] },
  { Icon: GraduationCap, label: 'Education', widths: ['w-1/2', 'w-2/5'] },
] as const;

export function GuestParsingState({
  fileName,
  parseStatus,
  progress = null,
  error,
  cta,
  canRetry,
  onRetry,
  onChooseAnother,
  className,
}: GuestParsingStateProps) {
  const reduceMotion = useReducedMotion();
  const working = !error && !cta;
  const stage = useStagedCopy(working, PARSE_STAGES);
  // Section highlight sweep: driven by the SERVER phase when markers arrive,
  // otherwise the staged-copy timer (same honest fallback wording).
  const phaseIndex = progress ? PARSE_PHASES.findIndex((p) => p.key === progress.phase) : -1;
  const stageIndex = Math.max(0, PARSE_STAGES.indexOf(stage as (typeof PARSE_STAGES)[number]));
  const activeSection =
    phaseIndex >= 0
      ? Math.min(phaseIndex + 1, SECTIONS.length - 1)
      : Math.min(stageIndex, SECTIONS.length - 1);
  const activePhaseLabel = phaseIndex >= 0 ? PARSE_PHASES[phaseIndex].label : null;

  if (cta) {
    return (
      <div className={className}>
        <SignupCta title={cta.title} body={cta.body} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorCard title="We hit a snag reading your resume" body={error}>
          {canRetry && <Button onClick={onRetry}>Try again</Button>}
          <Button variant="outline" onClick={onChooseAnother}>
            Choose another file
          </Button>
          <Button asChild variant="ghost">
            <Link to="/register">Create free account</Link>
          </Button>
        </ErrorCard>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full flex-col gap-5', className)}>
      {/* One debounced polite region announcing REAL phase changes only. */}
      <PhaseAnnouncer message={activePhaseLabel} />
      <WorkingHeader
        stage={stage}
        hint={
          parseStatus === 'processing'
            ? 'Working. Usually under a minute.'
            : 'Queued. Starting now.'
        }
      />
      <PhaseStepper phases={PARSE_PHASES} activeKey={progress?.phase ?? null} />

      {/* Document chip → structured preview morph */}
      <div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={stepTransition}
          className="flex items-start gap-3 self-start rounded-xl border border-border bg-muted/30 p-4"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={fileName ?? undefined}>
              {fileName ?? 'Your resume'}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Being read now</p>
          </div>
        </motion.div>

        <div className="space-y-2.5" aria-label="Preview of your resume being structured into sections">
          {/* REAL extracted skills materialize the moment the server emits
              them (finalizing marker carries skills_preview - genuinely
              parsed names, never invented). This is the guest's own data
              animating in, not an illustration. */}
          {(progress?.skills_preview?.length ?? 0) > 0 && (
            <div
              className="rounded-xl border border-primary/30 bg-primary/5 p-3"
              aria-live="polite"
            >
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Wrench className="h-3.5 w-3.5" aria-hidden />
                Found in your resume
              </p>
              <div className="flex flex-wrap gap-1.5">
                {progress!.skills_preview!.map((skill, i) => (
                  <motion.span
                    key={skill}
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ ...stepTransition, delay: reduceMotion ? 0 : i * 0.08 }}
                    className="rounded-full border border-primary/25 bg-card px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>
          )}
          {SECTIONS.map(({ Icon, label }, i) => {
            const active = i === activeSection;
            const visited = i < activeSection;
            return (
              <motion.div
                key={label}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...stepTransition, delay: reduceMotion ? 0 : i * 0.08 }}
                className={cn(
                  'rounded-xl border p-3 transition-colors duration-500',
                  active
                    ? 'border-primary/40 bg-primary/5'
                    : visited
                      ? 'border-border bg-card'
                      : 'border-border/60 bg-muted/20',
                )}
              >
                <p
                  className={cn(
                    'mb-2 flex items-center gap-1.5 text-xs font-semibold transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </p>
                <div className="space-y-1.5">
                  {SECTIONS[i].widths.map((w, j) => (
                    <Skeleton key={j} className={cn('h-2.5', w, !active && 'animate-none opacity-60')} />
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
