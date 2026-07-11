import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Eye, FileCheck2, FolderOpen, Layers, Loader2, Mic, Wand2 } from "lucide-react";
import { SubNav, type SubNavItem } from "../SubNav";

const CRAFT_SECTIONS: SubNavItem[] = [
  { to: "tailor", label: "Tailor", icon: Wand2 },
  { to: "batch", label: "Batch", icon: Layers },
  { to: "my-resumes", label: "My Resumes", icon: FolderOpen },
  { to: "tailored", label: "Tailored", icon: FileCheck2 },
  { to: "six-seconds", label: "Six Seconds", icon: Eye },
  { to: "voicegraph", label: "Voice", icon: Mic },
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
 * "Craft" destination in the app shell (`/next/craft`). A layout route: a
 * horizontal sub-nav over deep-linkable nested sections. Standalone tools
 * (Batch, Six Seconds, Voice) mount directly; the monolith-embedded tools
 * (Tailor, My Resumes, Tailored) render an "Open in workspace" fallback that
 * deep-links into the classic `/app` workspace until they're extracted.
 * Sections are lazy-loaded via the nested routes in App.tsx.
 */
export default function CraftPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Craft</p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Shape your story
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tailor résumés to a role, batch-tailor a pipeline, and pressure-test
          how you read.
        </p>
      </header>

      <SubNav ariaLabel="Craft sections" items={CRAFT_SECTIONS} />

      <Suspense fallback={<SectionFallback />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
