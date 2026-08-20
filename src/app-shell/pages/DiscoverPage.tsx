import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Loader2, Radar, Search } from "lucide-react";
import { SubNav } from "../SubNav";
import { JOBS_SECTIONS, appPath } from "../nav.config";
import { Button } from "@/components/ui/button";
import { JobFeedSheet } from "@/components/job-search/JobFeedSheet";
import { JobsRefineBar } from "@/components/job-search/JobsRefineBar";
import { useCombinedJobsCtx } from "@/components/job-search/CombinedJobsProvider";

function SectionFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-muted-foreground"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
    </div>
  );
}

function jobsSectionOf(pathname: string): string {
  return pathname.split("/").filter(Boolean).pop() ?? "";
}

/** Combined-feed chrome: title filter + Job feed drawer trigger. */
export function JobsTopBar() {
  const { search, setSearch, customizeOpen, setCustomizeOpen } = useCombinedJobsCtx();

  return (
    <div className="flex min-h-11 items-center gap-3">
      <h1 className="shrink-0 font-display text-lg font-bold tracking-tight text-foreground">
        Jobs
      </h1>
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter title or company..."
          aria-label="Filter jobs by title or company"
          className="h-10 w-full rounded-lg border border-border/80 bg-background/80 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCustomizeOpen(true)}
        aria-expanded={customizeOpen}
        className="h-10 shrink-0 gap-1.5"
      >
        <Radar className="h-3.5 w-3.5" aria-hidden />
        Job feed
      </Button>
    </div>
  );
}

/** Career Portals chrome: no merged-feed search or Job feed drawer. */
export function PortalsJobsTopBar() {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <h1 className="shrink-0 font-display text-lg font-bold tracking-tight text-foreground">
        Jobs
      </h1>
      <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
        Scan one catalog at a time. Merged matches live in For you.
      </p>
      <Link
        to={appPath("jobs", "for-you")}
        className="shrink-0 text-xs font-semibold text-primary hover:underline"
      >
        See merged feed
      </Link>
    </div>
  );
}

/**
 * "Jobs" destination (`/app/jobs`). For-you feed + career portals.
 */
export default function DiscoverPage() {
  const { pathname } = useLocation();
  const section = jobsSectionOf(pathname);
  const isPortals = section === "portals";
  const showListingRefine = section === "for-you" || section === "jobs";
  const showCombinedFeed = !isPortals;

  return (
    <div className="page-full flex flex-col gap-4 !pt-0">
      {/* One frosted chrome stack - avoids the seam from stacked glass bars and
          multiple border-b lines between title, tabs, and filters. Full-bleed
          within the page padding so the frost matches the global top bar. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border/30 glass-nav px-4 pb-3 pt-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {isPortals ? <PortalsJobsTopBar /> : <JobsTopBar />}
        <div className="mt-3 space-y-2">
          <SubNav ariaLabel="Jobs sections" items={JOBS_SECTIONS} className="border-0" />
          {showListingRefine && <JobsRefineBar />}
        </div>
      </div>
      {showCombinedFeed && <JobFeedSheet />}

      <Suspense fallback={<SectionFallback />}>
        {/* Sections are mounted by App.tsx routes; `embedded` tells the
            monolith-born tab components the shell already renders the page
            header + SubNav, so they suppress their internal hero headers. */}
        <Outlet context={{ embedded: true }} />
      </Suspense>
    </div>
  );
}
