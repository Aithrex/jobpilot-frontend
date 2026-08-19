import { useMemo } from 'react';
import {
  AlertCircle,
  Check,
  Globe,
  Loader2,
  MapPin,
  Radar,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { SignalField } from '@/components/job-search/SignalField';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { JOB_TITLES_CAP } from '@/hooks/useJobTitles';
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

function Pill({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-background text-primary shadow-soft'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Right-side Job feed setup. Titles, location, refine filters, then Sync / Search.
 * The listings page stays dedicated to roles; this sheet is the control surface.
 */
export function JobFeedSheet() {
  const {
    jobs,
    loading,
    states,
    sourceLabels,
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
    scanLocation,
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
  const fieldIntensity = useMemo(() => {
    const strongCount = jobs.filter((j) => (j.match_score ?? 0) >= 70).length;
    return Math.min(1, strongCount / 25);
  }, [jobs]);

  return (
    <Sheet open={customizeOpen} onOpenChange={(open) => setCustomizeOpen(open)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md lg:max-w-lg"
      >
        <SheetHeader className="relative space-y-3 overflow-hidden border-b border-border px-5 py-4 text-left">
          <SignalField
            intensity={fieldIntensity}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
          />
          <div className="relative pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Radar className="h-4 w-4" aria-hidden />
                )}
              </span>
              <SheetTitle className="text-base">Job feed</SheetTitle>
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary"
              >
                <Sparkles className="h-2.5 w-2.5" aria-hidden /> Auto-sync
              </Badge>
            </div>
            <SheetDescription className="mt-1.5 text-xs" aria-live="polite">
              {loading
                ? progress.total > 0
                  ? `Scanning ${progress.done} of ${progress.total} companies · ${roleCount} roles so far`
                  : 'Starting scan across all sources...'
                : lastSyncedAt
                  ? `Updated ${formatAgo(lastSyncedAt)} · ${roleCount} roles`
                  : 'Set titles and location, then Search to build the feed.'}
              {!loading && lastSyncedAt && secondsUntilNext != null && (
                <span className="ml-1 font-mono tabular-nums text-primary">
                  · next sync {formatCountdown(secondsUntilNext)}
                </span>
              )}
            </SheetDescription>
          </div>

          <div className="relative flex flex-wrap items-center gap-1.5">
            {SOURCE_KEYS.map((k) => {
              const st = states[k];
              const active = st.loading;
              const done = !st.loading && (st.withResults > 0 || st.tenantsTotal > 0);
              return (
                <Badge
                  key={k}
                  variant="outline"
                  className={cn(
                    'gap-1 text-[10px] font-medium',
                    st.error
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : active
                        ? 'border-primary/30 bg-primary/5 text-primary'
                        : done
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-border text-muted-foreground',
                  )}
                >
                  {active ? (
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  ) : st.error ? (
                    <AlertCircle className="h-2.5 w-2.5" aria-hidden />
                  ) : done ? (
                    <Check className="h-2.5 w-2.5" aria-hidden />
                  ) : null}
                  {sourceLabels[k]}
                  {active && st.tenantsTotal > 0 ? ` · ${st.tenantsDone}/${st.tenantsTotal}` : ''}
                </Badge>
              );
            })}
          </div>

          {loading && (
            <Progress
              value={progress.total ? (progress.done / progress.total) * 100 : 8}
              className="relative h-1.5"
            />
          )}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
                <Search className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Search scope</p>
                <p className="text-[11px] text-muted-foreground">
                  Sets what we scan. Press Search to re-scan every source.
                </p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                Role titles
                <span className="font-normal">· prefilled from your resume</span>
              </p>
              <ChipsInput
                values={titles}
                onChange={setTitles}
                maxItems={JOB_TITLES_CAP}
                placeholder="e.g. Backend Engineer, Data Engineer..."
                defaultValues={
                  resumeTitles.length ? resumeTitles.slice(0, JOB_TITLES_CAP) : undefined
                }
                accentClass="border-primary/30 bg-primary/10 text-primary"
                helperText="These titles drive Workday, career pages, and MNC boards. Saved automatically."
                emptyState="Add a role title, or upload a resume to prefill."
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void smartSuggestTitles()}
                disabled={suggestingTitles}
                className="mt-1 gap-1 px-2 text-[11px] text-primary"
              >
                {suggestingTitles ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                {suggestingTitles ? 'Analyzing resume...' : 'Smart-suggest titles from resume'}
              </Button>
              {titlesPending && lastScanTitles && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium text-warning">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                  Title changes not yet applied. Results were scanned with {lastScanTitles.length} title
                  {lastScanTitles.length === 1 ? '' : 's'}. Press Search to update.
                </p>
              )}
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/50 p-3">
              <label htmlFor="combined-us-only" className="min-w-0 cursor-pointer">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Globe className="h-3.5 w-3.5 text-primary" aria-hidden />
                  United States only
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {usOnly
                    ? 'Keeping only clearly US-based and US-remote roles. Turn off to include other countries.'
                    : 'Including roles from any country. Turn on to limit to the US.'}
                </span>
              </label>
              <Switch
                id="combined-us-only"
                checked={usOnly}
                onCheckedChange={setUsOnly}
                className="mt-0.5 shrink-0"
              />
            </div>

            {usOnly ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="combined-state"
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden /> State (optional)
                  </label>
                  <Select
                    value={usState || ANY_STATE}
                    onValueChange={(v) => setUsState(v === ANY_STATE ? '' : v)}
                  >
                    <SelectTrigger id="combined-state" className="h-10">
                      <SelectValue placeholder="All US states" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value={ANY_STATE}>All US states</SelectItem>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    htmlFor="combined-city"
                    className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                  >
                    City (optional)
                  </label>
                  <Input
                    id="combined-city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Austin"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="combined-location"
                  className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> Location
                </label>
                <Input
                  id="combined-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, state, or country - e.g. London, Toronto, Remote"
                />
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
              <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} />
              Remote only
            </label>

            {scanLocation && (
              <p className="text-[11px] text-muted-foreground">
                Scanning: {usOnly ? 'US only' : 'Global'}
                {scanLocation ? ` · ${scanLocation}` : ''}
                {remoteOnly ? ' · Remote only' : ''}
              </p>
            )}

            {!canSearch && (
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-warning">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Add at least one role title or upload a resume to build your job feed.
              </p>
            )}
          </section>

          <section className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">Refine listings</p>
                <p className="text-[11px] text-muted-foreground">Instant. Does not re-scan.</p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Seniority</p>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Seniority filter"
              >
                {SENIORITY_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Minimum match</p>
              <div className="inline-flex flex-wrap rounded-full border border-border bg-muted/40 p-0.5">
                {MIN_SCORE_OPTIONS.map((n) => (
                  <Pill key={n} active={minScore === n} onClick={() => setMinScore(n)}>
                    {n === 0 ? 'Any match' : `${n}+`}
                  </Pill>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Sponsorship</p>
              <div
                className="inline-flex flex-wrap rounded-full border border-border bg-muted/40 p-0.5"
                title='"Sponsor-friendly" hides postings that explicitly decline visa sponsorship; "Proven" keeps only companies with recent H-1B filings.'
              >
                {(
                  [
                    ['all', 'All'],
                    ['friendly', 'Sponsor-friendly'],
                    ['proven', 'Proven sponsors'],
                  ] as const
                ).map(([key, label]) => (
                  <Pill key={key} active={sponsorFilter === key} onClick={() => setSponsorFilter(key)}>
                    {label}
                  </Pill>
                ))}
              </div>
            </div>
          </section>
        </div>

        <SheetFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3 sm:space-x-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetScope}
            className="mr-auto gap-1.5 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sync(true)}
            disabled={loading}
            className="gap-1.5"
            title="Re-scan every source now"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
            {loading ? 'Syncing...' : 'Sync now'}
          </Button>
          <Button
            size="sm"
            onClick={() => sync(true)}
            disabled={loading || !canSearch}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
