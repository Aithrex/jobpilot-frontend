import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, FlaskConical, ShieldCheck, Upload, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
// EASE from guest/_shared (same curve as landing/_shared) — deliberately NOT
// landing/_shared, whose import graph reaches the API layer. This component
// must stay provably free of backend plumbing (see demo-workspace.test.tsx).
import { EASE } from '@/components/guest/_shared';
import { DEMO_JOBS, DEMO_RESUME, type DemoJob, type DemoLine } from './demoData';

/**
 * The interactive product preview that fills the hero workspace before a real
 * upload: three selectable fictional matches, live evidence for the selected
 * one, and a tailoring preview with original-vs-tailored switching. A small
 * product to play with, not a screenshot.
 *
 * HARD CONTRACT: pure client state over ./demoData fixtures. Nothing here may
 * import the API layer, touch guest identity, or consume quota. Every surface
 * is labeled fictional. "Use my resume" hands control back to the host, which
 * focuses the REAL upload control (or its account CTA when guest onboarding
 * is unavailable).
 */
export interface DemoWorkspaceProps {
  /** Return focus to the real uploader (or the account CTA replacing it). */
  onUseResume: () => void;
  className?: string;
}

const stepMotion = { duration: 0.28, ease: EASE } as const;

function ScoreBar({ score, animate }: { score: number; animate: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:w-32" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(var(--brand-to))]"
          initial={animate ? { width: '20%' } : false}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-primary">
        Est. {score}% match
      </span>
    </div>
  );
}

