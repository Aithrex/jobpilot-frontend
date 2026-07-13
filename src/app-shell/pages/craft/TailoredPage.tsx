/**
 * TailoredPage — the tailoring history browser in the Craft section
 * (lazy-mounted at /next/craft/tailored).
 *
 * Extracted verbatim (behaviour-preserving) from the ResumeParser monolith's
 * `TailoredResumesTab` for the app shell. Self-fetching + prop-less: it lists
 * every tailoring session (records + versions) with chip-based filtering,
 * quick presets, an advanced drawer, per-version PDF/DOCX download, set-current,
 * version-diff compare, and a legacy "earlier downloads" drawer.
 *
 * Fully on the design system's semantic tokens; monolith inline-SVG icons were
 * swapped for lucide equivalents (ChevronDown / FileDown / Sparkles / Trash2).
 */
import { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { toast } from 'sonner';
import { ChevronDown, FileDown, Sparkles, Trash2, Search } from 'lucide-react';
import { apiService } from '@/lib/api';
import { formatDate } from '@/components/resume/ResumeDashboard';
import type { TailoringRecord, TailoringVersion } from '@/types/resume';

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

// Status tones match ApplicationsTab's kanban columns so a status reads the
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
  const [records, setRecords] = useState<TailoringRecord[]>([]);
  const [legacyFiles, setLegacyFiles] = useState<
    { s3_key: string; filename?: string; job_title?: string; generated_at?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [diffRecord, setDiffRecord] = useState<TailoringRecord | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [atsMin, setAtsMin] = useState<number>(0);
  const [hasRegensOnly, setHasRegensOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Active quick-preset tokens (pure client-side derivations of the other filter state)
  const [quickPreset, setQuickPreset] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [recResp, legResp] = await Promise.all([
      apiService.listTailoringRecords(),
      apiService.listGeneratedResumes(),
    ]);
    if (recResp.data) setRecords((recResp.data.records || []) as TailoringRecord[]);
    if (legResp.data) setLegacyFiles((legResp.data.generated || []) as any);
    if (recResp.error) setError(recResp.error);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Derived filter lists
  const { companies, roles } = useMemo(() => {
    const c = new Set<string>(), r = new Set<string>();
    records.forEach(rec => {
      const co = rec.jd_analysis?.company;
      const ro = rec.jd_analysis?.job_title;
      if (co && co !== 'Not specified') c.add(co);
      if (ro) r.add(ro);
    });
    return { companies: Array.from(c).sort(), roles: Array.from(r).sort() };
  }, [records]);

  // Apply filters + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 86400000 : null;
    let list = records.filter(rec => {
      const title = rec.jd_analysis?.job_title || '';
      const company = rec.jd_analysis?.company || '';
      if (q) {
        const skillsHay = (rec.jd_analysis?.required_skills || []).join(' ');
        const hay = `${title} ${company} ${skillsHay}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (companyFilter !== 'all' && company !== companyFilter) return false;
      if (roleFilter !== 'all' && title !== roleFilter) return false;
      if (statusFilter !== 'all') {
        const s = rec.application?.status || 'draft';
        if (s !== statusFilter) return false;
      }
      const ts = rec.created_at ? new Date(rec.created_at).getTime() : 0;
      if (from && ts < from) return false;
      if (to && ts > to) return false;
      const ats = rec.ats_scores?.overall;
      if (atsMin > 0 && (ats === undefined || ats < atsMin)) return false;
      if (hasRegensOnly && (rec.versions?.length || 0) < 2) return false;
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (sortKey === 'ats') {
        const sa = a.ats_scores?.overall ?? -1;
        const sb = b.ats_scores?.overall ?? -1;
        return sb - sa;
      }
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortKey === 'newest' ? tb - ta : ta - tb;
    });
    return list;
  }, [records, search, companyFilter, roleFilter, statusFilter, dateFrom, dateTo, atsMin, hasRegensOnly, sortKey]);

  // Preset counters drive the quick-chip badges so users can see at a glance
  // how many records match a given lens before applying it.
  const presetCounts = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const monthAgo = now - 30 * 86400000;
    const ts = (r: TailoringRecord) => r.created_at ? new Date(r.created_at).getTime() : 0;
    return {
      week: records.filter(r => ts(r) >= weekAgo).length,
      month: records.filter(r => ts(r) >= monthAgo).length,
      highAts: records.filter(r => (r.ats_scores?.overall ?? 0) >= 80).length,
      needsWork: records.filter(r => (r.ats_scores?.overall ?? 100) < 60 && r.ats_scores?.overall !== undefined).length,
      multiVersion: records.filter(r => (r.versions?.length || 0) >= 2).length,
      offers: records.filter(r => r.application?.status === 'offer').length,
      interviewing: records.filter(r => r.application?.status === 'interviewing').length,
      pending: records.filter(r => {
        const d = r.application?.next_action_date;
        if (!d) return false;
        const diff = new Date(d).getTime() - now;
        return diff <= 3 * 86400000; // ≤ 3 days (incl. overdue)
      }).length,
    };
  }, [records]);

  const applyPreset = useCallback((key: string) => {
    // Clear only the fields the preset controls, preserve search etc.
    setDateFrom(''); setDateTo(''); setAtsMin(0); setHasRegensOnly(false); setStatusFilter('all');
    const now = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    switch (key) {
      case 'week': {
        const from = new Date(now); from.setDate(from.getDate() - 7);
        setDateFrom(iso(from)); setDateTo(iso(now)); break;
      }
      case 'month': {
        const from = new Date(now); from.setDate(from.getDate() - 30);
        setDateFrom(iso(from)); setDateTo(iso(now)); break;
      }
      case 'highAts': setAtsMin(80); setSortKey('ats'); break;
      case 'needsWork': setAtsMin(1); setSortKey('ats'); break;
      case 'multiVersion': setHasRegensOnly(true); break;
      case 'offers': setStatusFilter('offer'); break;
      case 'interviewing': setStatusFilter('interviewing'); break;
      case 'pending': setStatusFilter('interviewing'); break; // closest proxy
    }
    setQuickPreset(key);
  }, []);

  // Active filter chips — described by a label + a clear callback each
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (search.trim()) chips.push({ key: 'search', label: `"${search.trim()}"`, clear: () => setSearch('') });
    if (companyFilter !== 'all') chips.push({ key: 'company', label: companyFilter, clear: () => setCompanyFilter('all') });
    if (roleFilter !== 'all') chips.push({ key: 'role', label: roleFilter, clear: () => setRoleFilter('all') });
    if (statusFilter !== 'all') {
      const nice = STATUS_CHIP[statusFilter]?.label || statusFilter;
      chips.push({ key: 'status', label: nice, clear: () => setStatusFilter('all') });
    }
    if (dateFrom || dateTo) {
      chips.push({ key: 'date', label: `${dateFrom || '…'} → ${dateTo || '…'}`, clear: () => { setDateFrom(''); setDateTo(''); } });
    }
    if (atsMin > 0) chips.push({ key: 'ats', label: `ATS ≥ ${atsMin}`, clear: () => setAtsMin(0) });
    if (hasRegensOnly) chips.push({ key: 'regens', label: 'Multi-version', clear: () => setHasRegensOnly(false) });
    return chips;
  }, [search, companyFilter, roleFilter, statusFilter, dateFrom, dateTo, atsMin, hasRegensOnly]);

  const resetFilters = useCallback(() => {
    setSearch(''); setCompanyFilter('all'); setRoleFilter('all'); setStatusFilter('all');
    setDateFrom(''); setDateTo(''); setAtsMin(0); setHasRegensOnly(false); setSortKey('newest');
    setQuickPreset(null);
  }, []);

  // When a record is expanded for the first time, lazy-fetch the full record
  // so we have jd_text + version bodies available for download/reference.
  const [jdOpenFor, setJdOpenFor] = useState<Set<string>>(new Set());
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
    // Need the full tailored_resume JSON — fetch if we don't have it
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
      toast.success(`Downloaded ${fmt.toUpperCase()}`);
      // Refresh record to pick up the new file cache
      fetchAll();
    }
  }, [fetchAll]);

  const handleSetCurrent = useCallback(async (recordId: string, versionId: string) => {
    const resp = await apiService.setCurrentResumeVersion(recordId, versionId);
    if (resp.error) { toast.error('Failed to set current version'); return; }
    toast.success('Marked as current version');
    setRecords(prev => prev.map(r =>
      r.record_id === recordId ? { ...r, current_version_id: versionId } : r,
    ));
  }, []);

  const handleDeleteRecord = useCallback(async (recordId: string) => {
    if (!window.confirm('Delete this tailoring record and all its versions? This cannot be undone.')) return;
    setDeleting(recordId);
    const resp = await apiService.deleteTailoringRecord(recordId);
    setDeleting(null);
    if (resp.error) { toast.error('Delete failed'); return; }
    toast.success('Record deleted');
    setRecords(prev => prev.filter(r => r.record_id !== recordId));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-14 rounded-container bg-muted/40" />
        <div className="h-20 rounded-container bg-muted/40" />
        <div className="h-20 rounded-container bg-muted/30" />
      </div>
    );
  }

  const selectCls = 'w-full px-2.5 py-1.5 rounded-control bg-muted border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30';
  const inputCls = selectCls;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="overline">Craft · Tailored</p>
          <h2 className="font-display text-h2 text-foreground">Tailored Resumes</h2>
          <p className="text-caption text-muted-foreground">
            {records.length} tailoring session{records.length === 1 ? '' : 's'} · {filtered.length} shown
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          className="text-xs px-2.5 py-1 rounded-control text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Refresh
        </button>
      </header>

      {error && (
        <div className="px-4 py-3 rounded-container bg-destructive/10 border border-destructive/30">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Filter bar — chip-based with smart presets + applied-filter chips */}
      {records.length > 0 && (
        <div className="rounded-container border border-border surface overflow-hidden">
          {/* Row 1 — search + sort */}
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap border-b border-border">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search role, company, required skills…"
                className="w-full pl-9 pr-3 py-2 rounded-control bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/30 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted text-xs"
                >×</button>
              )}
            </div>
            <div className="flex items-center gap-1">
              {([
                ['newest', 'Newest'],
                ['oldest', 'Oldest'],
                ['ats', 'Best ATS'],
              ] as [SortKey, string][]).map(([k, lbl]) => (
                <button
                  key={k}
                  onClick={() => setSortKey(k)}
                  className={`px-2.5 py-1.5 rounded-control text-[11px] font-medium transition-all ${
                    sortKey === k
                      ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >{lbl}</button>
              ))}
            </div>
          </div>

          {/* Row 2 — quick-preset chips with live counts */}
          <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto border-b border-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Quick</span>
            {([
              { k: 'week',          label: 'This week',      count: presetCounts.week,         icon: '📅' },
              { k: 'month',         label: 'Last 30 days',   count: presetCounts.month,        icon: '🗓' },
              { k: 'highAts',       label: 'High match 80+', count: presetCounts.highAts,      icon: '✨' },
              { k: 'needsWork',     label: 'Needs work',     count: presetCounts.needsWork,    icon: '🛠' },
              { k: 'multiVersion',  label: 'Multi-version',  count: presetCounts.multiVersion, icon: '↻' },
              { k: 'interviewing',  label: 'Interviewing',   count: presetCounts.interviewing, icon: '💬' },
              { k: 'offers',        label: 'Offers',         count: presetCounts.offers,       icon: '🔥' },
              { k: 'pending',       label: 'Due soon',       count: presetCounts.pending,      icon: '⚡' },
            ] as const).map(p => {
              const active = quickPreset === p.k;
              const dim = p.count === 0;
              return (
                <button
                  key={p.k}
                  onClick={() => active ? (resetFilters()) : applyPreset(p.k)}
                  disabled={dim && !active}
                  className={`group relative shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                    active
                      ? 'brand-gradient text-primary-foreground border-transparent shadow-soft'
                      : dim
                      ? 'bg-muted/50 text-muted-foreground border-border cursor-not-allowed'
                      : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/5'
                  }`}
                >
                  <span className="text-[11px]">{p.icon}</span>
                  <span>{p.label}</span>
                  <span className={`px-1.5 py-0 rounded-full text-[9px] font-bold ${
                    active ? 'bg-primary-foreground/25 text-primary-foreground' : dim ? 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
                  }`}>{p.count}</span>
                </button>
              );
            })}
          </div>

          {/* Row 3 — applied-filter chips + advanced toggle + result summary */}
          <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap">
            {activeChips.length > 0 ? (
              <>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0">Active</span>
                {activeChips.map(c => (
                  <span
                    key={c.key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/25"
                  >
                    {c.label}
                    <button
                      onClick={c.clear}
                      className="ml-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-primary/20 text-primary"
                      aria-label={`Remove ${c.key}`}
                    >×</button>
                  </span>
                ))}
                <button onClick={resetFilters} className="text-[11px] text-muted-foreground hover:text-destructive ml-1">
                  Clear all
                </button>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground italic">No filters applied</span>
            )}
            <div className="flex-1" />
            <span className="text-[11px] text-muted-foreground">
              <b className="text-foreground">{filtered.length}</b> of {records.length}
            </span>
            <button
              onClick={() => setAdvancedOpen(o => !o)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-control transition-all ${
                advancedOpen
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {advancedOpen ? 'Hide advanced ▴' : 'Advanced filters ▾'}
            </button>
          </div>

          {/* Advanced drawer (collapsible) */}
          {advancedOpen && (
            <div className="px-4 pb-4 pt-1 border-t border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/30">
              <FilterInput label="Company">
                <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className={selectCls}>
                  <option value="all">All companies</option>
                  {companies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FilterInput>
              <FilterInput label="Role">
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className={selectCls}>
                  <option value="all">All roles</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
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
                <label className="inline-flex items-center gap-1.5 text-[11px] text-foreground cursor-pointer select-none px-2.5 py-1.5 rounded-control bg-muted border border-border">
                  <input type="checkbox" checked={hasRegensOnly} onChange={e => setHasRegensOnly(e.target.checked)} className="accent-primary" />
                  Multi-version only
                </label>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Records */}
      {records.length === 0 ? (
        <div className="rounded-container border border-dashed border-border bg-muted/30 p-10 text-center">
          <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground">No tailored resumes yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Go to the Tailor tab and paste a job description to create one
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-container border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-sm text-foreground">No matches for the current filters.</p>
          <button onClick={resetFilters} className="mt-2 text-xs text-primary hover:text-primary/80">Clear filters</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(rec => {
            const title = rec.jd_analysis?.job_title || 'Untitled Role';
            const company = rec.jd_analysis?.company;
            const ats = rec.ats_scores?.overall;
            const isOpen = expanded.has(rec.record_id);
            const versions = (rec.versions || []).slice().sort((a, b) => b.version_number - a.version_number);
            const currentId = rec.current_version_id || versions[0]?.version_id;
            return (
              <div key={rec.record_id} className="rounded-container border border-border bg-card shadow-soft overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                  <button type="button" onClick={() => toggleExpanded(rec.record_id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {title}{company && company !== 'Not specified' ? ` · ${company}` : ''}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{formatDate(rec.created_at || '')}</span>
                        <span>·</span>
                        <span>{versions.length} version{versions.length === 1 ? '' : 's'}</span>
                        {ats !== undefined && (
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
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${chip.cls}`}>
                              {chip.label}
                            </span>
                          );
                        })()}
                        {rec.interview_prep?.generated_at && (
                          <span className="px-1.5 py-0.5 rounded border text-[10px] bg-success/10 text-success border-success/20">
                            Prep ready
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    type="button"
                    title="Delete record"
                    disabled={deleting === rec.record_id}
                    onClick={() => handleDeleteRecord(rec.record_id)}
                    className="p-1.5 rounded-control text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-border px-4 py-3 space-y-3">
                    {/* Job description panel — always show key analysis facts; JD text lazy-fetched + collapsible */}
                    <div className="rounded-control border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Job description
                        </span>
                        <div className="flex items-center gap-1">
                          {rec.jd_text ? (
                            <button
                              onClick={() => copyJd(rec.jd_text || '')}
                              className="text-[10px] px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                            >Copy</button>
                          ) : null}
                          {rec.jd_text ? (
                            <button
                              onClick={() => toggleJd(rec.record_id)}
                              className="text-[10px] px-2 py-0.5 rounded text-primary hover:text-primary/80 hover:bg-primary/10"
                            >{jdOpenFor.has(rec.record_id) ? 'Hide JD' : 'View JD'}</button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">loading…</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                        <div><span className="text-muted-foreground">Role: </span><span className="text-foreground">{rec.jd_analysis?.job_title || '—'}</span></div>
                        <div><span className="text-muted-foreground">Company: </span><span className="text-foreground">{rec.jd_analysis?.company && rec.jd_analysis.company !== 'Not specified' ? rec.jd_analysis.company : '—'}</span></div>
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
                        <div className="mt-2 max-h-64 overflow-y-auto rounded-control bg-background border border-border p-2.5">
                          <pre className="text-[11px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">{rec.jd_text}</pre>
                        </div>
                      )}
                    </div>

                    {versions.length >= 2 && (
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => setDiffRecord(rec)}
                          className="text-[11px] px-2.5 py-1 rounded-control text-primary hover:text-primary/80 hover:bg-primary/10 border border-primary/25"
                        >
                          Compare versions
                        </button>
                      </div>
                    )}
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No versions yet — open the record in the Tailor tab.</p>
                    ) : null}
                    {versions.map(v => {
                      const isCurrent = v.version_id === currentId;
                      const cacheP = v.files?.pdf;
                      const cacheD = v.files?.docx;
                      const dlPdfKey = `${rec.record_id}-${v.version_id}-pdf`;
                      const dlDocxKey = `${rec.record_id}-${v.version_id}-docx`;
                      const badge = sourceBadge[v.source];
                      const vAts = v.ats_scores?.overall;
                      return (
                        <div key={v.version_id} className="rounded-control border border-border bg-muted/30 px-3 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-foreground">v{v.version_number}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
                            {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/25">Current</span>}
                            {vAts !== undefined && (
                              <span className={`text-[11px] font-medium ${atsColor(vAts)}`}>ATS {vAts}</span>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(v.created_at)}</span>
                          </div>
                          {v.user_feedback && (
                            <p className="mt-1.5 text-[11px] italic text-muted-foreground line-clamp-2">“{v.user_feedback}”</p>
                          )}
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleDownloadVersion(rec, v, 'pdf')}
                              disabled={downloading !== null}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control text-[11px] font-medium text-primary-foreground brand-gradient hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                              <FileDown className="w-3 h-3" />
                              {downloading === dlPdfKey ? '…' : cacheP ? 'PDF' : 'PDF (render)'}
                            </button>
                            <button
                              onClick={() => handleDownloadVersion(rec, v, 'docx')}
                              disabled={downloading !== null}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control text-[11px] font-medium text-foreground bg-muted border border-border hover:bg-muted/70 disabled:opacity-50 transition-all"
                            >
                              <FileDown className="w-3 h-3" />
                              {downloading === dlDocxKey ? '…' : cacheD ? 'DOCX' : 'DOCX (render)'}
                            </button>
                            {!isCurrent && (
                              <button
                                onClick={() => handleSetCurrent(rec.record_id, v.version_id)}
                                className="px-2.5 py-1 rounded-control text-[11px] font-medium text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
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

      {/* Version diff modal */}
      {diffRecord && (
        <Suspense fallback={null}>
          <VersionDiffViewer record={diffRecord} onClose={() => setDiffRecord(null)} />
        </Suspense>
      )}

      {/* Earlier downloads — preserves access to pre-versioning generated files */}
      {legacyFiles.length > 0 && (
        <div className="rounded-container border border-border bg-card/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setLegacyOpen(o => !o)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/50"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Earlier downloads ({legacyFiles.length})
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${legacyOpen ? 'rotate-180' : ''}`} />
          </button>
          {legacyOpen && (
            <div className="border-t border-border p-2 space-y-1.5">
              {legacyFiles.map(f => {
                const dlKey = `legacy-${f.s3_key}`;
                return (
                  <div key={f.s3_key} className="flex items-center gap-3 px-2 py-1.5 rounded-control hover:bg-muted/60">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground truncate">
                        {f.job_title || f.filename || 'Tailored resume'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(f.generated_at || '')}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        setDownloading(dlKey);
                        try {
                          const blob = await apiService.downloadResumeFile(f.s3_key);
                          const u = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = u; a.download = f.filename || 'resume.pdf';
                          a.click(); URL.revokeObjectURL(u);
                        } catch { toast.error('Download failed'); }
                        setDownloading(null);
                      }}
                      disabled={downloading === dlKey}
                      className="text-[11px] px-2 py-1 rounded-control text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50"
                    >
                      {downloading === dlKey ? '…' : 'Download'}
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Delete this earlier download?')) return;
                        const resp = await apiService.deleteResume(f.s3_key);
                        if (resp.error) { toast.error('Delete failed'); return; }
                        setLegacyFiles(prev => prev.filter(x => x.s3_key !== f.s3_key));
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
