/**
 * The application tracker.
 *
 * Four numbers say how the search is going. Under them, three views: To do
 * (the handful of things that want a decision), Applications (everything, by
 * stage) and Insights (the same data as charts). The selected application
 * opens beside the list on the right; below `xl` that pane becomes a sheet.
 */
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, X } from 'lucide-react';
import { toast } from 'sonner';

import type { ApplicationStatus } from '@/types/resume';
import type { GmailOutcome } from '@/types/gmail';
import { Button } from '@/components/ui/button';
import { confirmAction } from '@/components/ui/confirm';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { PanelError } from '@/app-shell/pages/today/primitives';
import { GmailReviewLoadError, useGmailSuggestions } from '@/components/resume/GmailSuggestions';
import GmailIntegration from '@/components/resume/GmailIntegration';
import { appliedDayOf } from '@/lib/applicationDates';
import { notifyError } from '@/lib/notify';

import ApplicationDetail from './ApplicationDetail';
import FocusView from './FocusView';
import InsightsView from './InsightsView';
import StageRail from './StageRail';
import JourneyStrip, { type JourneyTarget } from './JourneyStrip';
import Celebration, { type CelebrationSignal } from './Celebration';
import TrackerToolbar from './TrackerToolbar';
import { presetRange, statusKeyOf, type DatePreset } from './trackerConfig';
import { computeInsights } from './trackerInsights';
import { focusCount, viewRecords, type TrackerView } from './trackerScopes';
import { useMediaQuery } from './useMediaQuery';
import { useTrackerData, type ApplicationPatch } from './useTrackerData';
import { titleOf } from './trackerUtils';
import { downloadApplicationsCsv } from './trackerExport';

