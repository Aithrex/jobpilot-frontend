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
vi.mock('@/components/job-search/tech-feed/TechFeedPanel', () => ({
  TechFeedPanel: () => <div data-testid="tech-feed-panel" />,
}));
vi.mock('@/components/job-search/JobCard', () => ({
  ApplyConfirmDialog: () => null,
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
    applyConfirmJob: null,
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

  test('a garbage override value falls through to the build flag', () => {
    vi.stubEnv('VITE_TECH_FEED', '1');
    window.localStorage.setItem(TECH_FEED_OVERRIDE_KEY, 'banana');
    expect(isTechFeedEnabled()).toBe(true);
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
