/**
 * TailoredPage - the tailoring history browser in the Craft section
 * (lazy-mounted at /app/resume/tailored).
 *
 * Originally extracted from the ResumeParser monolith's
 * `TailoredResumesTab` for the app shell. Self-fetching + prop-less: it lists
 * one page of tailoring sessions at a time with server-side filtering,
 * quick presets, an advanced drawer, per-version PDF/DOCX download, set-current,
 * version-diff compare, and a legacy "earlier downloads" drawer.
 *
 * Fully on the design system's semantic tokens; monolith inline-SVG icons were
 * swapped for lucide equivalents (ChevronDown / FileDown / Sparkles / Trash2).
 */
import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { toast } from 'sonner';
import {
  CalendarDays,
  CalendarRange,
  ChevronDown,
  FileDown,
  Flame,
  MessagesSquare,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { atsOverall } from '@/lib/atsScores';
import { isTrimmedOutcome, resumeTrimDescription } from '@/lib/resumeLayoutSpec';
import { formatDate } from '@/components/resume/ResumeDashboard';
import type { TailoringRecord, TailoringVersion } from '@/types/resume';
import type { HistoryPreset, TailoringHistoryQuery } from '@/types/tailoringHistory';
import { useTailoringHistory } from './useTailoringHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelError } from '@/app-shell/pages/today/primitives';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const VersionDiffViewer = lazy(() => import('@/components/resume/VersionDiffViewer'));

type SortKey = 'newest' | 'oldest' | 'ats';

const sourceBadge: Record<TailoringVersion['source'], { label: string; cls: string }> = {
  initial: { label: 'Initial', cls: 'bg-primary/10 text-primary border-primary/25' },
  regenerated: { label: 'Regenerated', cls: 'bg-[hsl(var(--brand-to)/0.12)] text-[hsl(var(--brand-to))] border-[hsl(var(--brand-to)/0.25)]' },
  edited: { label: 'Edited', cls: 'bg-warning/10 text-warning border-warning/25' },
};

function atsColor(score?: number): string {
  if (score === undefined || score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

function FilterInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// Status tones match the tracker's STATUSES table so a status reads the
// same everywhere: draft/withdrawn=muted, applied=primary,
// interviewing=brand-to, offer=success, rejected=destructive, ghosted=warning.
const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  draft:        { label: 'Draft',        cls: 'bg-muted text-muted-foreground border-border' },
  applied:      { label: 'Applied',      cls: 'bg-primary/10 text-primary border-primary/25' },
  interviewing: { label: 'Interviewing', cls: 'bg-[hsl(var(--brand-to)/0.12)] text-[hsl(var(--brand-to))] border-[hsl(var(--brand-to)/0.25)]' },
  offer:        { label: 'Offer',        cls: 'bg-success/10 text-success border-success/25' },
  rejected:     { label: 'Rejected',     cls: 'bg-destructive/10 text-destructive border-destructive/25' },
  ghosted:      { label: 'Ghosted',      cls: 'bg-warning/10 text-warning border-warning/25' },
  withdrawn:    { label: 'Withdrawn',    cls: 'bg-muted text-muted-foreground border-border' },
};

export default function TailoredPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [diffRecord, setDiffRecord] = useState<TailoringRecord | null>(null);
  // Destructive deletes are confirmed through an AlertDialog (never
  // window.confirm).
  const [pendingDelete, setPendingDelete] = useState<
    { id: string; label: string } | null
  >(null);

  // Filters
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [atsMin, setAtsMin] = useState<number>(0);
  const [hasRegensOnly, setHasRegensOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Presets and their counts are evaluated across the full history on the server.
  const [quickPreset, setQuickPreset] = useState<HistoryPreset | null>(null);

  const [debouncedText, setDebouncedText] = useState({ search: '', company: '', role: '' });
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedText({
      search: search.trim(), company: companyFilter.trim(), role: roleFilter.trim(),
    }), 300);
    return () => window.clearTimeout(timer);
  }, [search, companyFilter, roleFilter]);

  const query = useMemo<TailoringHistoryQuery>(() => ({
    q: debouncedText.search || undefined,
    company: debouncedText.company || undefined,
    role: debouncedText.role || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    date_from: dateFrom || undefined, date_to: dateTo || undefined,
    ats_min: atsMin > 0 ? atsMin : undefined,
    multi_version: hasRegensOnly || undefined,
    preset: quickPreset || undefined,
    sort: sortKey,
  }), [debouncedText, statusFilter, dateFrom, dateTo, atsMin, hasRegensOnly, quickPreset, sortKey]);
  const {
    records, setRecords, total, summary, nextCursor, loading, loadingMore,
    error, moreError, loadMore, reload: fetchAll,
  } = useTailoringHistory(query);
  const presetCounts = summary?.presets || {
    week: 0, month: 0, highAts: 0, needsWork: 0, multiVersion: 0, offers: 0, interviewing: 0, pending: 0,
  };

  const applyPreset = useCallback((key: HistoryPreset) => {
    setDateFrom(''); setDateTo(''); setAtsMin(0); setHasRegensOnly(false); setStatusFilter('all');
    if (key === 'highAts' || key === 'needsWork') setSortKey('ats');
    setQuickPreset(key);
  }, []);

  // Active filter chips - described by a label + a clear callback each
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (search.trim()) chips.push({ key: 'search', label: `"${search.trim()}"`, clear: () => setSearch('') });
    if (companyFilter) chips.push({ key: 'company', label: companyFilter, clear: () => setCompanyFilter('') });
    if (roleFilter) chips.push({ key: 'role', label: roleFilter, clear: () => setRoleFilter('') });
    if (statusFilter !== 'all') {
      const nice = STATUS_CHIP[statusFilter]?.label || statusFilter;
      chips.push({ key: 'status', label: nice, clear: () => setStatusFilter('all') });
    }
    if (dateFrom || dateTo) {
      chips.push({ key: 'date', label: `${dateFrom || '...'} → ${dateTo || '...'}`, clear: () => { setDateFrom(''); setDateTo(''); } });
    }
    if (atsMin > 0) chips.push({ key: 'ats', label: `ATS ≥ ${atsMin}`, clear: () => setAtsMin(0) });
    if (hasRegensOnly) chips.push({ key: 'regens', label: 'Multi-version', clear: () => setHasRegensOnly(false) });
    if (quickPreset) {
      const names: Record<HistoryPreset, string> = {
        week: 'This week', month: 'Last 30 days', highAts: 'High match 80+', needsWork: 'Needs work',
        multiVersion: 'Multi-version', offers: 'Offers', interviewing: 'Interviewing', pending: 'Due soon',
      };
      chips.push({ key: 'preset', label: names[quickPreset], clear: () => setQuickPreset(null) });
    }
    return chips;
  }, [search, companyFilter, roleFilter, statusFilter, dateFrom, dateTo, atsMin, hasRegensOnly, quickPreset]);

  const resetFilters = useCallback(() => {
    setSearch(''); setCompanyFilter(''); setRoleFilter(''); setStatusFilter('all');
    setDateFrom(''); setDateTo(''); setAtsMin(0); setHasRegensOnly(false); setSortKey('newest');
    setQuickPreset(null);
  }, []);

  // When a record is expanded for the first time, lazy-fetch the full record
  // so we have jd_text + version bodies available for download/reference.
  const [jdOpenFor, setJdOpenFor] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (loading) {
      setExpanded(new Set());
      setJdOpenFor(new Set());
    }
  }, [loading]);
  const toggleExpanded = useCallback(async (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    const rec = records.find(r => r.record_id === id);
    if (rec && rec.jd_text === undefined) {
      const full = await apiService.getTailoringRecord(id);
      if (full.data?.record) {
        setRecords(prev => prev.map(r => r.record_id === id ? { ...r, ...full.data!.record } : r));
      }
    }
  }, [records]);
  const toggleJd = useCallback((id: string) => {
    setJdOpenFor(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const copyJd = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('JD copied'); }
    catch { toast.error('Copy failed'); }
  }, []);

  const handleDownloadVersion = useCallback(async (
    rec: TailoringRecord,
    version: TailoringVersion,
    fmt: 'pdf' | 'docx',
  ) => {
    const key = `${rec.record_id}-${version.version_id}-${fmt}`;
    setDownloading(key);
    // Need the full tailored_resume JSON - fetch if we don't have it
    let tailored = (version as any).tailored_resume;
    if (!tailored) {
      const fullResp = await apiService.getTailoringRecord(rec.record_id);
      if (fullResp.error || !fullResp.data?.record) {
        setDownloading(null);
        toast.error('Failed to load version content');
        return;
      }
      const full = fullResp.data.record as TailoringRecord;
      const v = full.versions?.find(vv => vv.version_id === version.version_id);
      tailored = (v as any)?.tailored_resume;
      if (!tailored) {
        setDownloading(null);
        toast.error('Version content missing');
        return;
      }
    }
    const r = await apiService.downloadTailoredResume(
      tailored,
      (rec.jd_analysis || {}) as any,
      fmt,
      {
        recordId: rec.record_id,
        versionId: version.version_id,
        source: version.source,
        autoSaveOnEdit: false,
      },
    );
    setDownloading(null);
    if (r.error) { toast.error('Download failed', { description: r.error }); return; }
    if (r.data) {
      const u = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = u; a.download = r.filename || `resume.${fmt}`;
      a.click(); URL.revokeObjectURL(u);
      if (isTrimmedOutcome(r.outcome)) {
        toast.warning('Some content was trimmed to fit the page', {
          description: resumeTrimDescription(r.dropped?.length || 0),
        });
      } else {
        toast.success(`Downloaded ${fmt.toUpperCase()}`);
      }
      // Refresh only this record; preserve the loaded pages and filters.
      const refreshed = await apiService.getTailoringRecord(rec.record_id);
      if (refreshed.data?.record) {
        setRecords(previous => previous.map(row => row.record_id === rec.record_id ? refreshed.data!.record : row));
      }
    }
  }, [setRecords]);

  const handleSetCurrent = useCallback(async (recordId: string, versionId: string) => {
    const resp = await apiService.setCurrentResumeVersion(recordId, versionId);
    if (resp.error) { toast.error('Failed to set current version'); return; }
    toast.success('Marked as current version');
    setRecords(prev => prev.map(r =>
      r.record_id === recordId ? { ...r, current_version_id: versionId } : r,
    ));
  }, []);

  const handleDeleteRecord = useCallback(async (recordId: string) => {
    setDeleting(recordId);
    const resp = await apiService.deleteTailoringRecord(recordId);
    setDeleting(null);
    if (resp.error) {
      // 502 deletion_pending: some generated files could not be removed yet;
      // the backend queued the record for automatic cleanup. Keep the row  - 
      // never remove it optimistically.
      const payload = resp.errorPayload as
        | { error?: string; deletion_pending?: boolean }
        | undefined;
      if (
        resp.status === 502 &&
        (payload?.error === 'deletion_pending' || payload?.deletion_pending)
      ) {
        toast.info('Cleanup in progress', {
          description:
            'Some files could not be removed yet. This record is queued for cleanup and will be deleted automatically.',
        });
        return;
      }
      toast.error('Delete failed');
      return;
    }
    toast.success('Record deleted');
    fetchAll();
  }, [fetchAll]);

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
  const selectCls = `w-full min-h-11 px-2.5 py-1.5 rounded-control bg-muted border border-border text-xs text-foreground ${focusRing}`;
  const inputCls = selectCls;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="overline">Craft · Tailored</p>
          <h2 className="font-display text-h2 text-foreground">Tailored Resumes</h2>
          <p className="text-caption text-muted-foreground">
            {total} matching session{total === 1 ? '' : 's'} · {records.length} loaded
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          className={`inline-flex min-h-11 items-center gap-1.5 text-xs px-3 rounded-control text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${focusRing}`}
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh
        </button>
      </header>

      {/* Filter bar - chip-based with smart presets + applied-filter chips */}
      {(
        <div className="rounded-container border border-border surface overflow-hidden">
          {/* Row 1 - search + sort */}
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap border-b border-border">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <input
                value={search}
                maxLength={200}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search role, company, required skills..."
                aria-label="Search tailored resumes"
                className={`w-full h-11 pl-9 pr-11 rounded-control bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground transition-all ${focusRing}`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className={`absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-control text-muted-foreground hover:text-foreground ${focusRing}`}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1" role="group" aria-label="Sort order">
              {([
                ['newest', 'Newest'],
                ['oldest', 'Oldest'],
                ['ats', 'Best ATS'],
              ] as [SortKey, string][]).map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  aria-pressed={sortKey === k}
                  className={`min-h-11 px-3 rounded-control text-xs font-medium transition-all ${focusRing} ${
                    sortKey === k
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >{lbl}</button>
              ))}
            </div>
          </div>

          {/* Row 2 - quick-preset chips with live counts */}
          <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto border-b border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Quick</span>
            {([
              { k: 'week',          label: 'This week',      count: presetCounts.week,         icon: CalendarDays },
              { k: 'month',         label: 'Last 30 days',   count: presetCounts.month,        icon: CalendarRange },
              { k: 'highAts',       label: 'High match 80+', count: presetCounts.highAts,      icon: Sparkles },
              { k: 'needsWork',     label: 'Needs work',     count: presetCounts.needsWork,    icon: Wrench },
              { k: 'multiVersion',  label: 'Multi-version',  count: presetCounts.multiVersion, icon: RefreshCw },
              { k: 'interviewing',  label: 'Interviewing',   count: presetCounts.interviewing, icon: MessagesSquare },
              { k: 'offers',        label: 'Offers',         count: presetCounts.offers,       icon: Flame },
              { k: 'pending',       label: 'Due soon',       count: presetCounts.pending,      icon: Zap },
            ] as { k: HistoryPreset; label: string; count: number; icon: LucideIcon }[]).map(p => {
              const active = quickPreset === p.k;
              const dim = p.count === 0;
              const Icon = p.icon;
              return (
                <button
                  key={p.k}
                  onClick={() => active ? (resetFilters()) : applyPreset(p.k)}
                  disabled={dim && !active}
                  aria-pressed={active}
                  className={`group relative shrink-0 inline-flex min-h-11 items-center gap-1.5 px-3 rounded-full text-xs tracking-wide font-medium border transition-all ${focusRing} ${
                    active
                      ? 'brand-gradient text-primary-foreground border-transparent shadow-soft'
                      : dim
                      ? 'bg-muted/50 text-muted-foreground border-border cursor-not-allowed'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{p.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                    active ? 'bg-primary-foreground/25 text-primary-foreground' : dim ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                  }`}>{p.count}</span>
                </button>
              );
            })}
          </div>

          {/* Row 3 - applied-filter chips + advanced toggle + result summary */}
          <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
            {activeChips.length > 0 ? (
              <>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Active</span>
                {activeChips.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={c.clear}
                    aria-label={`Remove filter: ${c.label}`}
                    className={`inline-flex min-h-11 items-center gap-1.5 px-3 rounded-full text-xs tracking-wide bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-colors ${focusRing}`}
                  >
                    {c.label}
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                ))}
                <button onClick={resetFilters} className={`min-h-11 px-2 rounded-control text-xs text-muted-foreground hover:text-destructive ml-1 ${focusRing}`}>
                  Clear all
                </button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">No filters applied</span>
            )}
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">
              <b className="text-foreground">{records.length}</b> of {total}
            </span>
            <button
              onClick={() => setAdvancedOpen(o => !o)}
              aria-expanded={advancedOpen}
              aria-controls="advanced-filters"
              className={`inline-flex min-h-11 items-center gap-1 text-xs font-medium px-3 rounded-control transition-all ${focusRing} ${
                advancedOpen
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {advancedOpen ? 'Hide advanced' : 'Advanced filters'}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>

          {/* Advanced drawer (collapsible) */}
          {advancedOpen && (
            <div id="advanced-filters" className="px-4 pb-4 pt-1 border-t border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/30">
              <FilterInput label="Company">
                <input value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
                  placeholder="Any company" maxLength={200} className={inputCls} />
              </FilterInput>
              <FilterInput label="Role">
                <input value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                  placeholder="Any role" maxLength={200} className={inputCls} />
              </FilterInput>
              <FilterInput label="Status">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
                  <option value="all">Any status</option>
                  {Object.entries(STATUS_CHIP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </FilterInput>
              <FilterInput label={atsMin > 0 ? `ATS ≥ ${atsMin}` : 'ATS minimum'}>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0} max={100} step={5}
                    value={atsMin}
                    onChange={e => setAtsMin(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">{atsMin}</span>
                </div>
              </FilterInput>
              <FilterInput label="From">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
              </FilterInput>
              <FilterInput label="To">
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
              </FilterInput>
              <label className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Options</span>
                <label className="inline-flex min-h-11 items-center gap-1.5 text-xs text-foreground cursor-pointer select-none px-2.5 py-1.5 rounded-control bg-muted border border-border">
                  <input type="checkbox" checked={hasRegensOnly} onChange={e => setHasRegensOnly(e.target.checked)} className="accent-primary" />
                  Multi-version only
                </label>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div role="status" aria-label="Loading tailored resumes" className="space-y-3">
          <Skeleton className="h-20 rounded-container" />
          <Skeleton className="h-20 rounded-container" />
        </div>
      ) : error ? (
        <PanelError title="Couldn't load your tailored resumes" body={error} onRetry={fetchAll} />
      ) : records.length === 0 && summary?.total === 0 ? (
        <div className="rounded-container border border-dashed border-border bg-muted/30 p-10 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">No tailored resumes yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Go to the Tailor tab and paste a job description to create one
          </p>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-container border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-foreground">No matches for the current filters.</p>
          <button onClick={resetFilters} className="mt-2 text-xs text-primary hover:text-primary/80">Clear filters</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map(rec => {
            const title = rec.jd_analysis?.job_title || 'Untitled Role';
            const company = rec.jd_analysis?.company;
            const ats = atsOverall(rec.ats_scores);
            const isOpen = expanded.has(rec.record_id);
            const versions = (rec.versions || []).slice().sort((a, b) => b.version_number - a.version_number);
            const currentId = rec.current_version_id || versions[0]?.version_id;
            return (
              <div key={rec.record_id} className="rounded-container border border-border bg-card shadow-soft overflow-hidden">
                <div className="px-4 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(rec.record_id)}
                    aria-expanded={isOpen}
                    className={`flex min-h-11 items-center gap-3 min-w-0 flex-1 text-left rounded-control ${focusRing}`}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {title}{company && company !== 'Not specified' ? ` · ${company}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{formatDate(rec.created_at || '')}</span>
                        <span>·</span>
                        <span>{versions.length} version{versions.length === 1 ? '' : 's'}</span>
                        {(rec.base_selection?.filename || rec.base_resume_filename) && (
                          <>
                            <span>·</span>
                            <span title="Base resume used for this tailoring">
                              from {rec.base_selection?.filename || rec.base_resume_filename}
                            </span>
                          </>
                        )}
                        {typeof ats === 'number' && (
                          <>
                            <span>·</span>
                            <span className={`font-semibold ${atsColor(ats)}`}>ATS {ats}/100</span>
                          </>
                        )}
                        {(() => {
                          const s = rec.application?.status || 'draft';
                          const chip = STATUS_CHIP[s];
                          if (!chip) return null;
                          return (
                            <span className={`px-1.5 py-0.5 rounded border text-xs tracking-wide font-semibold ${chip.cls}`}>
                              {chip.label}
                            </span>
                          );
                        })()}
                        {rec.interview_prep?.generated_at && (
                          <span className="px-1.5 py-0.5 rounded border text-xs tracking-wide bg-success/10 text-success border-success/20">
                            Prep ready
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    title="Delete record"
                    aria-label={`Delete tailoring record: ${title}`}
                    disabled={deleting === rec.record_id}
                    onClick={() => setPendingDelete({ id: rec.record_id, label: title })}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 ${focusRing}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    {/* Job description panel - always show key analysis facts; JD text lazy-fetched + collapsible */}
                    <div className="rounded-control border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Job description
                        </span>
                        <div className="flex items-center gap-1">
                          {rec.jd_text ? (
                            <button
                              onClick={() => copyJd(rec.jd_text || '')}
                              className={`min-h-11 text-xs px-2.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted ${focusRing}`}
                            >Copy</button>
                          ) : null}
                          {rec.jd_text ? (
                            <button
                              onClick={() => toggleJd(rec.record_id)}
                              aria-expanded={jdOpenFor.has(rec.record_id)}
                              aria-controls={`jd-text-${rec.record_id}`}
                              className={`min-h-11 text-xs px-2.5 rounded text-primary hover:text-primary/80 hover:bg-primary/10 ${focusRing}`}
                            >{jdOpenFor.has(rec.record_id) ? 'Hide JD' : 'View JD'}</button>
                          ) : (
                            <span role="status" aria-live="polite" className="text-xs text-muted-foreground italic">
                              Loading job description...
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                        <div><span className="text-muted-foreground">Role: </span><span className="text-foreground">{rec.jd_analysis?.job_title || ' - '}</span></div>
                        <div><span className="text-muted-foreground">Company: </span><span className="text-foreground">{rec.jd_analysis?.company && rec.jd_analysis.company !== 'Not specified' ? rec.jd_analysis.company : ' - '}</span></div>
                        {rec.jd_analysis?.location && (
                          <div><span className="text-muted-foreground">Location: </span><span className="text-foreground">{rec.jd_analysis.location}</span></div>
                        )}
                        {rec.jd_analysis?.seniority && (
                          <div><span className="text-muted-foreground">Seniority: </span><span className="text-foreground">{rec.jd_analysis.seniority}</span></div>
                        )}
                      </div>
                      {rec.jd_analysis?.required_skills && rec.jd_analysis.required_skills.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[10px] text-muted-foreground">Required skills: </span>
                          <div className="inline-flex flex-wrap gap-1 mt-0.5">
                            {rec.jd_analysis.required_skills.slice(0, 20).map((s, si) => (
                              <span key={si} className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/15">{s}</span>
                            ))}
                            {rec.jd_analysis.required_skills.length > 20 && (
                              <span className="text-[10px] text-muted-foreground self-center">+{rec.jd_analysis.required_skills.length - 20}</span>
                            )}
                          </div>
                        </div>
                      )}
                      {jdOpenFor.has(rec.record_id) && rec.jd_text && (
                        <div id={`jd-text-${rec.record_id}`} className="mt-2 max-h-64 overflow-y-auto rounded-control bg-background border border-border p-2.5">
                          <pre className="text-[11px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">{rec.jd_text}</pre>
                        </div>
                      )}
                    </div>

                    {versions.length >= 2 && (
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setDiffRecord(rec)}
                          className={`min-h-11 text-xs px-3 rounded-control text-primary hover:text-primary/80 hover:bg-primary/10 border border-primary/25 ${focusRing}`}
                        >
                          Compare versions
                        </button>
                      </div>
                    )}
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No versions yet. Open the record in the Tailor tab.</p>
                    ) : null}
                    {versions.map(v => {
                      const isCurrent = v.version_id === currentId;
                      const cacheP = v.files?.pdf;
                      const cacheD = v.files?.docx;
                      const dlPdfKey = `${rec.record_id}-${v.version_id}-pdf`;
                      const dlDocxKey = `${rec.record_id}-${v.version_id}-docx`;
                      const badge = sourceBadge[v.source];
                      const vAts = atsOverall(v.ats_scores);
                      return (
                        <div key={v.version_id} className="rounded-control border border-border bg-muted/30 px-3 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">v{v.version_number}</span>
                            <span className={`text-xs tracking-wide px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                            {isCurrent && <span className="text-xs tracking-wide px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/25">Current</span>}
                            {typeof vAts === 'number' && (
                              <span className={`text-xs font-medium ${atsColor(vAts)}`}>ATS {vAts}</span>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">{formatDate(v.created_at)}</span>
                          </div>
                          {v.user_feedback && (
                            <p className="mt-1.5 text-xs italic text-muted-foreground line-clamp-2">"{v.user_feedback}"</p>
                          )}
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleDownloadVersion(rec, v, 'pdf')}
                              disabled={downloading !== null}
                              className={`inline-flex min-h-11 items-center gap-1.5 px-3 rounded-control text-xs font-medium text-primary-foreground brand-gradient hover:opacity-90 disabled:opacity-50 transition-all ${focusRing}`}
                            >
                              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                              {downloading === dlPdfKey ? 'Preparing...' : cacheP ? 'PDF' : 'PDF (render)'}
                            </button>
                            <button
                              onClick={() => handleDownloadVersion(rec, v, 'docx')}
                              disabled={downloading !== null}
                              className={`inline-flex min-h-11 items-center gap-1.5 px-3 rounded-control text-xs font-medium text-foreground bg-muted border border-border hover:bg-muted/70 disabled:opacity-50 transition-all ${focusRing}`}
                            >
                              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                              {downloading === dlDocxKey ? 'Preparing...' : cacheD ? 'DOCX' : 'DOCX (render)'}
                            </button>
                            {!isCurrent && (
                              <button
                                onClick={() => handleSetCurrent(rec.record_id, v.version_id)}
                                className={`min-h-11 px-3 rounded-control text-xs font-medium text-muted-foreground hover:text-success hover:bg-success/10 transition-colors ${focusRing}`}
                              >
                                Set as current
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && nextCursor && (
        <div className="flex flex-col items-center gap-2">
          {moreError && <p role="alert" className="text-sm text-destructive">{moreError}</p>}
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore}
            className={`min-h-11 px-5 rounded-control border border-border bg-card text-sm disabled:opacity-50 ${focusRing}`}>
            {loadingMore ? 'Loading more...' : moreError ? 'Try loading more again' : 'Load more resumes'}
          </button>
        </div>
      )}

      {/* Version diff modal */}
      {diffRecord && (
        <Suspense fallback={null}>
          <VersionDiffViewer record={diffRecord} onClose={() => setDiffRecord(null)} />
        </Suspense>
      )}

      {/* Destructive-delete confirmation */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tailoring record?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${pendingDelete?.label ?? ''}" and all its versions will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDelete) return;
                handleDeleteRecord(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
