import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle, Check, ChevronDown, Loader2, MapPin, Radar, RefreshCw,
  Rocket, Search, ShieldAlert, SlidersHorizontal, Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { JobCard } from '@/components/job-search/JobCard';
import { SignalField } from '@/components/job-search/SignalField';
import { useCombinedJobsCtx } from '@/components/job-search/CombinedJobsProvider';
import { useCountUp } from '@/hooks/useCountUp';
import { RECENCY_OPTIONS, seniorityOf, toJob } from '@/lib/careerJobs';
import { cn } from '@/lib/utils';
import type { Job, WorkdayJob } from '@/types/jobs';

const PAGE_SIZE = 24;

const SENIORITY_OPTIONS = [
  { key: 'any', label: 'Any level' },
  { key: 'intern', label: 'Intern' },
  { key: 'entry', label: 'Entry' },
  { key: 'mid', label: 'Mid' },
  { key: 'senior', label: 'Senior+' },
] as const;

const MIN_SCORE_OPTIONS = [0, 40, 60, 80] as const;

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

function pageWindow(page: number, count: number): number[] {
  const span = Math.min(5, count);
  let start = Math.max(1, page - 2);
  const end = Math.min(count, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/** Segmented pill button. */
function Seg({ active, onClick, children, title }: {
  active: boolean; onClick: () => void; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'bg-background text-primary shadow-soft' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

interface CombinedJobsPanelProps {
  isJobSaved: (jobId: string) => boolean;
  getJobStatus: (jobId: string) => string | null;
  saveJob: (job: Job) => void | Promise<unknown>;
  unsaveJob: (jobId: string) => void | Promise<unknown>;
  quickApply: (job: Job) => void | Promise<unknown>;
}

export function CombinedJobsPanel({
  isJobSaved, getJobStatus, saveJob, unsaveJob, quickApply,
}: CombinedJobsPanelProps) {
  const reduceMotion = useReducedMotion();
  // Feed state + view filters live in a provider ABOVE the router outlet, so a
  // running scan (and its 30-min auto-sync) survive navigating between pages.
  const {
    jobs, loading, states, sourceLabels, progress, ready, resumeSkillCount, hasResult,
    lastSyncedAt, secondsUntilNext, sync, ensureStarted,
    location, setLocation, remoteOnly, setRemoteOnly, customizeOpen, setCustomizeOpen,
    search, setSearch,
    recency, setRecency, seniority, setSeniority, minScore, setMinScore,
    sponsorFilter, setSponsorFilter, sortBy, setSortBy, page, setPage,
  } = useCombinedJobsCtx();

  // Kick off the very first scan when the tab opens (idempotent; the provider
  // keeps it running afterwards even if you leave the page).
  useEffect(() => { ensureStarted(); }, [ensureStarted]);

  const maxDays = RECENCY_OPTIONS.find((o) => o.key === recency)?.maxDays ?? 3;

  const recencyCounts = useMemo(() => {
    const counts: Record<string, number> = { today: 0, '24h': 0, '3d': 0, '7d': 0, '30d': 0 };
    for (const j of jobs) {
      if (j.days_ago == null) continue;
      for (const opt of RECENCY_OPTIONS) if (j.days_ago <= opt.maxDays) counts[opt.key] += 1;
    }
    return counts;
  }, [jobs]);

  const visibleJobs = useMemo(() => {
    let out = jobs.filter((j) => j.days_ago != null && j.days_ago <= maxDays);
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((j) => `${j.title} ${j.company}`.toLowerCase().includes(q));
    if (seniority !== 'any') out = out.filter((j) => seniorityOf(j) === seniority);
    if (minScore > 0) out = out.filter((j) => (j.match_score ?? 0) >= minScore);
    if (sponsorFilter === 'friendly') out = out.filter((j) => j.sponsorship !== 'refused');
    else if (sponsorFilter === 'proven') out = out.filter((j) => j.sponsorship === 'likely');
    if (sortBy === 'newest') {
      out = [...out].sort((a, b) => (a.days_ago ?? 99) - (b.days_ago ?? 99) || (b.match_score ?? 0) - (a.match_score ?? 0));
    }
    return out;
  }, [jobs, maxDays, search, seniority, minScore, sponsorFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
  useEffect(() => { setPage((p) => Math.min(Math.max(1, p), pageCount)); }, [pageCount, setPage]);
  useEffect(() => { setPage(1); }, [recency, search, seniority, minScore, sponsorFilter, sortBy, setPage]);

  const pagedJobs = useMemo(
    () => visibleJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visibleJobs, page],
  );

  const cardMotion = (index: number) =>
    reduceMotion ? {} : {
      initial: { opacity: 0, y: 16, scale: 0.96 },
      animate: { opacity: 1, y: 0, scale: 1 },
      transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const, delay: Math.min(index * 0.03, 0.3) },
    };

  const renderJob = (job: WorkdayJob, index: number) => (
    <motion.div key={job.job_id} layout={!reduceMotion} {...cardMotion(index)} className="flex flex-col gap-1.5">
      {job.sponsorship === 'refused' && (
        <p className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-destructive">
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          <span>This posting states it won't sponsor a visa{job.sponsor_note ? `: ${job.sponsor_note}` : '.'}</span>
        </p>
      )}
      <JobCard
        job={toJob(job, 'career portal')}
        saved={isJobSaved(job.job_id)}
        jobStatus={getJobStatus(job.job_id)}
        onSave={() => saveJob(toJob(job, 'career portal'))}
        onUnsave={() => unsaveJob(job.job_id)}
        onQuickApply={() => quickApply(toJob(job, 'career portal'))}
      />
    </motion.div>
  );

  const roleCount = visibleJobs.length;
  const roleCountUp = useCountUp(roleCount);
  // Signal Field intensity = share of strong (70%+) matches → a fuller field
  // when the feed is genuinely good.
  const strongCount = useMemo(() => jobs.filter((j) => (j.match_score ?? 0) >= 70).length, [jobs]);
  const fieldIntensity = Math.min(1, strongCount / 25);
  const sourceKeys = ['workday', 'careers', 'mncs'] as const;

  return (
    <div className="space-y-5">
      {/* ── Live-sync command bar ── */}
      <div className="mesh-accent relative overflow-hidden rounded-2xl border border-border/70 p-4 shadow-soft sm:p-5">
        <SignalField intensity={fieldIntensity} className="pointer-events-none absolute inset-0 h-full w-full opacity-50" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Radar className="h-5 w-5" aria-hidden />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h3 className="text-sm font-semibold text-foreground">Your job feed</h3>
                <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary">
                  <Sparkles className="h-2.5 w-2.5" aria-hidden /> Auto-sync
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground" aria-live="polite">
                {loading
                  ? progress.total > 0
                    ? `Scanning ${progress.done} of ${progress.total} companies across all sources · ${roleCount} roles so far`
                    : 'Starting scan across all sources…'
                  : lastSyncedAt
                    ? <>Updated {formatAgo(lastSyncedAt)} · {roleCount} roles
                        {secondsUntilNext != null && (
                          <span className="ml-1 font-mono tabular-nums text-primary/80">· next sync {formatCountdown(secondsUntilNext)}</span>
                        )}
                      </>
                    : 'Building your feed from every company source…'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => sync(true)} disabled={loading} className="gap-1.5" title="Re-scan every source now">
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
              {loading ? 'Syncing…' : 'Sync now'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCustomizeOpen((o) => !o)} aria-expanded={customizeOpen} className="gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              Customize
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', customizeOpen && 'rotate-180')} aria-hidden />
            </Button>
          </div>
        </div>

        {/* Per-source progress chips */}
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
          {sourceKeys.map((k) => {
            const st = states[k];
            const active = st.loading;
            const done = !st.loading && (st.withResults > 0 || st.tenantsTotal > 0);
            return (
              <Badge
                key={k}
                variant="outline"
                className={cn(
                  'gap-1 text-[10px] font-medium',
                  st.error ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : active ? 'border-primary/30 bg-primary/5 text-primary'
                    : done ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border text-muted-foreground',
                )}
              >
                {active ? <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  : st.error ? <AlertCircle className="h-2.5 w-2.5" aria-hidden />
                  : done ? <Check className="h-2.5 w-2.5" aria-hidden /> : null}
                {sourceLabels[k]}
                {active && st.tenantsTotal > 0 ? ` · ${st.tenantsDone}/${st.tenantsTotal}` : ''}
              </Badge>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {loading && (
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1, height: 'auto' }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="relative mt-3 overflow-hidden"
            >
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 8} className="h-1.5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Customize (location / remote) */}
        <AnimatePresence initial={false}>
          {customizeOpen && (
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1, height: 'auto' }}
              exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden"
            >
              <div className="mt-4 flex flex-wrap items-end gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="min-w-[200px] flex-1">
                  <label htmlFor="combined-location" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden /> Location
                  </label>
                  <Input
                    id="combined-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Anywhere in the US, e.g. Texas, Austin, Remote"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs font-medium text-muted-foreground">
                  <Switch checked={remoteOnly} onCheckedChange={setRemoteOnly} />
                  Remote only
                </label>
                <Button onClick={() => sync(true)} disabled={loading} className="mb-0.5 gap-1.5">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  Apply &amp; sync
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Glass filter bar ── */}
      {hasResult && (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/70 p-2.5 shadow-soft backdrop-blur-xl">
          <div className="relative min-w-[180px] flex-1 basis-full sm:basis-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or company…"
              aria-label="Search jobs by title or company"
              className="h-8 w-full rounded-full border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="inline-flex flex-wrap rounded-full border border-border bg-muted/40 p-0.5">
            {RECENCY_OPTIONS.map((opt) => (
              <Seg key={opt.key} active={recency === opt.key} onClick={() => setRecency(opt.key)}>
                {opt.label}
                <span className="ml-1 tabular-nums opacity-60">{recencyCounts[opt.key]}</span>
              </Seg>
            ))}
          </div>

          <select
            value={seniority}
            onChange={(e) => setSeniority(e.target.value)}
            className="h-8 rounded-full border border-border bg-background px-3 text-[11px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Seniority filter"
          >
            {SENIORITY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>

          <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
            {MIN_SCORE_OPTIONS.map((n) => (
              <Seg key={n} active={minScore === n} onClick={() => setMinScore(n)}>
                {n === 0 ? 'Any match' : `${n}+`}
              </Seg>
            ))}
          </div>

          <div
            className="inline-flex rounded-full border border-border bg-muted/40 p-0.5"
            title='"Sponsor-friendly" hides postings that explicitly decline visa sponsorship; "Proven" keeps only companies with recent H-1B filings.'
          >
            {([['all', 'All'], ['friendly', 'Sponsor-friendly'], ['proven', 'Proven sponsors']] as const).map(([key, label]) => (
              <Seg key={key} active={sponsorFilter === key} onClick={() => setSponsorFilter(key)}>{label}</Seg>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
              {(['score', 'newest'] as const).map((s) => (
                <Seg key={s} active={sortBy === s} onClick={() => setSortBy(s)}>{s === 'score' ? 'Best match' : 'Newest'}</Seg>
              ))}
            </div>
            <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" aria-hidden />
              <span className="font-mono tabular-nums">{roleCountUp}</span> roles
            </Badge>
          </div>
        </div>
      )}

      {resumeSkillCount === 0 && hasResult && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-foreground/85">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
          <span>No parsed resume on this account, so match scores are unavailable. Upload your resume in the Tailor tab, then sync again.</span>
        </div>
      )}

      {/* ── Loading skeleton (nothing merged yet) ── */}
      {loading && jobs.length === 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-1.5 pt-1"><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-14 rounded-full" /></div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results ── */}
      {visibleJobs.length > 0 && (
        <>
          <motion.div layout={!reduceMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {pagedJobs.map((j, i) => renderJob(j, i))}
            </AnimatePresence>
          </motion.div>

          {pageCount > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-1.5 pt-2" aria-label="Job results pages">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              {pageWindow(page, pageCount)[0] > 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
              {pageWindow(page, pageCount).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={n === page ? 'page' : undefined}
                  className={cn(
                    'h-8 min-w-8 rounded-md px-2 font-mono text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    n === page ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'border border-border text-muted-foreground hover:border-primary/40 hover:text-primary',
                  )}
                >
                  {n}
                </button>
              ))}
              {pageWindow(page, pageCount).slice(-1)[0] < pageCount && <span className="px-1 text-xs text-muted-foreground">…</span>}
              <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</Button>
              <span className="ml-2 text-[11px] text-muted-foreground">Page {page} of {pageCount}</span>
            </nav>
          )}
        </>
      )}

      {/* ── Empty state ── */}
      {!loading && hasResult && visibleJobs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          <Radar className="mx-auto mb-3 h-8 w-8 opacity-40" aria-hidden />
          <p>No roles match these filters in this window.</p>
          {maxDays < 30 && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setRecency('30d')}>
              Widen to 30 days
            </Button>
          )}
        </div>
      )}

      {/* ── First-load invitation ── */}
      {!hasResult && !loading && (
        <div className="mesh-accent rounded-2xl border border-dashed border-primary/30 py-14 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Radar className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">Building your combined job feed…</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            One feed across every source — Workday enterprises, Greenhouse/Lever/Ashby career pages, and curated MNC / Big Tech boards — ranked against your resume.
          </p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => sync(false)} disabled={!ready}>
            <Rocket className="h-3.5 w-3.5" aria-hidden /> Load my feed
          </Button>
        </div>
      )}
    </div>
  );
}
