import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Eye, FileCheck2, FolderOpen, Layers, Loader2, Mic, Wand2 } from "lucide-react";
import { SubNav, type SubNavItem } from "../SubNav";

const CRAFT_SECTIONS: SubNavItem[] = [
  { to: "tailor", label: "Tailor", icon: Wand2 },
  { to: "batch", label: "Batch", icon: Layers },
  { to: "library", label: "Library", icon: FolderOpen },
  { to: "tailored", label: "Tailored", icon: FileCheck2 },
  { to: "six-seconds", label: "Six Seconds", icon: Eye },
  { to: "voice", label: "Voice", icon: Mic },
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
 * "Resume" destination (`/app/resume`). Tailor, library, and review tools.
 */
export default function CraftPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="overline mb-1">Resume</p>
        <h1 className="text-title font-display text-foreground">
          Shape your story
        </h1>
        <p className="mt-1 text-caption text-muted-foreground">
          Tailor resumes to a role, batch-tailor a pipeline, and pressure-test
          how you read.
        </p>
      </header>

      <SubNav ariaLabel="Resume sections" items={CRAFT_SECTIONS} />

      <Suspense fallback={<SectionFallback />}>
        {/* Sections are mounted by App.tsx routes; `embedded` tells the
            monolith-born tab components the shell already renders the page
            header + SubNav, so they suppress their internal hero headers. */}
        <Outlet context={{ embedded: true }} />
      </Suspense>
    </div>
  );
}
