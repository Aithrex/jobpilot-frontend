import { useEffect, useImperativeHandle, useState, forwardRef, useCallback } from 'react';
import { CloudOff } from 'lucide-react';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  today_count: number;
  total_applications: number;
  last_application_date: string | null;
  heatmap: { date: string; count: number }[];
}

export interface StreakWidgetHandle {
  refresh: () => Promise<void>;
}

/** Single-tone flame - inherits currentColor so callers pick the token. */
function FlameIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5c1.6 3.4 4.7 5 4.7 8.7 0 2-1.2 3.6-2.9 4.3.7-1.4.5-3-1-4.4-.4 2.4-2.1 3.4-3 4.6-1.4 1.8-1.4 4.6 1 6.2-3.6-.4-6.3-3.1-6.3-6.7 0-4.5 4-6.5 4-9.7 0-1 .3-2 .8-3 .7 1.2 2 1.7 2.7 0z" />
    </svg>
  );
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function shortDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

function dayOfMonth(dateStr: string): string {
  return String(parseInt(dateStr.slice(8, 10), 10));
}

type CellVariant = 'empty' | 'low' | 'mid' | 'high' | 'peak';

function variantFor(count: number): CellVariant {
  if (count <= 0) return 'empty';
  if (count === 1) return 'low';
  if (count === 2) return 'mid';
  if (count <= 4) return 'high';
  return 'peak';
}

/** Heat encoded as warning-tinted washes; numerals stay foreground for contrast. */
const CELL_BASE_STYLES: Record<CellVariant, string> = {
  empty: 'bg-muted/50 border-border/70 text-muted-foreground',
  low: 'bg-warning/10 border-warning/20 text-foreground/80',
  mid: 'bg-warning/20 border-warning/30 text-foreground/90',
  high: 'bg-warning/30 border-warning/40 text-foreground',
  peak: 'bg-warning/40 border-warning/60 text-foreground',
};

