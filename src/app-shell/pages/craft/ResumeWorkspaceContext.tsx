import { createContext, useContext, type ReactNode } from "react";
import { useResumeWorkspace, type ResumeWorkspaceData } from "./useResumeWorkspace";

const ResumeWorkspaceContext = createContext<ResumeWorkspaceData | null>(null);

/**
 * Provides the Resume workspace's shared read model.
 *
 * The dock's health panel and the centre overview describe the same two facts
 * (is there an active resume, what has been tailored). Fetching in each would
 * double the requests and let the two disagree mid-flight, so the shell owns
 * one fetch and both read from it.
 */
export function ResumeWorkspaceProvider({ children }: { children: ReactNode }) {
  const data = useResumeWorkspace();
  return (
    <ResumeWorkspaceContext.Provider value={data}>{children}</ResumeWorkspaceContext.Provider>
  );
}

export function useResumeWorkspaceContext(): ResumeWorkspaceData {
  const ctx = useContext(ResumeWorkspaceContext);
  if (!ctx) {
    throw new Error("useResumeWorkspaceContext must be used inside <ResumeWorkspaceProvider>");
  }
  return ctx;
}
