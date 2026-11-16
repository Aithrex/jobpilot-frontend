import { Check, GraduationCap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { SearchSegment } from '@/components/job-search/SearchSegment';
import {
  SENIORITY_LEVELS,
  sameLevels,
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

/** "Entry + Mid", or "All levels" when nothing is narrowed. */
export function levelSummary(levels: readonly SeniorityLevel[]): string {
  if (!levels.length) return 'All levels';
  return levels.map((l) => SHORT[l]).join(' + ');
}
const summary = levelSummary;

function basisLine(view: ExperienceView): string {
  const years =
    view.years != null ? `${view.years} yr${view.years === 1 ? '' : 's'} on your resume` : '';
  if (view.source === 'preference+resume') return `${view.preference} · ${years}`;
  if (view.source === 'preference') return `You told us: ${view.preference}`;
  return years;
}

/**
 * The total, and what it is made of, as a sentence: "7 roles: 3 Entry, 3 Mid,
 * 1 with no level stated". Says why a role with no stated level is on a board
 * narrowed to two levels, without hiding it.
 *
 * It used to read as an equation ("7 roles = 3 Entry + 3 Mid + 1 no level
 * stated"), which is how the count is checked, not how a person reads it.
 */
export function ExperienceCountBreakdown({
  className,
  emphasis = false,
}: {
  className?: string;
  /** Set the total in ink, as the board's headline count. */
  emphasis?: boolean;
}) {
  const { seniorityLevels, levelCounts: counts, visibleJobs } = useCombinedJobsCtx();
  const total = `${visibleJobs.length} role${visibleJobs.length === 1 ? '' : 's'}`;
  const parts = seniorityLevels.map((level) => `${counts[level]} ${SHORT[level]}`);
  parts.push(`${counts.unknown} with no level stated`);
  const rest = seniorityLevels.length
    ? `: ${parts.join(', ')}`
    : ` across all levels, including ${counts.unknown} with no level stated`;

  return (
    <p aria-label="Experience count breakdown" className={cn('text-xs leading-relaxed text-muted-foreground', className)}>
      <span className={emphasis ? 'font-semibold text-foreground' : undefined}>{total}</span>
      {rest}
    </p>
  );
}

/** The checklist itself. Rendered in the board popover and in the drawer. */
export function ExperienceLevelList({ className }: { className?: string }) {
  const { seniorityLevels, setSeniorityLevels, resetSeniorityLevels, experienceView, levelCounts: counts } =
    useCombinedJobsCtx();
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
            <p className="mt-0.5 truncate text-caption-sm text-muted-foreground">
              {basisLine(experienceView)}
            </p>
          </div>
          {isMine ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-caption-sm font-medium text-primary">
              <Check className="h-3.5 w-3.5" aria-hidden /> Active
            </span>
          ) : (
            <Button size="sm" className="hit-target h-8 shrink-0" onClick={resetSeniorityLevels}>
              Use my level
            </Button>
          )}
        </div>
      )}

      <fieldset>
        <legend className="sr-only">Experience levels to show</legend>
        <ExperienceCountBreakdown className="mb-1 font-medium text-foreground" />
        <p className="mb-2 text-caption-sm text-muted-foreground">Counts use your selected date window and other filters.</p>
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
                    <span className="block text-caption-sm text-muted-foreground">
                      {LEVEL_META[level].hint}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-caption-sm tabular-nums text-muted-foreground">
                    {counts[level]}
                  </span>
                </label>
              </li>
            );
          })}
          <li className="flex items-center gap-3 rounded-md bg-muted/60 px-2 py-2">
            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium leading-tight">No level stated</span>
              <span className="block text-caption-sm text-muted-foreground">Always included so you don't miss a role</span>
            </span>
            <span className="shrink-0 font-mono text-caption-sm tabular-nums text-muted-foreground">{counts.unknown}</span>
          </li>
        </ul>
      </fieldset>

      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-caption-sm leading-snug text-muted-foreground" data-testid="seniority-basis">
          {seniorityLevels.length
            ? 'Selected levels and roles with no level stated are shown.'
            : 'Showing every level.'}
        </p>
        {seniorityLevels.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="hit-target h-8 shrink-0 px-2 text-xs"
            onClick={() => setSeniorityLevels([])}
          >
            Show all levels
          </Button>
        )}
      </div>
    </div>
  );
}

/** The Experience segment of the search bar: what is applied, at a glance,
 *  and the checklist behind it. */
export function ExperienceLevelPicker() {
  const { seniorityLevels, experienceView } = useCombinedJobsCtx();
  const mine = experienceView?.levels ?? [];
  const isMine = mine.length > 0 && sameLevels(seniorityLevels, mine);
  const changed = mine.length > 0 ? !isMine : seniorityLevels.length > 0;

  return (
    <SearchSegment
      icon={GraduationCap}
      label="Experience"
      value={summary(seniorityLevels)}
      tag={isMine ? 'Your level' : undefined}
      ariaLabel={`Experience level: ${summary(seniorityLevels)}`}
      changed={changed}
      testId="search-segment-level"
    >
      <p className="mb-2 text-sm font-semibold">Which experience levels?</p>
      <ExperienceLevelList />
    </SearchSegment>
  );
}