export default function TrackerPage() {
  const {
    records,
    loading,
    loadError,
    savingId,
    bulkBusy,
    reframe,
    setReframe,
    refetch,
    refetchSilent,
    hydrate,
    setStatus,
    patch,
    dismissFollowUp,
    setStatusForMany,
  } = useTrackerData();

  const [view, setView] = useState<TrackerView>('todo');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Set<ApplicationStatus>>(new Set());
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // An email that changes a stage is a decision, so the tracker owns the queue
  // and hands it to To do.
  const {
    suggestions,
    busyId: suggestionBusyId,
    apply: applySuggestion,
    dismiss: dismissSuggestion,
    reload: reloadSuggestions,
    loadError: suggestionsError,
  } = useGmailSuggestions(true, refetchSilent);

  // The pane needs room for the list beside it; below this it becomes a sheet.
  const wide = useMediaQuery('(min-width: 1280px)');
  // Drag only makes sense with a fine pointer. The detail pane's stage control
  // is the path everywhere else, and is also the keyboard path.
  const canDrag = useMediaQuery('(hover: hover) and (pointer: fine)');

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

  const listed = useMemo(() => viewRecords(filtered, view), [filtered, view]);

  /** The numbers always describe everything tracked, whatever is filtered. */
  const insights = useMemo(() => computeInsights(records), [records]);

  /** Tab counts use the same search/date/stage filters as the rows. */
  const viewCounts = useMemo(
    () => ({
      todo: focusCount(filtered) + suggestions.length,
      applications: filtered.length,
    }),
    [filtered, suggestions.length],
  );

  const selected = useMemo(
    () => records.find((r) => r.record_id === selectedId) || null,
    [records, selectedId],
  );

  const filtersActive = statusFilter.size > 0 || !!dateRange || !!search.trim();
  const clearFilters = useCallback(() => {
    setSearch('');
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

  /** A tile is a question; pressing it shows the rows that answer it. */
  const openSummary = useCallback(
    (target: JourneyTarget) => {
      clearFilters();
      if (target === 'insights') {
        setView('insights');
        return;
      }
      setView('applications');
      if (target === 'recent') setDatePreset('7d');
      if (target === 'interviewing') setStatusFilter(new Set<ApplicationStatus>(['interviewing']));
      if (target === 'waiting') setStatusFilter(new Set<ApplicationStatus>(['applied']));
      if (target === 'offer') setStatusFilter(new Set<ApplicationStatus>(['offer']));
      if (target === 'replied')
        setStatusFilter(new Set<ApplicationStatus>(['interviewing', 'offer', 'rejected']));
    },
    [clearFilters],
  );

  // An offer (and a first interview) gets a short burst: the milestones of a
  // search deserve a moment, briefly and never in the way.
  const [celebration, setCelebration] = useState<CelebrationSignal | null>(null);

  /** Selecting fetches the rest of the record; the list only carried a summary. */
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      void hydrate(id);
    },
    [hydrate],
  );

  const handlePatch = useCallback(
    (id: string, body: ApplicationPatch, opts?: { quiet?: boolean }) => {
      const before = records.find((r) => r.record_id === id)?.application?.status;
      if (body.status === 'offer' && before !== 'offer') setCelebration({ id: Date.now(), kind: 'offer' });
      else if (body.status === 'interviewing' && before !== 'interviewing' && insights.interviewed === 0)
        setCelebration({ id: Date.now(), kind: 'interview' });
      return patch(id, body, opts);
    },
    [patch, records, insights.interviewed],
  );

  /**
   * A Gmail suggestion changes a stage, so the list has to catch up with it.
   * The chosen outcome must travel with it: an unclear email has no status of
   * its own, and dropping the choice here made every such update fail.
   */
  const handleApplySuggestion = useCallback(
    (id: string, recordId?: string, status?: GmailOutcome) => {
      void applySuggestion(id, recordId, status);
    },
    [applySuggestion],
  );

  const handleSyncComplete = useCallback(() => {
    refetchSilent();
    void reloadSuggestions();
  }, [refetchSilent, reloadSuggestions]);

  /** Close out everything that has waited past the point a reply is likely. */
  const closeStale = useCallback(async () => {
    const ids = insights.staleIds;
    if (!ids.length) return;
    const confirmed = await confirmAction({
      title: `Mark ${ids.length} ${ids.length === 1 ? 'application' : 'applications'} as no response?`,
      description:
        'They move to Closed as no response. Nothing is deleted, and you can move any of them back if an employer does reply.',
      confirmLabel: 'Mark as no response',
    });
    if (!confirmed) return;
    const { moved, failed } = await setStatusForMany(ids, 'ghosted');
    if (moved)
      toast.success(
        `${moved} ${moved === 1 ? 'application' : 'applications'} closed as no response.`,
      );
    if (failed) {
      notifyError(
        "Couldn't close every application",
        `${failed} could not be saved. Try again in a moment.`,
      );
    }
  }, [insights.staleIds, setStatusForMany]);

  /**
   * One box above the list: how the search is going, then the inbox
   * connection.
   */
  const header = (
    <div className="space-y-4">
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        {!loading && !loadError && records.length > 0 && (
          <JourneyStrip insights={insights} onOpen={openSummary} />
        )}
        <GmailIntegration onSyncComplete={handleSyncComplete} showReviewQueue={false} inline />
      </div>
      <GmailReviewLoadError error={suggestionsError} onRetry={() => void reloadSuggestions()} />
      <Celebration signal={celebration} />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <span
            role="status"
            aria-label="Loading"
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />
          <p className="text-body-sm text-muted-foreground">Loading your applications...</p>
        </div>
        {/* Shaped like the populated view: the toolbar, then a stage of rows. */}
        <div aria-hidden className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadError && records.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <PanelError
          title="Couldn't load your applications"
          body={loadError}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <ClipboardList className="h-6 w-6" aria-hidden />
          </div>
          <p className="font-display text-body font-semibold text-foreground">
            No applications yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-body-sm text-muted-foreground">
            Save a job from For you or confirm an application to start tracking it here. Gmail can
            only match replies to roles that are in this tracker.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link to="/app/jobs/for-you">Find jobs</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/app/resume/tailor">Tailor a resume</Link>
            </Button>
          </div>
        </div>
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

  const todo = (
    <FocusView
      records={listed}
      suggestions={suggestions}
      suggestionBusyId={suggestionBusyId}
      onApplySuggestion={handleApplySuggestion}
      onDismissSuggestion={dismissSuggestion}
      selectedId={selectedId}
      savingId={savingId}
      onSelect={handleSelect}
      onPatch={handlePatch}
      onNoResponse={(id) => void setStatus(id, 'ghosted')}
      onDismissFollowUp={(id) => void dismissFollowUp(id)}
      onCloseStale={() => void closeStale()}
      closing={bulkBusy}
      onShowAll={() => setView('applications')}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {header}
      {loadError && (
        <p role="alert" className="text-body-sm text-destructive">
          Your last refresh did not finish. Showing the applications loaded earlier.{' '}
          <button
            type="button"
            className="hit-target font-medium underline underline-offset-2"
            onClick={() => void refetchSilent()}
          >
            Retry
          </button>
        </p>
      )}
      <TrackerToolbar
        view={view}
        onViewChange={setView}
        viewCounts={viewCounts}
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
        resultCount={listed.length}
        onExport={() => downloadApplicationsCsv(listed)}
        exportDisabled={!listed.length}
      />

      {view === 'insights' ? (
        <InsightsView
          insights={insights}
          onCloseStale={() => void closeStale()}
          closing={bulkBusy}
        />
      ) : (
        <div className="flex items-start gap-6">
          <div className="min-w-0 flex-1 space-y-4">
            {view === 'todo' && reframe && (
              <aside
                aria-label="After a rejection"
                className="relative rounded-xl border border-border bg-card p-4 shadow-soft"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close this note"
                  onClick={() => setReframe(null)}
                  className="hit-target absolute right-2 top-2 h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
                <p className="pr-8 text-body font-medium text-foreground">
                  {reframe.acknowledgement}
                </p>
                <p className="mt-1 text-body-sm text-muted-foreground">{reframe.what_went_right}</p>
                {reframe.next_actions?.length > 0 && (
                  <ul className="ml-4 mt-1.5 list-disc text-body-sm text-muted-foreground">
                    {reframe.next_actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                )}
              </aside>
            )}

            {filtered.length === 0 ? (
              <>
                {/* An email waiting for review is still something to show. */}
                {view === 'todo' && suggestions.length > 0 && todo}
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <p className="text-body text-foreground">Nothing matches those filters.</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              </>
            ) : view === 'todo' ? (
              todo
            ) : (
              <StageRail
                records={listed}
                selectedId={selectedId}
                savingId={savingId}
                canDrag={canDrag}
                onSelect={handleSelect}
                onPatch={handlePatch}
                onMove={setStatus}
              />
            )}
          </div>

          {/* The pane opens with a selection; with nothing selected the list
              has the full width instead of sitting beside an empty box. */}
          {wide && detail && (
            <aside
              aria-label="Application details"
              className="sticky top-16 w-[26rem] shrink-0 rounded-xl border border-border bg-card p-5 shadow-soft"
            >
              <Button
                variant="ghost"
                size="sm"
                aria-label="Close details"
                onClick={() => setSelectedId(null)}
                className="hit-target float-right -mr-2 -mt-2 h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
              {detail}
            </aside>
          )}
        </div>
      )}

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
    </div>
  );
}
