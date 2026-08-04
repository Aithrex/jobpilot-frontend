import { Suspense } from "react";
import { Outlet, useMatch } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ResumeNav } from "./craft/ResumeNav";
import { ResumeOverviewPanel } from "./craft/ResumeOverviewPanel";
import {
  ResumeWorkspaceProvider,
  useResumeWorkspaceContext,
} from "./craft/ResumeWorkspaceContext";
import { navHref } from "../nav.config";

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
 * The Resume Studio workspace.
 *
 * Composition, outermost first:
 *   1. `.surface-studio`  re-points the semantic tokens to the indigo palette
 *                         for this whole subtree, so every shadcn primitive
 *                         inside Resume follows without a `dark:` variant.
 *   2. `.studio-canvas`   page atmosphere - indigo wash, never a flat sheet.
 *                         Runs the full width of the viewport.
 *   3. the three columns  sitting directly ON that canvas. No wrapper pane: an
 *                         earlier pass drew the workspace as a bordered glass
 *                         rectangle, which boxed the content in and held it
 *                         away from the screen edges instead of using them.
 *   4. solid `bg-card`    the content surfaces, opaque and readable.
 *
 * The columns encode a hierarchy of intent: left = places you can GO (frosted
 * dock, chevrons, active indicator), centre = things to READ (solid, plainest
 * on purpose), right = where you STAND (streak, counts, quota). Keeping the
 * centre visually quietest is what lets the dock read as interactive.
 *
 * Note there is no header action button and no tool tiles: both duplicated
 * dock rows, so the dock is the single place tools are launched from.
 */
function CraftWorkspace() {
  // Hooks must run unconditionally and in a stable order - resolve the match
  // up here, not inline in the JSX.
  const atOverview = useMatch({ path: navHref("resume"), end: true }) !== null;
  const data = useResumeWorkspaceContext();

  return (
    <div className="surface-studio studio-canvas page-full min-h-[calc(100vh-4rem)]">
      <header className="mb-5">
        <p className="overline mb-1">Resume</p>
        <h1 className="text-title font-display text-foreground">Shape your story</h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Create stronger resumes for every opportunity.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Left: contextual function dock (destinations). */}
        <ResumeNav data={data} />

        {/* Centre: primary content, the widest column. */}
        <div className="min-w-0 flex-1">
          <Suspense fallback={<SectionFallback />}>
            {/* Sections are mounted by App.tsx routes; `embedded` tells the
                monolith-born tab components the shell already renders the
                page header + navigation, so they suppress their internal
                heroes. The overview is shell-native and ignores it. */}
            <Outlet context={{ embedded: true }} />
          </Suspense>
        </div>

        {/* Right: account state. Only on the overview - inside a tool the
            column would compete with the work for attention. Stacks under
            the centre column until there is room for a third. */}
        {atOverview && (
          <ResumeOverviewPanel className="w-full shrink-0 xl:sticky xl:top-24 xl:w-[17rem] xl:self-start" />
        )}
      </div>
    </div>
  );
}

/**
 * "Resume" destination (`/app/resume`) - the Resume workspace shell.
 *
 * Replaces the horizontal sub-tab strip that used to sit under the page
 * header: six terse labels in a second nav row read as navigation inside
 * navigation, competing with the primary top bar. Navigation now lives in a
 * contextual left dock grouped by intent (Create / Manage / Insights) which
 * collapses to a sheet below `lg` rather than being squeezed horizontally.
 *
 * `/app/resume` renders the workspace overview instead of bouncing to Tailor.
 * Every child route and deep link is unchanged.
 */
export default function CraftPage() {
  return (
    <ResumeWorkspaceProvider>
      <CraftWorkspace />
    </ResumeWorkspaceProvider>
  );
}
