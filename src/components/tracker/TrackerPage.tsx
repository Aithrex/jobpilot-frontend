/**
 * The application tracker.
 *
 * Opens on Focus — the handful of applications that want a decision — with the
 * full pipeline one click away as a rail of stages. The selected application
 * sits open beside it on the right; below `xl` that pane becomes a sheet.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, MousePointerClick } from 'lucide-react';

import type { ApplicationStatus } from '@/types/resume';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { PanelError } from '@/app-shell/pages/today/primitives';
import { useGmailSuggestions } from '@/components/resume/GmailSuggestions';
import { appliedDayOf } from '@/lib/applicationDates';

import ApplicationDetail from './ApplicationDetail';
import FocusView from './FocusView';
import InsightsSheet, { type TrackerMetrics } from './InsightsSheet';
import StageRail from './StageRail';
import TrackerToolbar from './TrackerToolbar';
import { presetRange, statusKeyOf, type DatePreset } from './trackerConfig';
import { focusCount, isClosed, scopeRecords, type Scope } from './trackerScopes';
import { useMediaQuery } from './useMediaQuery';
import { useTrackerData, type ApplicationPatch } from './useTrackerData';
import { titleOf } from './trackerUtils';

export default function TrackerPage() {
  const {
    records,
    loading,
    loadError,
    savingId,
    funnel,
    funnelLoading,
    staleApps,
    reframe,
    refetch,
    refetchSilent,
    hydrate,
    setStatus,
    patch,
    dismissStale,
  } = useTrackerData();

  const [scope, setScope] = useState<Scope>('focus');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<ApplicationStatus>>(new Set());
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Inbox-derived stage changes belong on the page, not buried in a sheet, so
  // the tracker owns the queue and hands it to Focus.
  const {
    suggestions,
    busyId: suggestionBusyId,
    apply: applySuggestion,
    dismiss: dismissSuggestion,
    reload: reloadSuggestions,
  } = useGmailSuggestions(true, refetchSilent);

  // The pane needs room for the list beside it; below this it becomes a sheet.
  const wide = useMediaQuery('(min-width: 1280px)');
  // Drag only makes sense with a fine pointer. The detail pane's stage control
  // is the path everywhere else, and is also the keyboard path.
  const canDrag = useMediaQuery('(hover: hover) and (pointer: fine)');

  /**
   * The OAuth callback lands on `?gmail=linked`, and GmailIntegration reacts to
   * that flag on mount. It lives inside the Insights sheet, so the sheet has to
   * open or the confirmation would never fire and the flag would stick.
   */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('gmail') === 'linked') {
      setInsightsOpen(true);
    }
  }, []);

  const dateRange = useMemo(
    () => presetRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (q) {
        const hay = `${r.jd_analysis?.job_title || ''} ${r.jd_analysis?.company || ''} ${
          r.application?.recruiter_name || ''
        } ${r.application?.recruiter_company || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter.size && !statusFilter.has(statusKeyOf(r.application?.status))) return false;
      if (dateRange) {
        // Never applied means it cannot belong to "what I applied to that day".
        const day = appliedDayOf(r.application);
        if (!day || day < dateRange.from || day > dateRange.to) return false;
      }
      return true;
    });
  }, [records, search, statusFilter, dateRange]);

  const scoped = useMemo(() => scopeRecords(filtered, scope), [filtered, scope]);

  /**
   * Counts come off the unfiltered set, so the control keeps saying how much
   * work each scope holds even while a filter is narrowing the view.
   */
  const scopeCounts = useMemo(
    () => ({
      focus: focusCount(records),
      active: records.filter((r) => !isClosed(r)).length,
      all: records.length,
    }),
    [records],
  );

  const selected = useMemo(
    () => records.find((r) => r.record_id === selectedId) || null,
    [records, selectedId],
  );

  const filtersActive = statusFilter.size > 0 || !!dateRange;
  const clearFilters = useCallback(() => {
    setStatusFilter(new Set());
    setDatePreset('all');
    setCustomFrom('');
    setCustomTo('');
  }, []);

  const toggleStatus = useCallback((key: ApplicationStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const metrics: TrackerMetrics = useMemo(() => {
    const applied = records.filter((r) => statusKeyOf(r.application?.status) === 'applied').length;
    const responded = records.filter((r) =>
      ['interviewing', 'offer', 'rejected'].includes(statusKeyOf(r.application?.status)),
    ).length;
    const total = applied + responded;
    return {
      total: records.length,
      active: records.filter((r) => !isClosed(r)).length,
      interviewing: records.filter((r) => statusKeyOf(r.application?.status) === 'interviewing')
        .length,
      offers: records.filter((r) => statusKeyOf(r.application?.status) === 'offer').length,
      respRate: total > 0 ? Math.round((responded / total) * 100) : null,
    };
  }, [records]);

  /** Selecting fetches the rest of the record; the list only carried a summary. */
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      void hydrate(id);
    },
    [hydrate],
  );

  const handlePatch = useCallback(
    (id: string, body: ApplicationPatch, opts?: { quiet?: boolean }) => patch(id, body, opts),
    [patch],
  );

  /** A Gmail suggestion changes a stage, so the list has to catch up with it. */
  const handleApplySuggestion = useCallback(
    (id: string) => {
      void applySuggestion(id);
    },
    [applySuggestion],
  );

  const handleSyncComplete = useCallback(() => {
    refetchSilent();
    void reloadSuggestions();
  }, [refetchSilent, reloadSuggestions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <span
            role="status"
            aria-label="Loading"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />
          <p className="text-label text-muted-foreground">Loading your applications...</p>
        </div>
        <div className="h-[28rem] animate-pulse rounded-xl bg-muted/50" />
      </div>
    );
  }

  if (loadError && records.length === 0) {
    return (
      <PanelError
        title="Couldn't load your applications"
        body={loadError}
        onRetry={() => refetch()}
      />
    );
  }

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ClipboardList className="h-6 w-6" aria-hidden />
        </div>
        <p className="font-display text-body font-semibold text-foreground">No applications yet</p>
        <p className="mx-auto mt-1 max-w-sm text-label text-muted-foreground">
          Tailor a resume or save a job from Discover and it lands here. Applying without tailoring
          still shows up, marked as base resume.
        </p>
        <Button asChild className="mt-4">
          <Link to="/app/resume/tailor">Tailor a resume</Link>
        </Button>
      </div>
    );
  }

  const detail = selected ? (
    <ApplicationDetail
      key={selected.record_id}
      record={selected}
      saving={savingId === selected.record_id}
      onStatusChange={(s) => setStatus(selected.record_id, s)}
      onPatch={(body) => patch(selected.record_id, body)}
    />
  ) : null;

  const noMatches = filtered.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <TrackerToolbar
        scope={scope}
        onScopeChange={setScope}
        scopeCounts={scopeCounts}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onToggleStatus={toggleStatus}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
        dateRange={dateRange}
        filtersActive={filtersActive}
        onClearFilters={clearFilters}
        resultCount={scoped.length}
        attentionCount={staleApps.length}
        onOpenInsights={() => setInsightsOpen(true)}
      />

      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1">
          {noMatches ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-body text-foreground">Nothing matches those filters.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          ) : scope === 'focus' ? (
            <FocusView
              records={scoped}
              suggestions={suggestions}
              suggestionBusyId={suggestionBusyId}
              onApplySuggestion={handleApplySuggestion}
              onDismissSuggestion={dismissSuggestion}
              selectedId={selectedId}
              savingId={savingId}
              onSelect={handleSelect}
              onPatch={handlePatch}
              onShowActive={() => setScope('active')}
            />
          ) : (
            <StageRail
              records={scoped}
              selectedId={selectedId}
              savingId={savingId}
              canDrag={canDrag}
              onSelect={handleSelect}
              onPatch={handlePatch}
              onMove={setStatus}
            />
          )}
        </div>

        {wide && (
          <aside className="sticky top-16 w-[26rem] shrink-0 rounded-xl border border-border bg-card p-5 shadow-soft">
            {detail || (
              <div className="py-16 text-center">
                <MousePointerClick
                  className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60"
                  aria-hidden
                />
                <p className="text-body text-muted-foreground">
                  Select an application to see everything about it.
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {!wide && (
        <Sheet
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
        >
          <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
            <SheetTitle className="sr-only">
              {selected ? titleOf(selected) : 'Application'}
            </SheetTitle>
            <div className="mt-6">{detail}</div>
          </SheetContent>
        </Sheet>
      )}

      <InsightsSheet
        open={insightsOpen}
        onOpenChange={setInsightsOpen}
        metrics={metrics}
        funnel={funnel}
        funnelLoading={funnelLoading}
        staleApps={staleApps}
        reframe={reframe}
        onSyncComplete={handleSyncComplete}
        onDismissStale={dismissStale}
      />
    </div>
  );
}
