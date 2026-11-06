import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Scale, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CompanyLogo } from '@/components/CompanyLogo';
import { fitBandOf } from '@/components/job-search/fitBands';
import { postedAgeLabel } from '@/lib/careerJobs';
import { companyTypeLabel } from '@/lib/companyTypes';
import { jobLevelLabel } from '@/lib/jobLevel';
import { toTitleCase } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/jobs';

export const COMPARE_MAX = 3;

function sponsorshipText(job: Job): string {
  const s = job.sponsorship as unknown;
  if (s === 'refused') return 'Posting says no sponsorship';
  if (s === 'likely') return 'Employer has sponsored before';
  if (job.h1b_sponsor) return 'H-1B sponsor';
  return 'Not stated';
}

function workModeText(job: Job): string {
  if (job.is_remote) return 'Remote';
  const loc = toTitleCase(job.location);
  return loc || 'Not stated';
}

/** One comparison row: a label and each job's value, in a fixed order. */
const ROWS: Array<{ label: string; value: (job: Job) => React.ReactNode }> = [
  {
    label: 'Match',
    value: (job) => {
      const band = fitBandOf(job);
      return band.key === 'unscored' ? band.label : (
        <span className={cn('font-semibold tabular-nums', band.text)}>{job.match_score}, {band.label}</span>
      );
    },
  },
  { label: 'Level', value: (job) => jobLevelLabel(job).text },
  { label: 'Company type', value: (job) => companyTypeLabel(job.company_type?.type) },
  { label: 'Pay', value: (job) => job.salary || 'Not published' },
  { label: 'Where', value: workModeText },
  { label: 'Type', value: (job) => toTitleCase(job.employment_type) || 'Not stated' },
  { label: 'Sponsorship', value: sponsorshipText },
  { label: 'Posted', value: (job) => postedAgeLabel(job) || job.date_posted || 'Unknown' },
  {
    label: 'Skills you have',
    value: (job) => (job.matched_skills?.length ? job.matched_skills.slice(0, 8).join(', ') : 'None matched'),
  },
  {
    label: 'Skills to close',
    value: (job) => (job.missing_skills?.length ? job.missing_skills.slice(0, 8).join(', ') : 'No gaps found'),
  },
];

interface CompareTrayProps {
  jobs: Job[];
  onRemove: (jobId: string) => void;
  onClear: () => void;
}

/**
 * Pick up to three jobs and see them side by side. The tray rises from the
 * bottom once something is picked and stays out of the way otherwise.
 */
export function CompareTray({ jobs, onRemove, onClear }: CompareTrayProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {jobs.length > 0 && (
          <motion.div
            key="compare-tray"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(40rem,calc(100vw-2rem))] items-center gap-2 rounded-2xl border border-border liquid-glass px-3 py-2 shadow-lg"
            role="region"
            aria-label="Jobs to compare"
            data-testid="compare-tray"
          >
            <Scale className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <ul className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {jobs.map((job) => (
                <li
                  key={job.job_id}
                  className="flex min-w-0 max-w-[11rem] shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 py-1 pl-1.5 pr-1 text-[12px]"
                >
                  <CompanyLogo company={job.company || job.title} logoUrl={job.logo_url} size={18} />
                  <span className="truncate" title={`${job.title} at ${job.company}`}>{toTitleCase(job.company)}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(job.job_id)}
                    aria-label={`Remove ${job.title} from compare`}
                    className="press grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
              {jobs.length < COMPARE_MAX && (
                <li className="shrink-0 text-[11px] text-muted-foreground">
                  {jobs.length === 1 ? 'Pick one more to compare' : `Up to ${COMPARE_MAX}`}
                </li>
              )}
            </ul>
            <Button size="sm" variant="ghost" className="h-8 shrink-0 text-xs" onClick={onClear}>
              Clear
            </Button>
            <Button size="sm" className="h-8 shrink-0 text-xs" disabled={jobs.length < 2} onClick={() => setOpen(true)}>
              Compare {jobs.length}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={open && jobs.length >= 2} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare jobs</DialogTitle>
            <DialogDescription>Side by side, from what each posting and your resume say.</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-[13px]">
              <thead>
                <tr>
                  <th className="w-32 p-2" />
                  {jobs.map((job) => (
                    <th key={job.job_id} className="p-2 align-top font-normal">
                      <div className="flex items-start gap-2">
                        <CompanyLogo company={job.company || job.title} logoUrl={job.logo_url} size={28} />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] text-muted-foreground">{toTitleCase(job.company)}</p>
                          <p className="line-clamp-2 font-semibold leading-snug text-foreground">{toTitleCase(job.title)}</p>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label} className="[&>td]:border-t [&>td]:border-border/60">
                    <td className="p-2 align-top text-[12px] font-medium text-muted-foreground">{row.label}</td>
                    {jobs.map((job) => (
                      <td key={job.job_id} className="p-2 align-top text-foreground/90">{row.value(job)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
