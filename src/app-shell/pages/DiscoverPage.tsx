import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { SubNav } from "../SubNav";
import { JOBS_SECTIONS, appPath } from "../nav.config";
import { JobFeedSheet } from "@/components/job-search/JobFeedSheet";
import { JobsRefineBar } from "@/components/job-search/JobsRefineBar";
import { useCombinedJobsCtx } from "@/components/job-search/CombinedJobsProvider";
import { AnimatedOutlet } from "../AnimatedOutlet";
import { useSavedJobTabCounts } from "@/hooks/useSavedJobTabCounts";
import { cn } from "@/lib/utils";

function jobsSectionOf(pathname: string): string {
  return pathname.split("/").filter(Boolean).pop() ?? "";
}

/**
 * The title/company search for the For you board. It narrows the cards on
 * screen as you type; it does not search Saved or Applied, so it is shown on
 * For you only (it used to sit above all three tabs and do nothing on two).
 */
export function JobsSearchField({ className }: { className?: string }) {
  const { search, setSearch } = useCombinedJobsCtx();

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search title or company"
        aria-label="Filter jobs by title or company"
        className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

/** Career Portals chrome: no merged-feed search or Job feed drawer. */
export function PortalsJobsTopBar() {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <h1 className="shrink-0 font-display text-h3 font-bold tracking-tight text-foreground">
        Jobs
      </h1>
      <p className="min-w-0 flex-1 truncate text-caption text-muted-foreground">
        Scan one catalog at a time. Merged matches live in For you.
      </p>
      <Link
        to={appPath("jobs", "for-you")}
        className="hit-target shrink-0 rounded-sm text-caption font-semibold text-primary underline-offset-4 hover:underline"
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
  const { toApply, followUps, interviewing } = useSavedJobTabCounts();
  // Each tab shows only the number that asks for action. A total ("99+")
  // grew forever and said nothing about what to do next.
  const jobsSections = useMemo(
    () =>
      JOBS_SECTIONS.map((item) => {
        if (item.to === "saved") {
          return {
            ...item,
            badge: toApply,
            badgeText: "to apply",
            badgeTitle: `${toApply} saved ${toApply === 1 ? "role is" : "roles are"} still open and not applied to`,
          };
        }
        if (item.to === "applied") {
          if (followUps > 0) {
            return {
              ...item,
              badge: followUps,
              badgeText: followUps === 1 ? "follow-up" : "follow-ups",
              badgeTitle: `${followUps} ${followUps === 1 ? "application has" : "applications have"} had no update for a week or more`,
            };
          }
          return {
            ...item,
            badge: interviewing,
            badgeText: "interviewing",
            badgeTitle: `${interviewing} at the interview or offer stage`,
          };
        }
        return item;
      }),
    [toApply, followUps, interviewing],
  );

  return (
    <div className="page-full flex flex-col gap-4 !pt-0">
      {/* One frosted chrome stack - avoids the seam from stacked glass bars and
          multiple border-b lines between title, tabs, and filters. Full-bleed
          within the page padding so the frost matches the global top bar.
          Pinned from `md` up only: on a phone the stack is four rows, and
          pinned it left less than half the screen for the jobs. */}
      <div className="z-20 -mx-4 md:sticky md:top-0 border-b border-border/30 glass-nav px-4 pb-3 pt-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {isPortals ? (
          <>
            <PortalsJobsTopBar />
            <SubNav ariaLabel="Jobs sections" items={jobsSections} className="mt-3 border-0" />
          </>
        ) : (
          // Title, tabs and search share one row from `md` up. On a phone the
          // tabs take their own line under the title and search.
          <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2.5">
            <h1 className="shrink-0 font-display text-h3 font-bold tracking-tight text-foreground">
              Jobs
            </h1>
            <SubNav
              ariaLabel="Jobs sections"
              items={jobsSections}
              className="order-last w-full min-w-0 border-0 md:order-none md:w-auto"
            />
            {showListingRefine && (
              <JobsSearchField className="min-w-0 flex-1 md:ml-auto md:max-w-xs" />
            )}
          </div>
        )}
        {showListingRefine && (
          <div className="mt-3">
            <JobsRefineBar />
          </div>
        )}
      </div>
      {showCombinedFeed && <JobFeedSheet />}

      <AnimatedOutlet scope="section" context={{ embedded: true }} />
    </div>
  );
}