/** Resume evidence → posting requirement, joined by a line that draws in. */
function EvidenceLinks({ job, animate }: { job: DemoJob; animate: boolean }) {
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>From the sample resume</span>
        <span aria-hidden />
        <span className="text-right">In the job post</span>
      </div>
      <ul className="space-y-1.5">
        {job.evidence.map(({ resume, posting }, i) => (
          <motion.li
            key={resume}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
            initial={animate ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...stepMotion, delay: animate ? 0.08 + i * 0.07 : 0 }}
          >
            <span className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
              {resume}
            </span>
            <motion.span
              aria-hidden
              className="h-px w-5 origin-left bg-primary/60 sm:w-8"
              initial={animate ? { scaleX: 0 } : false}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.35, ease: EASE, delay: animate ? 0.18 + i * 0.07 : 0 }}
            />
            <span className="rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-right text-xs text-foreground">
              {posting}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function CoverageBar({
  label,
  value,
  tone,
  animate,
}: {
  label: string;
  value: number;
  tone: 'muted' | 'primary';
  animate: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <motion.div
          className={cn('h-full rounded-full', tone === 'primary' ? 'bg-primary' : 'bg-muted-foreground/50')}
          initial={animate ? { width: '10%' } : false}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

function ResumeLines({ lines, animate }: { lines: readonly DemoLine[]; animate: boolean }) {
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <motion.li
          key={i}
          className="flex gap-2 text-[13px] leading-relaxed"
          initial={animate ? { opacity: 0, y: 5 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...stepMotion, delay: animate ? 0.06 + i * 0.06 : 0 }}
        >
          <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>
            {line.map((part, j) =>
              part.added ? (
                <mark
                  key={j}
                  className="rounded-sm bg-primary/10 px-0.5 font-medium text-primary"
                >
                  {part.text}
                </mark>
              ) : (
                <span key={j}>{part.text}</span>
              ),
            )}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}

export function DemoWorkspace({ onUseResume, className }: DemoWorkspaceProps) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;
  const [selectedId, setSelectedId] = useState<string>(DEMO_JOBS[0].id);
  const [view, setView] = useState<'matches' | 'tailored'>('matches');
  const job = DEMO_JOBS.find((j) => j.id === selectedId) ?? DEMO_JOBS[0];

  return (
    <section
      aria-label="Interactive product preview with fictional data"
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/20',
        className,
      )}
    >
      {/* Fictional-data label: always visible, never hover-only. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <FlaskConical className="h-3.5 w-3.5 text-primary" aria-hidden />
          Interactive preview · fictional data
        </span>
        <span className="text-[11px] text-muted-foreground">{DEMO_RESUME.label}</span>
      </div>

      <p className="sr-only" role="status">
        {view === 'matches'
          ? `Previewing ${job.title} at ${job.company}.`
          : `Previewing the tailored resume for ${job.title} at ${job.company}.`}
      </p>

      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
        <AnimatePresence mode="wait" initial={false}>
          {view === 'matches' ? (
            <motion.div
              key="matches"
              initial={animate ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={animate ? { opacity: 0, y: -8, transition: { duration: 0.18 } } : undefined}
              transition={stepMotion}
              className="flex flex-col gap-3"
            >
              {/* ── Three selectable fictional matches ── */}
              <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Fictional job matches">
                {DEMO_JOBS.map((j) => {
                  const selected = j.id === job.id;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedId(j.id)}
                      className={cn(
                        'relative flex min-h-[44px] items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        selected
                          ? 'border-primary/50 bg-card shadow-panel'
                          : 'border-border bg-card/60 hover:border-primary/30 hover:bg-card',
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId={animate ? 'demo-job-ring' : undefined}
                          aria-hidden
                          className="absolute inset-0 rounded-xl ring-2 ring-primary/35"
                          transition={{ duration: 0.3, ease: EASE }}
                        />
                      )}
                      <span
                        aria-hidden
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary"
                      >
                        {j.monogram}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold">{j.title}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {j.company} · {j.score}%
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* ── Detail for the selected match ── */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={job.id}
                  initial={animate ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={animate ? { opacity: 0, y: -6, transition: { duration: 0.15 } } : undefined}
                  transition={stepMotion}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.company} · {job.location}
                      </p>
                    </div>
                    <ScoreBar score={job.score} animate={animate} />
                  </div>

                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Why this fits
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed">{job.why}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5" aria-label="Matched skills">
                    {job.skills.map((skill, i) => (
                      <motion.span
                        key={skill}
                        initial={animate ? { opacity: 0, scale: 0.9 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.22, ease: EASE, delay: animate ? i * 0.05 : 0 }}
                      >
                        <Badge variant="secondary" className="text-[11px] font-normal">
                          {skill}
                        </Badge>
                      </motion.span>
                    ))}
                  </div>

                  <EvidenceLinks job={job} animate={animate} />

                  <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                    <span>{job.sponsorship}</span>
                  </p>

                  <div className="flex flex-col gap-2 pt-0.5 sm:flex-row">
                    <Button className="h-11 flex-1" onClick={() => setView('tailored')}>
                      <Wand2 className="h-4 w-4" aria-hidden />
                      Preview tailoring
                    </Button>
                    <Button variant="outline" className="h-11 flex-1" onClick={onUseResume}>
                      <Upload className="h-4 w-4" aria-hidden />
                      Use my resume
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="tailored"
              initial={animate ? { opacity: 0, y: 10 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={animate ? { opacity: 0, y: -8, transition: { duration: 0.18 } } : undefined}
              transition={stepMotion}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">
                    Tailored preview · {job.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {job.company} · fictional example
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  IntegrityGuard on
                </span>
              </div>

              <Tabs defaultValue="tailored">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="original">Original resume</TabsTrigger>
                  <TabsTrigger value="tailored">Tailored resume</TabsTrigger>
                </TabsList>

                <TabsContent value="original" className="mt-3">
                  <div className="space-y-3 rounded-xl border border-border bg-card p-3.5">
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {DEMO_RESUME.summary}
                    </p>
                    <ResumeLines lines={DEMO_RESUME.bullets.map((b) => [{ text: b }])} animate={false} />
                    <CoverageBar
                      label="Keyword coverage"
                      value={job.coverage.original}
                      tone="muted"
                      animate={animate}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="tailored" className="mt-3">
                  <div className="space-y-3 rounded-xl border border-primary/25 bg-card p-3.5">
                    <p className="text-[13px] leading-relaxed">
                      {job.tailoredSummary.map((part, j) =>
                        part.added ? (
                          <mark key={j} className="rounded-sm bg-primary/10 px-0.5 font-medium text-primary">
                            {part.text}
                          </mark>
                        ) : (
                          <span key={j} className="text-muted-foreground">
                            {part.text}
                          </span>
                        ),
                      )}
                    </p>
                    <ResumeLines lines={job.tailoredBullets} animate={animate} />
                    <CoverageBar
                      label="Keyword coverage"
                      value={job.coverage.tailored}
                      tone="primary"
                      animate={animate}
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Highlights are rephrased from the sample resume's real experience.
                      Employers, titles, dates, and skills stay locked. Estimates shown,
                      fictional data.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="h-11 flex-1" onClick={() => setView('matches')}>
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to matches
                </Button>
                <Button className="h-11 flex-1" onClick={onUseResume}>
                  <Upload className="h-4 w-4" aria-hidden />
                  Use my resume
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
