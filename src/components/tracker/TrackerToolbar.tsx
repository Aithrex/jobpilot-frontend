/**
 * The one bar of chrome above the pipeline.
 *
 * Scope comes first, because it decides what the page is even about; filters
 * narrow whatever scope is chosen. Filters live inside popovers rather than an
 * always-open chip wall, so the default state of the page is the list itself,
 * and each trigger reports its own active count.
 */
import { Check, Download, Filter, CalendarRange, Search, Sparkles, X } from 'lucide-react';

import type { ApplicationStatus } from '@/types/resume';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCivilDay } from '@/lib/applicationDates';
import { cn } from '@/lib/utils';

import { DATE_PRESETS, STATUSES, type DatePreset } from './trackerConfig';
import { SCOPES, type Scope } from './trackerScopes';

interface TrackerToolbarProps {
  scope: Scope;
  onScopeChange: (s: Scope) => void;
  /** Live per-scope totals, so the control says how much work each one holds. */
  scopeCounts: Record<Scope, number>;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: Set<ApplicationStatus>;
  onToggleStatus: (key: ApplicationStatus) => void;
  datePreset: DatePreset;
  onDatePresetChange: (p: DatePreset) => void;
  customFrom: string;
  onCustomFromChange: (v: string) => void;
  customTo: string;
  onCustomToChange: (v: string) => void;
  dateRange: { from: string; to: string } | null;
  filtersActive: boolean;
  onClearFilters: () => void;
  resultCount: number;
  attentionCount: number;
  onOpenInsights: () => void;
  /** Download the rows in the current view as CSV. */
  onExport?: () => void;
  exportDisabled?: boolean;
}

export default function TrackerToolbar({
  scope,
  onScopeChange,
  scopeCounts,
  search,
  onSearchChange,
  statusFilter,
  onToggleStatus,
  datePreset,
  onDatePresetChange,
  customFrom,
  onCustomFromChange,
  customTo,
  onCustomToChange,
  dateRange,
  filtersActive,
  onClearFilters,
  resultCount,
  attentionCount,
  onOpenInsights,
  onExport,
  exportDisabled,
}: TrackerToolbarProps) {
  const dateLabel =
    datePreset === 'all'
      ? 'Applied'
      : datePreset === 'custom' && dateRange
        ? `${formatCivilDay(dateRange.from)} to ${formatCivilDay(dateRange.to)}`
        : DATE_PRESETS.find((p) => p.key === datePreset)?.label || 'Applied';

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border glass-nav px-3 py-2">
      <div
        role="radiogroup"
        aria-label="What to show"
        className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted/60 p-0.5"
      >
        {SCOPES.map((s) => {
          const on = scope === s.key;
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={on}
              title={s.hint}
              onClick={() => onScopeChange(s.key)}
              className={cn(
                'hit-target flex h-8 items-center gap-1.5 rounded-md px-2.5 text-body-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                on
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
              <span className="tabular-nums text-muted-foreground">
                {scopeCounts[s.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative min-w-48 flex-1 basis-full sm:basis-auto">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search role, company, recruiter..."
          aria-label="Search applications"
          className="h-9 border-transparent bg-muted/50 pl-9"
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Filter by stage"
            className={cn('h-9 gap-1.5 text-foreground', statusFilter.size > 0 && 'border-primary/40 text-primary')}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Stage
            {statusFilter.size > 0 && (
              <span className="tabular-nums">· {statusFilter.size}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-1.5">
          {STATUSES.map((s) => {
            const on = statusFilter.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onToggleStatus(s.key)}
                className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-body-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.dot)} />
                <span className="flex-1">{s.label}</span>
                {on && <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Filter by applied date"
            className={cn('h-9 gap-1.5 text-foreground', datePreset !== 'all' && 'border-primary/40 text-primary')}
          >
            <CalendarRange className="h-3.5 w-3.5" aria-hidden />
            {dateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-60 p-1.5">
          <div role="radiogroup" aria-label="Applied date range">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={datePreset === p.key}
                onClick={() => onDatePresetChange(p.key)}
                className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-body-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex-1">{p.label}</span>
                {datePreset === p.key && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                )}
              </button>
            ))}
          </div>
          {datePreset === 'custom' && (
            <div className="mt-1.5 space-y-1.5 border-t border-border pt-2">
              <Input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => onCustomFromChange(e.target.value)}
                aria-label="Applied from"
                className="h-9"
              />
              <Input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => onCustomToChange(e.target.value)}
                aria-label="Applied to"
                className="h-9"
              />
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="sm" className="h-9 gap-1.5 text-foreground" onClick={onOpenInsights}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Insights
        {attentionCount > 0 && (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-caption-sm font-semibold tabular-nums text-primary-foreground">
            {attentionCount}
          </span>
        )}
      </Button>

      {onExport && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          disabled={exportDisabled}
          onClick={onExport}
          title="Download the applications in this view as a CSV file"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export
        </Button>
      )}

      {filtersActive && (
        <>
          <p role="status" className="text-body-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{resultCount}</span>
            {resultCount === 1 ? ' application' : ' applications'}
            {dateRange &&
              (dateRange.from === dateRange.to
                ? ` applied ${formatCivilDay(dateRange.from)}`
                : ` applied ${formatCivilDay(dateRange.from)} to ${formatCivilDay(dateRange.to)}`)}
          </p>
          <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={onClearFilters}>
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </Button>
        </>
      )}
    </div>
  );
}
