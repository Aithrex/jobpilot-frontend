/**
 * Inspector tab chrome (Tailor right column).
 *
 * Presentational shell - owns only the active-tab selection contract (lifted to
 * props). Builds the 5-tab bar (JD / Review / ATS / Regenerate / Cover) on
 * shadcn Tabs, with score/status affordances, and renders caller-supplied
 * panels as content.
 */
import type { ReactNode } from 'react';
import { ClipboardList, Search, RotateCw, Sparkles, ShieldAlert } from 'lucide-react';

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
  regeneratePanel: ReactNode;
  coverPanel: ReactNode;
}

const triggerCls =
  'flex-1 gap-1.5 rounded-control px-2 sm:px-3 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:ring-1 data-[state=active]:ring-primary/30';

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
  regeneratePanel,
  coverPanel,
}: InspectorTabsProps) {
  return (
    <Tabs
      value={active}
      onValueChange={(v) => onChange(v as InspectorTabKey)}
      className="min-w-0"
    >
      {/* Tab bar */}
      <TabsList className="mb-4 flex h-auto w-full gap-1 rounded-container border border-border bg-muted/60 p-1.5">
        {/* Below `sm` the labels collapse to icon-only VISUALLY, but stay in
            the accessible name via sr-only (an aria-label would mask the
            dynamic score/status text that follows each label). */}
        <TabsTrigger value="jd" className={triggerCls}>
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Job Description</span>
        </TabsTrigger>

        {reviewPanel && (
          <TabsTrigger value="review" disabled={!hasResult} className={triggerCls}>
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Review</span>
            {reviewPendingCount > 0 && (
              <span
                className={cn(
                  'ml-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums',
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

        <TabsTrigger value="ats" disabled={!hasResult} className={triggerCls}>
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">ATS Score</span>
          {atsScore != null ? (
            <span className="ml-0.5 inline-flex items-center gap-1">
              <span
                className={cn(
                  'text-[10px] font-bold tabular-nums',
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
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning"
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

        <TabsTrigger
          value="regenerate"
          disabled={!hasResult}
          className={triggerCls}
        >
          <RotateCw className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Regenerate</span>
        </TabsTrigger>

        <TabsTrigger value="cover" disabled={!hasResult} className={triggerCls}>
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Cover Letter</span>
          {coverLetterReady && !coverLetterLoading ? (
            <>
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
              </span>
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
