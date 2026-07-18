import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bookmark, Briefcase } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useJobSearch } from '@/hooks/useJobSearch';
import { SavedJobsPanel } from '@/components/job-search/SavedJobsPanel';
// import { DailyPipelinePanel } from '@/components/job-search/DailyPipelinePanel';  // APIFY DISABLED (temporary)
import { SmartFiltersPanel, type SmartFilterApplyMode } from '@/components/job-search/SmartFiltersPanel';
import type { SmartFilterSuggestions } from '@/types/jobs';

export interface PendingFilterPayload {
  data: SmartFilterSuggestions;
  mode: SmartFilterApplyMode;
}

interface JobOpportunitiesTabProps {
  /** Mounted inside the /next app shell — the shell already renders the page
      header + SubNav, so suppress the internal hero and keep a slim toolbar. */
  embedded?: boolean;
}

export default function JobOpportunitiesTab({ embedded }: JobOpportunitiesTabProps) {
  // Shell pages pass `embedded` via outlet context (the routes in App.tsx
  // mount this component without props); the legacy /app monolith passes
  // neither, so it renders unchanged.
  const shellCtx = useOutletContext<{ embedded?: boolean } | null>();
  const isEmbedded = embedded ?? shellCtx?.embedded ?? false;
  const jobSearch = useJobSearch();
  // --- APIFY DISABLED (temporary): default to 'saved' since the Apify-driven
  // 'pipeline' and 'smart' tabs are commented out below. Restore to 'pipeline'
  // when re-enabling. ---
  const [activeTab, setActiveTab] = useState<'pipeline' | 'smart' | 'saved'>('saved');
  const [pendingSuggestions, setPendingSuggestions] =
    useState<PendingFilterPayload | null>(null);

  // Pick up suggestions handed off from the inline component on the Tailor view.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pending_smart_filters');
      if (raw) {
        sessionStorage.removeItem('pending_smart_filters');
        const parsed = JSON.parse(raw) as SmartFilterSuggestions;
        setPendingSuggestions({ data: parsed, mode: 'replace' });
        setActiveTab('pipeline');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleApplySuggestions = (s: SmartFilterSuggestions, mode: SmartFilterApplyMode = 'replace') => {
    if (mode === 'replace') {
      // Replace = big "Apply to pipeline" button — switch tabs so the user
      // sees the populated form.
      setPendingSuggestions({ data: s, mode: 'replace' });
      setActiveTab('pipeline');
      return;
    }
    // Append mode = per-group "+ Add to pipeline" while user stacks groups
    // on the Smart Filters tab. DailyPipelinePanel isn't mounted yet (Radix
    // Tabs only mounts the active content), so we MUST accumulate the
    // suggestions ourselves — otherwise the second click overwrites the
    // first and only the last group ever lands.
    setPendingSuggestions((prev) => {
      if (!prev || prev.mode !== 'append') {
        return { data: s, mode: 'append' };
      }
      const dedup = (a: string[], b: string[]) => {
        const seen = new Set(a.map((x) => x.toLowerCase()));
        const out = [...a];
        for (const item of b) {
          const k = (item || '').trim().toLowerCase();
          if (!k || seen.has(k)) continue;
          seen.add(k);
          out.push(item);
        }
        return out;
      };
      const merged: SmartFilterSuggestions = {
        ...s,
        headline: prev.data.headline || s.headline,
        rationale: prev.data.rationale || s.rationale,
        linkedin_keyword_sets: dedup(prev.data.linkedin_keyword_sets || [], s.linkedin_keyword_sets || []),
        workday_titles: dedup(prev.data.workday_titles || [], s.workday_titles || []),
        custom_role_terms: dedup(prev.data.custom_role_terms || [], s.custom_role_terms || []),
        preset_tags: dedup(prev.data.preset_tags || [], s.preset_tags || []),
        past_days: prev.data.past_days ?? s.past_days,
        intent: prev.data.intent ?? s.intent,
      };
      return { data: merged, mode: 'append' };
    });
  };

  return (
    <div className="space-y-6">
      {isEmbedded ? (
        // The shell page renders the h1 + SubNav — keep a slim toolbar row
        // (status badges only) instead of a second hero header.
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
            Beta
          </span>
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Bookmark className="h-3 w-3" />
            {jobSearch.savedJobs.length} saved
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Career · Jobs
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </span>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                Job Opportunities
              </h2>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                Beta
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl">
              A daily pipeline of roles pulled straight from company career portals: Workday,
              Greenhouse, Lever, and Ashby, with smart filters built around your resume.
              Applying moves a job straight into Saved, marked as applied.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Bookmark className="h-3 w-3" />
            {jobSearch.savedJobs.length} saved
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-5">
        {/* --- APIFY DISABLED (temporary): with only the "Saved" panel left, a
            single-trigger TabsList is dead chrome — the whole switcher is
            hidden so the saved-jobs panel fills the space. Restore the block
            below (and re-add the `TabsList`/`TabsTrigger` + `Zap`/`Wand2`
            imports) to re-enable. ---
        <TabsList className="border border-border bg-card/60 backdrop-blur-sm">
          <TabsTrigger value="pipeline" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary">
            <Zap className="h-3.5 w-3.5" />
            Daily pipeline
          </TabsTrigger>
          <TabsTrigger value="smart" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary">
            <Wand2 className="h-3.5 w-3.5" />
            Smart filters
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary">
            <Bookmark className="h-3.5 w-3.5" />
            Saved ({jobSearch.savedJobs.length})
          </TabsTrigger>
        </TabsList>
        --- APIFY DISABLED (temporary) --- */}

        {/* --- APIFY DISABLED (temporary): daily-pipeline + smart-filters panels hidden. Restore to re-enable. ---
        <TabsContent value="pipeline">
          <DailyPipelinePanel
            pendingSuggestions={pendingSuggestions}
            onSuggestionsConsumed={() => setPendingSuggestions(null)}
            onJobApplied={jobSearch.loadSavedJobs}
          />
        </TabsContent>

        <TabsContent value="smart">
          <SmartFiltersPanel onApply={handleApplySuggestions} />
        </TabsContent>
        --- APIFY DISABLED (temporary) --- */}

        <TabsContent value="saved">
          <SavedJobsPanel
            savedJobs={jobSearch.savedJobs}
            updateJobStatus={jobSearch.updateJobStatus}
            unsaveJob={jobSearch.unsaveJob}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
