import { Outlet } from 'react-router-dom';
import { FeedbackProvider } from '@/components/feedback/FeedbackWidget';
import { UpgradeModalProvider } from '@/components/billing/UpgradeModalProvider';
import { CombinedJobsProvider } from '@/components/job-search/CombinedJobsProvider';

/**
 * The authenticated workspace's provider stack, scoped to the routes that
 * actually use it (`/app` and `/next/*`) instead of the whole app.
 *
 * These three providers were previously mounted at the App root, which meant
 * the public landing at `/` - the LCP surface, and the only eager route  - 
 * shipped billing UI (`UpgradeModalProvider`: ui/dialog + lib/entitlements),
 * the feedback dialog (ui/dialog + ui/textarea) and the entire combined-jobs
 * controller (`useCombinedJobs` + `useAutoSync` + lib/careerJobs + types/jobs)
 * in its initial payload for code no guest can ever reach.
 *
 * This module is `lazy()`-imported from App.tsx, so Rollup splits all of that
 * out of the entry chunk. It is mounted as a PATHLESS LAYOUT ROUTE above both
 * workspace routes rather than duplicated on each, so the provider instances
 * (and therefore the in-flight combined-jobs scan + its 30-min auto-sync)
 * survive navigating between `/app` and `/next/*` exactly as before.
 *
 * Consumer safety:
 *  - `useFeedback()` / `useUpgrade()` already return safe no-op fallbacks
 *  outside their provider, so surfaces rendered off these routes degrade
 *  rather than crash.
 *  - `useCombinedJobsCtx()` throws by design; every one of its consumers
 *  (CommandPalette, JobOpportunitiesTab, CombinedJobsPanel) is reachable
 *  only from `/app` or `/next/*`, i.e. inside this boundary.
 *  - The shared job-title set is `hooks/useJobTitles`, a module-level
 *  `useSyncExternalStore` store with no mounting contract - Careers and
 *  Opportunities read the same module regardless of where (or whether)
 *  this provider is mounted, so title sharing is unaffected.
 */
export default function WorkspaceProviders() {
  return (
  <UpgradeModalProvider>
  <FeedbackProvider>
  <CombinedJobsProvider>
  <Outlet />
  </CombinedJobsProvider>
  </FeedbackProvider>
  </UpgradeModalProvider>
  );
}
