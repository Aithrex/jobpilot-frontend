/**
 * The kill switch.
 *
 * OFF (the default) must render the three legacy fan-out tabs, byte for byte
 * as today. ON must render the single unified feed instead. The localStorage
 * override is the rollback that does not need a deploy, so it has to beat the
 * build-time flag in both directions.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import CareerPortalsTab from '@/components/resume/CareerPortalsTab';
import {
  TECH_FEED_OVERRIDE_KEY,
  applyTechFeedUrlOverride,
  isTechFeedEnabled,
  setTechFeedOverride,
} from '@/lib/techFeedFlag';

// The two panels are stubbed: this file is about which one mounts, not what
// either of them renders.
vi.mock('@/components/job-search/WorkdayJobsPanel', () => ({
  WorkdayJobsPanel: ({ variant }: { variant: string }) => (
    <div data-testid={`legacy-panel-${variant}`} />
  ),
}));
// The feed panel is stubbed but RECORDS its props: this file also guards the
// wiring, because a branch that renders the feed and drops every handler is a
// working search on top of a dead-end card.
const harness = vi.hoisted(() => ({
  feedProps: null as Record<string, unknown> | null,
  applyConfirmJob: null as { job_id: string; title: string } | null,
}));

vi.mock('@/components/job-search/tech-feed/TechFeedPanel', () => ({
  TechFeedPanel: (props: Record<string, unknown>) => {
    harness.feedProps = props;
    return <div data-testid="tech-feed-panel" />;
  },
}));
vi.mock('@/components/job-search/JobCard', () => ({
  ApplyConfirmDialog: ({ job }: { job: { title: string } | null }) =>
    job ? <div data-testid="apply-confirm-dialog">{job.title}</div> : null,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'tester@example.com' }, isAdmin: false }),
}));
vi.mock('@/hooks/useJobSearch', () => ({
  useJobSearch: () => ({
    isJobSaved: () => false,
    getJobStatus: () => undefined,
    saveJob: vi.fn(),
    unsaveJob: vi.fn(),
    quickApply: vi.fn(),
    isApplyConfirmPending: () => false,
    confirmApplied: vi.fn(),
    dismissApplyConfirm: vi.fn(),
    applyConfirmJob: harness.applyConfirmJob,
    closeApplyConfirmDialog: vi.fn(),
    beginApplyWithTailor: vi.fn(),
    markAlreadyApplied: vi.fn(),
    autoApply: vi.fn(),
    autoApplyingId: null,
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  vi.unstubAllEnvs();
  window.history.replaceState({}, '', '/app/jobs/portals');
  harness.feedProps = null;
  harness.applyConfirmJob = null;
});

describe('tech feed flag resolution', () => {
  test('unset everywhere is OFF', () => {
    expect(isTechFeedEnabled()).toBe(false);
  });

  test('the build flag turns it on', () => {
    vi.stubEnv('VITE_TECH_FEED', '1');
    expect(isTechFeedEnabled()).toBe(true);
  });

  test('the localStorage override beats the build flag in both directions', () => {
    vi.stubEnv('VITE_TECH_FEED', '1');
    setTechFeedOverride(false);
    expect(isTechFeedEnabled()).toBe(false);

    vi.stubEnv('VITE_TECH_FEED', 'off');
    setTechFeedOverride(true);
    expect(isTechFeedEnabled()).toBe(true);

    setTechFeedOverride(null);
    expect(window.localStorage.getItem(TECH_FEED_OVERRIDE_KEY)).toBeNull();
    expect(isTechFeedEnabled()).toBe(false);
  });

  test('admin audience turns the feed on without the build flag', () => {
    expect(isTechFeedEnabled({ isAdmin: true })).toBe(true);
  });

  test('beta percentage is sticky per email', () => {
    vi.stubEnv('VITE_TECH_FEED_BETA_PCT', '100');
    expect(isTechFeedEnabled({ email: 'beta@example.com' })).toBe(true);
    vi.stubEnv('VITE_TECH_FEED_BETA_PCT', '0');
    expect(isTechFeedEnabled({ email: 'beta@example.com' })).toBe(false);
  });

  test('a garbage override value falls through to the build flag', () => {
    vi.stubEnv('VITE_TECH_FEED', '1');
    window.localStorage.setItem(TECH_FEED_OVERRIDE_KEY, 'banana');
    expect(isTechFeedEnabled()).toBe(true);
  });
});

describe('staged rollout by link', () => {
  test('?techfeed=1 turns the feed on for this browser and persists the choice', () => {
    window.history.replaceState({}, '', '/app/jobs/portals?techfeed=1');

    expect(isTechFeedEnabled()).toBe(true);
    // Persisted, so the rest of the session (and every later navigation
    // without the parameter) keeps the same answer without a rebuild.
    expect(window.localStorage.getItem(TECH_FEED_OVERRIDE_KEY)).toBe('1');

    window.history.replaceState({}, '', '/app/jobs/portals');
    expect(isTechFeedEnabled()).toBe(true);
  });

  test('?techfeed=0 is an equally shareable rollback, even against the build flag', () => {
    vi.stubEnv('VITE_TECH_FEED', '1');
    window.history.replaceState({}, '', '/app/jobs/portals?techfeed=0');

    expect(isTechFeedEnabled()).toBe(false);
    expect(window.localStorage.getItem(TECH_FEED_OVERRIDE_KEY)).toBe('0');
  });

  test('the link beats a localStorage override set earlier', () => {
    setTechFeedOverride(false);
    window.history.replaceState({}, '', '/app/jobs/portals?techfeed=on');
    expect(isTechFeedEnabled()).toBe(true);
  });

  test('a typo in the link changes nothing at all', () => {
    setTechFeedOverride(true);
    expect(applyTechFeedUrlOverride('?techfeed=maybe')).toBeNull();
    // Not read as "off": a mistyped rollout link must not roll anyone back.
    expect(isTechFeedEnabled()).toBe(true);
    expect(window.localStorage.getItem(TECH_FEED_OVERRIDE_KEY)).toBe('1');
  });

  test('no parameter means no opinion', () => {
    expect(applyTechFeedUrlOverride('?q=golang')).toBeNull();
    expect(window.localStorage.getItem(TECH_FEED_OVERRIDE_KEY)).toBeNull();
  });
});

describe('Career portals mount point', () => {
  test('flag OFF renders the three legacy catalogs, untouched', () => {
    render(<CareerPortalsTab />);

    expect(screen.getByTestId('legacy-panel-workday')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Enterprise \(Workday\)/ })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Startups & scale-ups \(career pages\)/ }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('tech-feed-panel')).not.toBeInTheDocument();
  });

  test('flag ON renders the unified feed instead of the three tabs', async () => {
    setTechFeedOverride(true);
    render(<CareerPortalsTab />);

    // The feed is lazy so the OFF path never pays for its bundle.
    expect(await screen.findByTestId('tech-feed-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-panel-workday')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Enterprise \(Workday\)/ })).not.toBeInTheDocument();
  });
});

describe('the tech feed branch is wired, not just rendered', () => {
  test('every job flow reaches the feed panel', async () => {
    setTechFeedOverride(true);
    render(<CareerPortalsTab />);
    await screen.findByTestId('tech-feed-panel');

    // Save / apply-confirm / tailor / tracker / auto-apply, same instances the
    // legacy branch uses - one saved-jobs store behind both surfaces.
    for (const prop of [
      'isJobSaved',
      'getJobStatus',
      'saveJob',
      'unsaveJob',
      'quickApply',
      'beginApplyWithTailor',
      'autoApply',
      'isApplyConfirmPending',
      'confirmApplied',
      'dismissApplyConfirm',
    ]) {
      expect(typeof harness.feedProps?.[prop]).toBe('function');
    }
  });

  test('the did-you-apply dialog renders on the feed branch too', async () => {
    harness.applyConfirmJob = { job_id: 'job-1', title: 'Senior Backend Engineer' };
    setTechFeedOverride(true);
    render(<CareerPortalsTab />);

    await screen.findByTestId('tech-feed-panel');
    expect(screen.getByTestId('apply-confirm-dialog')).toHaveTextContent(
      'Senior Backend Engineer',
    );
    expect(harness.feedProps?.applyConfirmJobId).toBe('job-1');
  });

  test('the legacy branch keeps the same dialog', () => {
    harness.applyConfirmJob = { job_id: 'job-1', title: 'Senior Backend Engineer' };
    render(<CareerPortalsTab />);

    expect(screen.getByTestId('legacy-panel-workday')).toBeInTheDocument();
    expect(screen.getByTestId('apply-confirm-dialog')).toBeInTheDocument();
  });
});
