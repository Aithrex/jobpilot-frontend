/**
 * Resume overview panel - the right-hand "where do I stand" column.
 *
 * Replaces the tool tiles that used to sit here. Those tiles (Six Seconds,
 * Voice analysis) were duplicates: both are rows in the left dock, so the same
 * two destinations were reachable twice from one viewport. The column now
 * carries state instead of navigation.
 *
 * Three blocks, all facts already in hand or from one existing hook. No score,
 * no trend, nothing derived - consistent with the dock's health panel, which
 * states checks rather than inventing a rubric.
 */
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { QuotaMeter } from '@/components/billing/QuotaMeter';
import { useDailyUsage } from '@/hooks/useDailyUsage';
import StreakWidget from '@/components/resume/StreakWidget';
import { useResumeWorkspaceContext } from './ResumeWorkspaceContext';

/** English pluralisation for the small counts this panel carries. */
function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

function CountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function ResumeOverviewPanel({ className }: { className?: string }) {
  const { resumesState, tailoredState, resumeCount, tailoredCount } =
    useResumeWorkspaceContext();
  const { usage, loading: usageLoading } = useDailyUsage();

  return (
    <aside aria-label="Resume overview" className={cn('space-y-3', className)}>
      {/* Streak. The widget owns its own fetch, loading and error states and
          already renders current + personal best, so it is reused verbatim
          rather than reimplemented. `compact` drops the 30-day heatmap, which
          does not fit a narrow column. */}
      <div className="studio-panel p-4">
        <StreakWidget compact />
      </div>

      {/* Counts - raw list lengths, nothing computed. */}
      <div className="studio-panel space-y-2.5 p-4">
        <p className="overline">Your library</p>
        {resumesState === 'loading' ? (
          <Skeleton className="h-4 w-full" />
        ) : resumesState === 'ready' ? (
          <CountRow label="Base resumes" value={count(resumeCount, 'file')} />
        ) : null}
        {tailoredState === 'loading' ? (
          <Skeleton className="h-4 w-full" />
        ) : tailoredState === 'ready' ? (
          <CountRow label="Tailored versions" value={count(tailoredCount, 'version')} />
        ) : null}
      </div>

      {/* Daily tailor quota. QuotaMeter already handles the unlimited,
          near-limit and exhausted states, so this only supplies the numbers.
          Hidden entirely when usage is unknown - a quota bar built on a failed
          read would misinform rather than inform. */}
      {(usageLoading || usage) && (
        <div className="studio-panel p-4">
          {usage ? (
            <QuotaMeter label="Tailors today" used={usage.used} limit={usage.limit} />
          ) : (
            <Skeleton className="h-8 w-full" />
          )}
        </div>
      )}
    </aside>
  );
}
