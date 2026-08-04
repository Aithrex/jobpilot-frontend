import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SubNav } from "../SubNav";
import { JOBS_SECTIONS } from "../nav.config";

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
 * "Jobs" destination (`/app/jobs`). For-you feed + career portals.
 */
export default function DiscoverPage() {
  return (
    <div className="page-measure flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Jobs</p>
        <h1 className="text-title font-display text-foreground">
          Find your next role
        </h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Browse roles picked for you and explore career portals.
        </p>
      </header>

      <SubNav ariaLabel="Jobs sections" items={JOBS_SECTIONS} />

      <Suspense fallback={<SectionFallback />}>
        {/* Sections are mounted by App.tsx routes; `embedded` tells the
            monolith-born tab components the shell already renders the page
            header + SubNav, so they suppress their internal hero headers. */}
        <Outlet context={{ embedded: true }} />
      </Suspense>
    </div>
  );
}
