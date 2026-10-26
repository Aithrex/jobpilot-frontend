import { render, screen } from '@testing-library/react';
import { Outlet } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import App from '@/App';
import { ALL_DESTINATIONS, RESUME_GROUPS } from '@/app-shell/nav.config';

vi.mock('@/pages/Landing', () => ({ default: () => <div>Landing</div> }));
vi.mock('@/contexts/AuthContext', () => ({ AuthProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/components/workspace/WorkspaceProviders', () => ({ default: () => <Outlet /> }));
vi.mock('@/app-shell/AppShell', () => ({ default: () => <Outlet /> }));
vi.mock('@/app-shell/pages/ApplicationsPage', () => ({ default: () => <Outlet /> }));
vi.mock('@/app-shell/pages/DiscoverPage', () => ({ default: () => <Outlet /> }));
vi.mock('@/app-shell/pages/CraftPage', () => ({ default: () => <Outlet /> }));
vi.mock('@/app-shell/pages/SettingsPage', () => ({ default: () => <Outlet /> }));
vi.mock('@/components/tracker/TrackerPage', () => ({ default: () => <div>Application tracker destination</div> }));
vi.mock('@/components/resume/JobOpportunitiesTab', () => ({ default: () => <div>For you destination</div> }));
vi.mock('@/app-shell/pages/craft/MyResumesPage', () => ({ default: () => <div>Resume library destination</div> }));
vi.mock('@/app-shell/settings/IntegrationsPanel', () => ({ default: () => <div>Integrations destination</div> }));
vi.mock('@/components/autoSubmit/AutoApplyTab', () => ({ default: () => <div>Hidden feature mounted</div> }));
vi.mock('@/components/resume/CareerPortalsTab', () => ({ default: () => <div>Hidden feature mounted</div> }));
vi.mock('@/components/resume/SixSecondsTab', () => ({ default: () => <div>Hidden feature mounted</div> }));
vi.mock('@/components/resume/VoiceGraphTab', () => ({ default: () => <div>Hidden feature mounted</div> }));
vi.mock('@/app-shell/settings/AutonomyPanel', () => ({ default: () => <div>Hidden feature mounted</div> }));

describe('focused product navigation', () => {
  test('paused and duplicate features are absent from all navigation surfaces', () => {
    const paths = ALL_DESTINATIONS.map((destination) => destination.href);
    for (const path of ['/app/jobs/portals', '/app/apply/auto-apply', '/app/resume/six-seconds', '/app/resume/voice', '/app/settings/autonomy']) {
      expect(paths).not.toContain(path);
    }
    expect(RESUME_GROUPS.flatMap((group) => group.items)).not.toContain('voice');
    expect(paths).toContain('/app/apply/tracker');
  });

  test.each([
    ['/app/jobs/portals', 'For you destination'],
    ['/app/apply/auto-apply', 'Application tracker destination'],
    ['/app/resume/six-seconds', 'Resume library destination'],
    ['/app/resume/voice', 'Resume library destination'],
    ['/app/settings/autonomy', 'Integrations destination'],
    ['/home?tab=career-portals', 'For you destination'],
    ['/next/applications/auto-apply', 'Application tracker destination'],
  ])('old link %s lands on an active workflow', async (path, destination) => {
    window.history.replaceState({}, '', path);
    render(<App />);
    expect(await screen.findByText(destination)).toBeInTheDocument();
    expect(screen.queryByText('Hidden feature mounted')).not.toBeInTheDocument();
  });
});
