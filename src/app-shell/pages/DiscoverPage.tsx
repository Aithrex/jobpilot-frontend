import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Briefcase, Globe, Loader2 } from "lucide-react";
import { SubNav, type SubNavItem } from "../SubNav";

const DISCOVER_SECTIONS: SubNavItem[] = [
  { to: "jobs", label: "Job Opportunities", icon: Briefcase },
  { to: "portals", label: "Career Portals", icon: Globe },
];

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

/**
 * "Discover" destination in the app shell (`/next/discover`). A layout route: a
 * horizontal sub-nav over deep-linkable nested sections, each mounting an
 * existing standalone tab component. Sections are lazy-loaded via the nested
 * routes in App.tsx.
 */
export default function DiscoverPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Discover</p>
        <h1 className="text-title font-display text-foreground">
          Find your next opportunity
        </h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Search roles and explore career portals.
        </p>
      </header>

      <SubNav ariaLabel="Discover sections" items={DISCOVER_SECTIONS} />

      <Suspense fallback={<SectionFallback />}>
        {/* Sections are mounted by App.tsx routes; `embedded` tells the
            monolith-born tab components the shell already renders the page
            header + SubNav, so they suppress their internal hero headers. */}
        <Outlet context={{ embedded: true }} />
      </Suspense>
    </div>
  );
}