const StreakWidget = forwardRef<StreakWidgetHandle, { compact?: boolean }>(({ compact = false }, ref) => {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const resp = await apiService.getApplicationStreak();
    if (resp.data) {
      setData(resp.data);
      setError(false);
    } else if (resp.error) {
      setError(true);
    } else {
      const today = new Date();
      const heatmap = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today);
        d.setUTCDate(today.getUTCDate() - (29 - i));
        return { date: d.toISOString().slice(0, 10), count: 0 };
      });
      setData({
        current_streak: 0,
        longest_streak: 0,
        today_count: 0,
        total_applications: 0,
        last_application_date: null,
        heatmap,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const onSaved = () => { load(); };
    window.addEventListener('resume:application-saved', onSaved);
    return () => window.removeEventListener('resume:application-saved', onSaved);
  }, [load]);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  if (loading) {
    return (
      <div className="flex h-[72px] items-center gap-4 rounded-xl border border-border bg-card px-4 shadow-soft" aria-hidden="true">
        <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="ml-auto hidden items-center gap-1.5 sm:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-7 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-[72px] flex-wrap content-center items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-xs text-muted-foreground shadow-soft">
        <CloudOff className="h-3.5 w-3.5 shrink-0 text-warning" />
        <span>Couldn't load your streak.</span>
        <button
          onClick={() => { setLoading(true); void load(); }}
          className="font-semibold text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isAlive = data.current_streak > 0;
  const todayActive = data.today_count > 0;
  const recent = [...data.heatmap].reverse().slice(0, 10);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      {/* Top accent bar - warm when the streak is alive, quiet when not */}
      <div
        className={`absolute inset-x-0 top-0 h-px ${
          isAlive
            ? 'bg-gradient-to-r from-transparent via-warning/60 to-transparent'
            : 'bg-gradient-to-r from-transparent via-border to-transparent'
        }`}
      />
      {/* Ambient glow - only when streak is alive */}
      {isAlive && (
        <>
          <div className="absolute -top-12 left-4 w-32 h-32 rounded-full bg-warning/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 right-1/3 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        </>
      )}

      <div className="relative px-4 py-2.5 flex items-center gap-4 flex-wrap sm:flex-nowrap">
        {/* ── Today's count (primary) ───────────────────────────────── */}
        <div
          className="flex items-center gap-2 shrink-0"
          title={`${data.today_count} application${data.today_count === 1 ? '' : 's'} applied today`}
        >
          <div className="relative">
            {todayActive && (
              <div className="absolute inset-0 -m-1 rounded-full bg-warning/20 blur-md pointer-events-none" />
            )}
            <FlameIcon className={cn('relative w-6 h-6', todayActive ? 'text-warning' : 'text-muted-foreground/40')} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'font-display text-2xl font-extrabold tabular-nums leading-none tracking-tight',
                todayActive ? 'text-foreground' : 'text-muted-foreground/60',
              )}
            >
              {data.today_count}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground leading-none">
              today
            </span>
          </div>
        </div>

        {/* Soft divider */}
        <div className="hidden sm:block h-8 w-px shrink-0 bg-gradient-to-b from-transparent via-border to-transparent" />

        {/* ── Day streak (secondary) ────────────────────────────────── */}
        <div
          className="flex items-center gap-2 shrink-0"
          title={
            data.longest_streak > 0
              ? `Personal best: ${data.longest_streak} day${data.longest_streak === 1 ? '' : 's'}`
              : 'Tailor a resume each day to build a streak'
          }
        >
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'font-display text-xl font-extrabold tabular-nums leading-none tracking-tight',
                isAlive ? 'text-warning' : 'text-muted-foreground/60',
              )}
            >
              {data.current_streak}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground leading-none">
              day streak
            </span>
          </div>
          {data.longest_streak > 0 && data.longest_streak > data.current_streak && (
            <span
              className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-medium leading-none px-2 py-1 rounded-full border border-border bg-muted"
              title={`Personal best: ${data.longest_streak} day${data.longest_streak === 1 ? '' : 's'}`}
            >
              <span className="text-muted-foreground">Best</span>
              <span className="tabular-nums font-semibold text-foreground">{data.longest_streak}</span>
            </span>
          )}
        </div>

        {/* Soft divider */}
        <div className="hidden sm:block h-8 w-px shrink-0 bg-gradient-to-b from-transparent via-border to-transparent" />

        {/* ── Right: today-first per-day cells ───────────────────────── */}
        {!compact && (
          <div className="flex items-end gap-1.5 ml-auto shrink-0">
            {recent.map((cell, idx) => {
              const isToday = idx === 0;
              const variant = variantFor(cell.count);
              const isActive = cell.count > 0;
              const isHeroToday = isToday && todayActive;

              const baseTone = isHeroToday
                ? 'bg-warning/30 border-warning/60 text-foreground'
                : CELL_BASE_STYLES[variant];

              const sizing = isHeroToday
                ? 'w-10 h-10 text-base ring-2 ring-warning/50 ring-offset-2 ring-offset-card'
                : isToday
                  ? 'w-7 h-7 text-[12px] ring-1 ring-warning/40'
                  : 'w-7 h-7 text-[12px]';

              return (
                <div
                  key={cell.date}
                  className="flex flex-col items-center gap-1 group/cell"
                  title={`${dayLabel(cell.date)}: ${cell.count} application${cell.count === 1 ? '' : 's'}`}
                >
                  <div
                    className={`relative rounded-lg border flex items-center justify-center font-semibold tabular-nums transition-all duration-200 ${baseTone} ${sizing} ${
                      isActive
                        ? 'group-hover/cell:-translate-y-0.5 group-hover/cell:shadow-soft'
                        : 'group-hover/cell:border-muted-foreground/40'
                    }`}
                  >
                    {isActive && (
                      <FlameIcon
                        className={`absolute inset-0 w-full h-full pointer-events-none text-warning ${
                          isHeroToday ? 'opacity-30 animate-pulse' : 'opacity-20'
                        }`}
                      />
                    )}
                    {/* Empty days show a dim dot rather than a loud "0" */}
                    {!isActive ? (
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                    ) : (
                      <span className="relative leading-none">{cell.count}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-semibold uppercase tracking-wider leading-none',
                      isToday
                        ? 'text-foreground'
                        : isActive
                          ? 'text-muted-foreground'
                          : 'text-muted-foreground/60',
                    )}
                  >
                    {isToday ? 'Today' : `${shortDay(cell.date)} ${dayOfMonth(cell.date)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

StreakWidget.displayName = 'StreakWidget';

export default StreakWidget;
