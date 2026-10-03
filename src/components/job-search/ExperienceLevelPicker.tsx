import { useMemo } from 'react';
import { BriefcaseBusiness, Check, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import {
  SENIORITY_LEVELS,
  sameLevels,
  seniorityViewOf,
  type SeniorityLevel,
} from '@/lib/careerJobs';
import { cn } from '@/lib/utils';
import type { ExperienceView } from '@/types/jobs';

/**
 * The experience-level control for the "For you" board.
 *
 * It used to be a row of four bare chips inside the Job feed drawer: no
 * meaning per level, no sign of which were on, and nowhere on the board itself
 * to see it was filtering at all. Each level now says what it means in years,
 * shows how many roles it holds, and the candidate's own level is one tap away.
 */
const LEVEL_META: Record<SeniorityLevel, { label: string; hint: string }> = {
  intern: { label: 'Internship', hint: 'Students and co-ops' },
  entry: { label: 'Entry level', hint: '0-2 years' },
  mid: { label: 'Mid level', hint: '3-4 years' },
  senior: { label: 'Senior', hint: '5-7 years' },
  staff: { label: 'Staff and above', hint: '8+ years, leads, managers' },
};

const SHORT: Record<SeniorityLevel, string> = {
  intern: 'Intern',
  entry: 'Entry',
  mid: 'Mid',
  senior: 'Senior',
  staff: 'Staff+',
};

function summary(levels: readonly SeniorityLevel[]): string {
  if (!levels.length) return 'All levels';
  return levels.map((l) => SHORT[l]).join(' + ');
}

function basisLine(view: ExperienceView): string {
  const years =
    view.years != null ? `${view.years} yr${view.years === 1 ? '' : 's'} on your resume` : '';
  if (view.source === 'preference+resume') return `${view.preference} - ${years}`;
  if (view.source === 'preference') return `You told us: ${view.preference}`;
  return years;
}

function useLevelCounts() {
  const { jobs } = useCombinedJobsCtx();
  return useMemo(() => {
    const counts: Record<SeniorityLevel | 'unknown', number> = {
      intern: 0, entry: 0, mid: 0, senior: 0, staff: 0, unknown: 0,
    };
    for (const j of jobs ?? []) counts[seniorityViewOf(j)] += 1;
    return counts;
  }, [jobs]);
}

/** The checklist itself. Rendered in the board popover and in the drawer. */
export function ExperienceLevelList({ className }: { className?: string }) {
  const { seniorityLevels, setSeniorityLevels, resetSeniorityLevels, experienceView } =
    useCombinedJobsCtx();
  const counts = useLevelCounts();
  const mine = experienceView?.levels ?? [];
  const isMine = mine.length > 0 && sameLevels(seniorityLevels, mine);

  const toggle = (level: SeniorityLevel, on: boolean) => {
    const next = on
      ? [...seniorityLevels, level]
      : seniorityLevels.filter((l) => l !== level);
    setSeniorityLevels(SENIORITY_LEVELS.filter((l) => next.includes(l)));
  };

  return (
    <div className={cn('space-y-3', className)}>
      {experienceView && mine.length > 0 && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg border p-3',
            isMine ? 'border-primary/40 bg-primary/5' : 'border-border',
          )}
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              Matched to you: {summary(mine)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {basisLine(experienceView)}
            </p>
          </div>
          {isMine ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
              <Check className="h-3.5 w-3.5" aria-hidden /> Applied
            </span>
          ) : (
            <Button size="sm" className="h-8 shrink-0" onClick={resetSeniorityLevels}>
              Use my level
            </Button>
          )}
        </div>
      )}

      <fieldset>
        <legend className="sr-only">Experience levels to show</legend>
        <ul className="space-y-1">
          {SENIORITY_LEVELS.map((level) => {
            const checked = seniorityLevels.includes(level);
            const id = `exp-level-${level}`;
            return (
              <li key={level}>
                <label
                  htmlFor={id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted',
                    checked && 'bg-muted/60',
                  )}
                >
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={(v) => toggle(level, v === true)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-tight">
                      {LEVEL_META[level].label}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {LEVEL_META[level].hint}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {counts[level]}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-[11px] leading-snug text-muted-foreground" data-testid="seniority-basis">
          {seniorityLevels.length
            ? `Roles that state no level are always shown (${counts.unknown}).`
            : 'Showing every level.'}
        </p>
        {seniorityLevels.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2 text-xs"
            onClick={() => setSeniorityLevels([])}
          >
            Show all levels
          </Button>
        )}
      </div>
    </div>
  );
}

/** The board's toolbar button: what is applied, at a glance, and the list. */
export function ExperienceLevelPicker() {
  const { seniorityLevels, experienceView } = useCombinedJobsCtx();
  const mine = experienceView?.levels ?? [];
  const isMine = mine.length > 0 && sameLevels(seniorityLevels, mine);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Experience level: ${summary(seniorityLevels)}`}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors hover:bg-muted',
            seniorityLevels.length ? 'border-primary/50 bg-primary/5' : 'border-border',
          )}
        >
          <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden />
          <span className="text-muted-foreground">Experience:</span>
          <span>{summary(seniorityLevels)}</span>
          {isMine && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Your level
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-3">
        <p className="mb-2 text-sm font-semibold">Experience level</p>
        <ExperienceLevelList />
      </PopoverContent>
    </Popover>
  );
}
