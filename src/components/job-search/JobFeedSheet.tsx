import { useMemo, type ReactNode } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { ChipsInput } from '@/components/job-search/ChipsInput';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { JOB_TITLES_CAP } from '@/hooks/useJobTitles';
import { PillSwitch } from '@/components/ui/pill-switch';
import { cn } from '@/lib/utils';

const ANY_STATE = '__any__';

const US_STATES = [
  'Remote',
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
] as const;

const SENIORITY_OPTIONS = [
  { key: 'any', label: 'Any level' },
  { key: 'intern', label: 'Intern' },
  { key: 'entry', label: 'Entry' },
  { key: 'mid', label: 'Mid' },
  { key: 'senior', label: 'Senior+' },
] as const;

const MIN_SCORE_OPTIONS = [0, 40, 60, 80] as const;

const SOURCE_KEYS = ['workday', 'careers', 'mncs'] as const;

const SOURCE_SHORT: Record<(typeof SOURCE_KEYS)[number], string> = {
  workday: 'Workday',
  careers: 'Careers',
  mncs: 'MNCs',
};

function formatAgo(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  return `${m}:${String(sec % 60).padStart(2, '0')}`;
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="overline mb-2 block">
      {children}
    </label>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex h-10 cursor-pointer items-center justify-between rounded-lg border border-border/70 bg-background/55 px-3"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

/**
 * Right-side Job feed controls. Titles, location, listing filters, then Search.
 */
export function JobFeedSheet() {
  const {
    jobs,
    loading,
    states,
    progress,
    titles,
    setTitles,
    resumeTitles,
    smartSuggestTitles,
    suggestingTitles,
    canSearch,
    lastScanTitles,
    titlesPending,
    lastSyncedAt,
    secondsUntilNext,
    sync,
    usOnly,
    setUsOnly,
    usState,
    setUsState,
    city,
    setCity,
    location,
    setLocation,
    remoteOnly,
    setRemoteOnly,
    customizeOpen,
    setCustomizeOpen,
    resetScope,
    seniority,
    setSeniority,
    minScore,
    setMinScore,
    sponsorFilter,
    setSponsorFilter,
  } = useCombinedJobsCtx();

  const roleCount = jobs.length;
  const statusLine = useMemo(() => {
    if (loading) {
      return progress.total > 0
        ? `${progress.done}/${progress.total} companies · ${roleCount} roles`
        : 'Scanning…';
    }
    if (lastSyncedAt) {
      const next =
        secondsUntilNext != null ? ` · next ${formatCountdown(secondsUntilNext)}` : '';
      return `${formatAgo(lastSyncedAt)} · ${roleCount} roles${next}`;
    }
    return `${roleCount} roles`;
  }, [loading, progress.done, progress.total, roleCount, lastSyncedAt, secondsUntilNext]);

  return (
    <Sheet open={customizeOpen} onOpenChange={(open) => setCustomizeOpen(open)}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/40"
        className="liquid-glass flex w-full flex-col gap-0 overflow-hidden rounded-l-2xl border-l p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-3 border-b border-border/50 px-6 pb-4 pt-5 text-left">
          <div className="pr-8">
            <p className="overline">Jobs</p>
            <SheetTitle className="mt-1 font-display text-xl font-semibold tracking-tight">
              Job feed
            </SheetTitle>
            <SheetDescription className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground" aria-live="polite">
              {statusLine}
            </SheetDescription>
          </div>

          <ul className="grid grid-cols-3 gap-1.5" aria-label="Source status">
            {SOURCE_KEYS.map((k) => {
              const st = states[k];
              const active = st.loading;
              const done = !st.loading && (st.withResults > 0 || st.tenantsTotal > 0);
              return (
                <li
                  key={k}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border border-border/60 bg-background/50 px-2 py-1.5 text-[10px] font-semibold',
                    st.error
                      ? 'text-destructive'
                      : active
                        ? 'text-primary'
                        : done
                          ? 'text-foreground'
                          : 'text-muted-foreground',
                  )}
                >
                  {active ? (
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  ) : st.error ? (
                    <AlertCircle className="h-2.5 w-2.5 shrink-0" aria-hidden />
                  ) : done ? (
                    <Check className="h-2.5 w-2.5 shrink-0" aria-hidden />
                  ) : (
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                  <span className="truncate">
                    {SOURCE_SHORT[k]}
                    {active && st.tenantsTotal > 0 ? ` ${st.tenantsDone}/${st.tenantsTotal}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>

          {loading && (
            <Progress
              value={progress.total ? (progress.done / progress.total) * 100 : 8}
              className="h-1"
            />
          )}
        </SheetHeader>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
          <section>
            <FieldLabel>Titles</FieldLabel>
            <ChipsInput
              values={titles}
              onChange={setTitles}
              maxItems={JOB_TITLES_CAP}
              placeholder="Backend Engineer"
              defaultValues={
                resumeTitles.length ? resumeTitles.slice(0, JOB_TITLES_CAP) : undefined
              }
              accentClass="border-border bg-muted/60 text-foreground"
              emptyState="Add a title"
              helperText="Titles are shared with Career Portals."
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void smartSuggestTitles()}
              disabled={suggestingTitles}
              className="mt-2 h-8 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              {suggestingTitles ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="mr-1.5 h-3 w-3" aria-hidden />
              )}
              {suggestingTitles ? 'Suggesting...' : 'Suggest from resume'}
            </Button>
            {titlesPending && lastScanTitles && (
              <p className="mt-2 text-[11px] font-medium text-warning">
                Titles changed - Search to apply
              </p>
            )}
            {!canSearch && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-warning">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Add a title or suggest from resume
              </p>
            )}
            {canSearch && titles.length === 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                No title chips - Sync will use roles from your resume background
              </p>
            )}
          </section>

          <section>
            <FieldLabel>Location</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <ToggleRow
                id="combined-us-only"
                label="United States"
                checked={usOnly}
                onCheckedChange={setUsOnly}
              />
              <ToggleRow
                id="combined-remote-only"
                label="Remote"
                checked={remoteOnly}
                onCheckedChange={setRemoteOnly}
              />
            </div>
            {usOnly ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Select
                  value={usState || ANY_STATE}
                  onValueChange={(v) => setUsState(v === ANY_STATE ? '' : v)}
                >
                  <SelectTrigger id="combined-state" className="h-10" aria-label="State">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={ANY_STATE}>All states</SelectItem>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="combined-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  aria-label="City"
                  className="h-10"
                />
              </div>
            ) : (
              <Input
                id="combined-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, country, or Remote"
                aria-label="Location"
                className="mt-2 h-10"
              />
            )}
          </section>

          <section>
            <FieldLabel>Filters</FieldLabel>
            <div className="space-y-3">
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger className="h-10" aria-label="Seniority">
                  <SelectValue placeholder="Seniority" />
                </SelectTrigger>
                <SelectContent>
                  {SENIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Match</p>
                <PillSwitch
                  fill
                  aria-label="Minimum match score"
                  layoutId="feed-score-pill"
                  value={String(minScore)}
                  onValueChange={(v) => setMinScore(Number(v))}
                  options={MIN_SCORE_OPTIONS.map((n) => ({
                    value: String(n),
                    label: n === 0 ? 'Any' : `${n}+`,
                  }))}
                />
              </div>

              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Sponsorship</p>
                <PillSwitch
                  fill
                  aria-label="Sponsorship filter"
                  layoutId="feed-sponsor-pill"
                  value={sponsorFilter}
                  onValueChange={setSponsorFilter}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'friendly', label: 'Friendly' },
                    { value: 'proven', label: 'Proven' },
                  ]}
                />
              </div>
            </div>
          </section>
        </div>

        <SheetFooter className="flex-row items-center gap-2 border-t border-border/50 px-6 py-3 sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetScope}
            className="mr-auto h-9 gap-1.5 px-2 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sync(true)}
            disabled={loading}
            className="h-9 gap-1.5"
            title="Re-scan every source now"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
            Sync
          </Button>
          <Button
            size="sm"
            onClick={() => sync(true)}
            disabled={loading || !canSearch}
            className="h-9 min-w-[5.5rem] gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {loading ? 'Searching' : 'Search'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
