/**
 * Route-scoping guard for the workspace provider stack.
 *
 * The landing at `/` is the LCP surface and the only EAGER route, so anything
 * mounted above the router outlet ships in the entry chunk. `UpgradeModalProvider`
 * (billing UI + lib/entitlements), `FeedbackProvider` (ui/dialog + ui/textarea)
 * and `CombinedJobsProvider` (the whole combined-jobs controller) used to sit at
 * the App root, so the marketing page paid for all three. They now mount only
 * under the pathless layout route wrapping `/app` and `/next/*`.
 *
 * These tests assert the observable contract in both directions: NOT mounted on
 * `/`, and still mounted on the workspace routes. If someone hoists one back to
 * the App root, the first test fails.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

// Each provider is replaced by a marker that renders its children untouched, so
// "did this provider mount?" becomes a DOM query. Landing / ResumeParser /
// AppShell are stubbed too: this test is about provider placement, not page
// content, and stubbing keeps it fast and independent of those trees.
vi.mock('@/components/billing/UpgradeModalProvider', () => ({
  UpgradeModalProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="provider-upgrade">{children}</div>
  ),
  useUpgrade: () => ({ open: () => undefined }),
}));

vi.mock('@/components/feedback/FeedbackWidget', () => ({
  FeedbackProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="provider-feedback">{children}</div>
  ),
  useFeedback: () => ({ open: () => undefined }),
}));

vi.mock('@/components/job-search/CombinedJobsProvider', () => ({
  CombinedJobsProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="provider-combined-jobs">{children}</div>
  ),
  useCombinedJobsCtx: () => ({}),
}));

vi.mock('@/pages/Landing', () => ({
  default: () => <div data-testid="page-landing">landing</div>,
}));

vi.mock('@/pages/ResumeParser', () => ({
  default: () => <div data-testid="page-resume-parser">workspace</div>,
}));

vi.mock('@/components/onboarding/OnboardingWizard', () => ({ default: () => null }));

vi.mock('@/app-shell/AppShell', () => ({
  default: () => <div data-testid="page-app-shell">app shell</div>,
}));

// AuthContext is not the subject here; a stable unauthenticated stub keeps the
// render deterministic and offline.
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null, isAuthenticated: false, refreshProfile: () => undefined }),
}));

const PROVIDER_TESTIDS = ['provider-upgrade', 'provider-feedback', 'provider-combined-jobs'];

async function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  const { default: App } = await import('@/App');
  return render(<App />);
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('workspace provider route-scoping', () => {
  it('does NOT mount the workspace providers on the landing route', async () => {
    await renderAppAt('/');

    // The landing itself rendered...
    expect(await screen.findByTestId('page-landing')).toBeInTheDocument();

    // ...and stays settled long enough that a lazy provider stack would have
    // resolved and appeared if one were still wrapping the tree.
    await waitFor(() => expect(screen.getByTestId('page-landing')).toBeInTheDocument());

    for (const testId of PROVIDER_TESTIDS) {
      expect(screen.queryByTestId(testId)).toBeNull();
    }
  });

  it('mounts all three workspace providers on /app', async () => {
    await renderAppAt('/app');

    expect(await screen.findByTestId('page-resume-parser')).toBeInTheDocument();
    for (const testId of PROVIDER_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  });

  it('mounts all three workspace providers on /next', async () => {
    await renderAppAt('/next/today');

    expect(await screen.findByTestId('page-app-shell')).toBeInTheDocument();
    for (const testId of PROVIDER_TESTIDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    }
  });
});
