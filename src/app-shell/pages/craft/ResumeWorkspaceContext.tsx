import { createContext, useContext, type ReactNode } from "react";
import { useResumeWorkspace, type ResumeWorkspaceData } from "./useResumeWorkspace";

const ResumeWorkspaceContext = createContext<ResumeWorkspaceData | null>(null);

/**
 * Provides the Resume workspace's shared read model.
 *
 * One read of the base resumes and the newest tailored versions, owned by the
 * shell so every section that shows them agrees and none fetches twice.
 */
export function ResumeWorkspaceProvider({ children }: { children: ReactNode }) {
  const data = useResumeWorkspace();
  return (
    <ResumeWorkspaceContext.Provider value={data}>{children}</ResumeWorkspaceContext.Provider>
  );
}

/** The shared read model, or null outside the Resume shell (a tool mounted on
 *  its own, as in tests, simply shows nothing that depends on it). */
export function useOptionalResumeWorkspace(): ResumeWorkspaceData | null {
  return useContext(ResumeWorkspaceContext);
}

export function useResumeWorkspaceContext(): ResumeWorkspaceData {
  const ctx = useContext(ResumeWorkspaceContext);
  if (!ctx) {
    throw new Error("useResumeWorkspaceContext must be used inside <ResumeWorkspaceProvider>");
  }
  return ctx;
}
