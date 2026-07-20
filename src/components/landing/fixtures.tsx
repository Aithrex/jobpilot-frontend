import { ArrowRight, BadgeCheck, Check, FileText, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tiny token-styled product fixtures for the landing's "How it works" and
 * capability sections. Built from the real UI patterns (score badge, skill
 * chips, sponsorship row, tailor diff) rather than screenshots, so they stay
 * on-token and weightless. All data is clearly illustrative: fictional
 * company, no real names, and every card carries the Illustrative chip.
 * Static by design (no loops); success green appears only on positive
 * evidence rows.
 */

/** "Illustrative example" marker every fixture card wears. */
export function IllustrativeChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground',
        className,
      )}
    >
      Illustrative
    </span>
  );
}

/** Upload step: a parsed-resume file row with the extracted sections ticked. */
export function MiniUpload({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-soft', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
            <FileText className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">resume.pdf</p>
            <p className="text-xs text-muted-foreground">184 KB, parsed</p>
          </div>
        </div>
        <IllustrativeChip />
      </div>
      <ul className="mt-3 space-y-1.5">
        {['Experience read', 'Skills extracted', 'Education found'].map((line) => (
          <li key={line} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} aria-hidden />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Match step: one mini match card, the real anatomy: role + fictional
 * company, score (labelled estimate), skill chips, a sponsorship signal row
 * (the one sanctioned success-green element), and the "why this matches"
 * explanation line.
 */
export function MiniMatchCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-soft', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Senior data analyst</p>
          <p className="truncate text-xs text-muted-foreground">Brightpath Health, via its careers site</p>
        </div>
        <span className="inline-flex shrink-0 items-baseline gap-1 rounded-control bg-primary/10 px-2 py-1 font-mono text-sm font-bold tabular-nums text-primary">
          87<span className="text-[10px] font-medium text-primary/80">est.</span>
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {['SQL', 'Python', 'Tableau'].map((skill) => (
          <span
            key={skill}
            className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            {skill}
          </span>
        ))}
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-success">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Sponsorship signal found in public filings
      </p>
      <p className="mt-2 border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Why this matches:</span> your analytics
        experience covers the exact SQL and Tableau stack in the posting.
      </p>
      <div className="mt-2.5">
        <IllustrativeChip />
      </div>
    </div>
  );
}

/**
 * Tailor step: a mini before/after diff. The rewrite rephrases the same
 * facts, and the integrity row says exactly that: nothing invented.
 */
export function MiniTailorDiff({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-soft', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tailored bullet</p>
        <IllustrativeChip />
      </div>
      <div className="mt-3 space-y-2">
        <p className="rounded-control border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Worked on data pipelines and reporting for the clinical team
        </p>
        <p className="flex items-center gap-1.5 pl-1 text-[11px] font-medium text-muted-foreground">
          <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
          reworded for the role, same facts
        </p>
        <p className="rounded-control border border-primary/25 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-foreground">
          Built and maintained SQL data pipelines powering clinical reporting
        </p>
      </div>
      <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5 text-xs font-medium text-success">
        <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Integrity check passed. Same employers, titles, dates, and skills.
      </p>
    </div>
  );
}

/** Sponsorship capability: two honest signal rows, green only for evidence. */
export function MiniSignalRows({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="flex items-center gap-2 rounded-control border border-success/25 bg-success/5 px-3 py-2 text-xs font-medium text-success">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Sponsorship signal found in public filings
      </p>
      <p className="flex items-center gap-2 rounded-control border border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        No sponsorship signal on record
      </p>
      <div className="pt-0.5">
        <IllustrativeChip />
      </div>
    </div>
  );
}
