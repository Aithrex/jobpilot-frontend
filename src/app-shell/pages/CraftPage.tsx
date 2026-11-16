import { SubNav } from "../SubNav";
import { RESUME_SECTIONS } from "../nav.config";
import { AnimatedOutlet } from "../AnimatedOutlet";
import { ResumeWorkspaceProvider } from "./craft/ResumeWorkspaceContext";

/**
 * "Resume" destination (`/app/resume`).
 *
 * One header and one tab strip, the same shape as Jobs, Tracker and Grow, so
 * the app has a single way of moving around a destination. The earlier design
 * was a three-column workspace: a dock of links on the left, an overview in
 * the middle and a column of counters on the right. It described the section
 * (resume health, streak, library counts) instead of doing its job, and the
 * one thing people come here for, tailoring a resume to a posting, was a
 * small row in a menu. `/app/resume` now opens on that tool.
 *
 *   `.surface-studio`  re-points the semantic tokens for the whole subtree,
 *                      so every shadcn primitive inside Resume follows.
 *   `.studio-canvas`   the page background, full width.
 *
 * The provider keeps one read of the base resumes and the latest tailored
 * versions for whichever section wants them (Tailor shows both).
 */
export default function CraftPage() {
  return (
    <ResumeWorkspaceProvider>
      <div className="surface-studio studio-canvas page-full flex min-h-[calc(100vh-4rem)] flex-col gap-4">
        <header>
          <h1 className="text-title font-display text-foreground">Resume</h1>
        </header>

        <SubNav ariaLabel="Resume sections" items={RESUME_SECTIONS} />

        <AnimatedOutlet scope="section" context={{ embedded: true }} />
      </div>
    </ResumeWorkspaceProvider>
  );
}
