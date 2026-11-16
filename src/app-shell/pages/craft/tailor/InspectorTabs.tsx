/**
 * Inspector tab chrome (the Tailor tool's working column).
 *
 * Presentational shell - owns only the active-tab selection contract (lifted to
 * props). Builds the tab bar on shadcn Tabs, with score/status affordances,
 * and renders caller-supplied panels as content.
 *
 * Two rules keep it readable for someone who has never tailored a resume:
 *   - Before there is a result there are no tabs at all, only the job posting
 *     form. Five greyed-out tabs said "there is a lot here you cannot use".
 *   - Tabs are named for what you do in them, not for the system behind them:
 *     "Match score" not "ATS", "Recruiter view" not "Screener", "Ask for
 *     changes" not "Regenerate", "Check facts" not "Review".
 */
import type { ReactNode } from 'react';
import { ClipboardList, Search, RotateCw, Sparkles, ShieldAlert, ScanSearch } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { scoreTone } from './primitives';
import type { InspectorTabKey } from './types';

interface InspectorTabsProps {
  active: InspectorTabKey;
  onChange: (t: InspectorTabKey) => void;
  hasResult: boolean;
  atsScore: number | null;
  atsLoading: boolean;
  /** Score no longer matches the edited resume. */
  atsStale?: boolean;
  /** Unresolved flagged claims (UNSUPPORTED + PARTIAL without a decision). */
  reviewPendingCount?: number;
  /** True when any unresolved flag is UNSUPPORTED (destructive tint). */
  reviewHasUnsupported?: boolean;
  coverLetterReady: boolean;
  coverLetterLoading: boolean;
  jdPanel: ReactNode;
  reviewPanel?: ReactNode;
  atsPanel: ReactNode;
  /** Employer-side read of the PDF (must-haves found / missing). */
  screenerPanel?: ReactNode;
  /** Screener grade letter for the tab badge. */
  screenerGrade?: string | null;
  regeneratePanel: ReactNode;
  coverPanel: ReactNode;
}

const triggerCls =
  'hit-target min-h-10 flex-1 shrink-0 gap-1.5 whitespace-nowrap rounded-control px-2 text-caption sm:justify-start sm:px-3 2xl:justify-center data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:ring-1 data-[state=active]:ring-primary/30';

export function InspectorTabs({
  active,
  onChange,
  hasResult,
  atsScore,
  atsLoading,
  atsStale = false,
  reviewPendingCount = 0,
  reviewHasUnsupported = false,
  coverLetterReady,
  coverLetterLoading,
  jdPanel,
  reviewPanel,
  atsPanel,
  screenerPanel,
  screenerGrade = null,
  regeneratePanel,
  coverPanel,
}: InspectorTabsProps) {
  // Nothing tailored yet: the form on its own, no strip of disabled tabs.
  if (!hasResult) {
    return (
      <div className="min-w-0 rounded-container border border-border bg-card shadow-soft">
        {jdPanel}
      </div>
    );
  }

  return (
    <Tabs
      value={active}
      onValueChange={(v) => onChange(v as InspectorTabKey)}
      className="min-w-0"
    >
      {/* Tab bar */}
      {/* A phone gets six icon tabs in a row. From `sm` up the six tools sit
          in a 3 x 2 palette, each with its icon and full name, so none is
          hidden behind a sideways scroll (the sixth tab used to be cut off).
          On very wide screens they fit on one line. */}
      <TabsList className="mb-4 flex h-auto w-full justify-start gap-1 rounded-container border border-border bg-muted/60 p-1.5 sm:grid sm:grid-cols-3 2xl:grid-cols-6">
        {/* Below `sm` the labels collapse to icon-only VISUALLY, but stay in
            the accessible name via sr-only (an aria-label would mask the
            dynamic score/status text that follows each label). */}
        <TabsTrigger value="ats" disabled={!hasResult} className={triggerCls}>
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Match score</span>
          {atsScore != null ? (
            <span className="ml-0.5 inline-flex items-center gap-1">
              <span
                className={cn(
                  'text-caption-sm font-bold tabular-nums',
                  scoreTone(atsScore).text,
                )}
              >
                {atsScore}
              </span>
              {atsStale && (
                <>
                  <span
                    title="Edited since scored"
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-warning"
                  />
                  <span className="sr-only">Score outdated. Edited since scored</span>
                </>
              )}
            </span>
          ) : atsLoading ? (
            <>
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning"
              />
              <span className="sr-only">Scoring in progress</span>
            </>
          ) : null}
        </TabsTrigger>

        {reviewPanel && (
          <TabsTrigger value="review" disabled={!hasResult} className={triggerCls}>
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Check facts</span>
            {reviewPendingCount > 0 && (
              <span
                className={cn(
                  'ml-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-caption-sm font-bold tabular-nums',
                  reviewHasUnsupported
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-warning/15 text-warning',
                )}
              >
                {reviewPendingCount}
                <span className="sr-only"> flagged claims pending review</span>
              </span>
            )}
          </TabsTrigger>
        )}

        {screenerPanel && (
          <TabsTrigger value="screener" disabled={!hasResult} className={triggerCls}>
            <ScanSearch className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Recruiter view</span>
            {screenerGrade && (
              <span
                className={cn(
                  'ml-0.5 text-caption-sm font-bold',
                  screenerGrade === 'A' || screenerGrade === 'B'
                    ? 'text-success'
                    : screenerGrade === 'C'
                      ? 'text-warning'
                      : 'text-destructive',
                )}
              >
                {screenerGrade}
                <span className="sr-only"> screener grade</span>
              </span>
            )}
          </TabsTrigger>
        )}

        <TabsTrigger
          value="regenerate"
          disabled={!hasResult}
          className={triggerCls}
        >
          <RotateCw className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Ask for changes</span>
        </TabsTrigger>

        <TabsTrigger value="cover" disabled={!hasResult} className={triggerCls}>
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Cover letter</span>
          {coverLetterReady && !coverLetterLoading ? (
            <>
              {/* Static: "ready" is a state, not activity. Only in-progress
                  dots animate on this strip. */}
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              <span className="sr-only">Cover letter ready</span>
            </>
          ) : coverLetterLoading ? (
            <>
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning"
              />
              <span className="sr-only">Generating cover letter</span>
            </>
          ) : null}
        </TabsTrigger>
        <TabsTrigger value="jd" className={triggerCls}>
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Job posting</span>
        </TabsTrigger>
      </TabsList>

      {/* Panels - each wrapped in a token-driven surface */}
      <TabsContent
        value="jd"
        className="mt-0 rounded-container border border-border bg-card shadow-soft"
      >
        {jdPanel}
      </TabsContent>
      {reviewPanel && (
        <TabsContent
          value="review"
          className="mt-0 rounded-container border border-border bg-card shadow-soft"
        >
          {reviewPanel}
        </TabsContent>
      )}
      <TabsContent
        value="ats"
        className="mt-0 rounded-container border border-border bg-card shadow-soft"
      >
        {atsPanel}
      </TabsContent>
      {screenerPanel && (
        <TabsContent
          value="screener"
          className="mt-0 rounded-container border border-border bg-card shadow-soft"
        >
          {screenerPanel}
        </TabsContent>
      )}
      <TabsContent
        value="regenerate"
        className="mt-0 rounded-container border border-border bg-card shadow-soft"
      >
        {regeneratePanel}
      </TabsContent>
      <TabsContent
        value="cover"
        className="mt-0 rounded-container border border-border bg-card shadow-soft"
      >
        {coverPanel}
      </TabsContent>
    </Tabs>
  );
}
