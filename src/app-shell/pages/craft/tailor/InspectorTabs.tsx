/**
 * Inspector tab chrome (Tailor right column).
 *
 * Presentational shell — owns only the active-tab selection contract (lifted to
 * props). Builds the 4-tab bar (JD / ATS / Regenerate / Cover) on shadcn Tabs,
 * with score/status affordances, and renders caller-supplied panels as content.
 */
import type { ReactNode } from 'react';
import { ClipboardList, Search, RotateCw, Sparkles } from 'lucide-react';

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
  coverLetterReady: boolean;
  coverLetterLoading: boolean;
  jdPanel: ReactNode;
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
  coverLetterReady,
  coverLetterLoading,
  jdPanel,
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
        <TabsTrigger value="jd" className={triggerCls}>
          <ClipboardList className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Job Description</span>
        </TabsTrigger>

        <TabsTrigger value="ats" disabled={!hasResult} className={triggerCls}>
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">ATS Score</span>
          {atsScore != null ? (
            <span
              className={cn(
                'ml-0.5 text-[10px] font-bold tabular-nums',
                scoreTone(atsScore).text,
              )}
            >
              {atsScore}
            </span>
          ) : atsLoading ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
          ) : null}
        </TabsTrigger>

        <TabsTrigger
          value="regenerate"
          disabled={!hasResult}
          className={triggerCls}
        >
          <RotateCw className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Regenerate</span>
        </TabsTrigger>

        <TabsTrigger value="cover" disabled={!hasResult} className={triggerCls}>
          <Sparkles className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Cover Letter</span>
          {coverLetterReady && !coverLetterLoading ? (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-success" />
            </span>
          ) : coverLetterLoading ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning" />
          ) : null}
        </TabsTrigger>
      </TabsList>

      {/* Panels — each wrapped in a token-driven surface */}
      <TabsContent
        value="jd"
        className="mt-0 rounded-container border border-border bg-card shadow-soft"
      >
        {jdPanel}
      </TabsContent>
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
