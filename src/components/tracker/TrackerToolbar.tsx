/**
 * The one bar of chrome above the pipeline.
 *
 * Filters live inside popovers rather than an always-open chip wall, so the
 * default state of the page is the list itself. Each trigger reports its own
 * active count, which is the only thing the collapsed state needs to say.
 */
import { Check, Filter, CalendarRange, Search, Sparkles, X } from 'lucide-react';

import type { ApplicationStatus } from '@/types/resume';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCivilDay } from '@/lib/applicationDates';
import { cn } from '@/lib/utils';

import {
  DATE_PRESETS,
  GROUP_BY_OPTIONS,
  STATUSES,
  type DatePreset,
  type GroupBy,
} from './trackerConfig';

interface TrackerToolbarProps {
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
  groupBy: GroupBy;
  onGroupByChange: (g: GroupBy) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
  resultCount: number;
  attentionCount: number;
  onOpenInsights: () => void;
}

export default function TrackerToolbar({
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
  groupBy,
  onGroupByChange,
  filtersActive,
  onClearFilters,
  resultCount,
  attentionCount,
  onOpenInsights,
}: TrackerToolbarProps) {
  const dateLabel =
    datePreset === 'all'
      ? 'Applied'
      : datePreset === 'custom' && dateRange
        ? `${formatCivilDay(dateRange.from)} – ${formatCivilDay(dateRange.to)}`
        : DATE_PRESETS.find((p) => p.key === datePreset)?.label || 'Applied';

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border glass-nav px-3 py-2">
      <div className="relative min-w-[12rem] flex-1">
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
            className={cn('h-9 gap-1.5', statusFilter.size > 0 && 'border-primary/40 text-primary')}
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
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className={cn('h-9 gap-1.5', datePreset !== 'all' && 'border-primary/40 text-primary')}
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
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className="h-8"
              />
              <Input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => onCustomToChange(e.target.value)}
                aria-label="Applied to"
                className="h-8"
              />
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupBy)}>
        <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Group applications by">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GROUP_BY_OPTIONS.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              Group: {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onOpenInsights}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Insights
        {attentionCount > 0 && (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold tabular-nums text-primary-foreground">
            {attentionCount}
          </span>
        )}
      </Button>

      {filtersActive && (
        <>
          <p role="status" className="text-label text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{resultCount}</span>
            {resultCount === 1 ? ' application' : ' applications'}
            {dateRange &&
              (dateRange.from === dateRange.to
                ? ` applied ${formatCivilDay(dateRange.from)}`
                : ` applied ${formatCivilDay(dateRange.from)} - ${formatCivilDay(dateRange.to)}`)}
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
