/**
 * Home must not flash the empty first-run layout while dashboard data is
 * still loading. That swap dropped Continue workspace setup for anyone who
 * had not finished onboarding but already had applications or matches.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi, beforeEach, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import TodayPage, { shouldShowFirstRunHome } from '@/app-shell/pages/TodayPage';

vi.mock('@/lib/api', () => ({
  apiService: {
    getOverview: vi.fn(),
    getCareerReadiness: vi.fn(),
    listTailoringRecords: vi.fn(),
    getPipelineFunnel: vi.fn(),
    getTodayInbox: vi.fn(),
  },
}));

const auth = { onboarded: false as boolean | undefined };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { email: 'la@example.com', name: 'Lavanya', onboarded: auth.onboarded },
  }),
}));

vi.mock('@/app-shell/pages/today/TopMatchesPanel', () => ({
  TopMatchesPanel: () => <div data-testid="top-matches" />,
}));

vi.mock('@/app-shell/pages/today/ResumeEntryPanel', () => ({
  ResumeEntryPanel: () => <div data-testid="resume-entry" />,
}));

const api = apiService as unknown as Record<string, Mock>;

function overview(total: number) {
  return {
    data: {
      applications: { total, by_status: {}, active: 0, interviewing: 0, offers: 0, stale: 0, interview_prep_count: 0 },
      resume: { has_base: true, tailored_count: 0 },
      jobs: { saved: 0 },
      learning: { active_paths: 0, modules_completed: 0, earned_skills: [], earned_skills_count: 0, in_progress: [] },
      interview: { attempts: 0, avg_score: null, weakest: null, top_weak_spots: [] },
      events: { saved: 0, registered: 0, attended: 0, won: 0, upcoming_verified: 0 },
      skills: { have_count: 0, top_gaps: [] },
      momentum: { tailors_today: 0, tailor_limit: null, tailors_remaining: null },
    },
    status: 200,
  };
}

function history(total: number) {
  return {
    data: {
      records: Array.from({ length: total }, (_, i) => ({
        record_id: `record-${i}`, user_email: 'test@example.com',
        created_at: '2026-01-01T12:00:00Z', application: { status: 'draft' },
      })),
    },
    status: 200,
  };
}

function hang() {
  return new Promise(() => {});
}

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('shouldShowFirstRunHome', () => {
  test('never during loading, even if onboarding is unfinished', () => {
    expect(shouldShowFirstRunHome({
      onboarded: false, settled: false, applicationCount: 0, countsUnknown: false,
    })).toBe(false);
  });

  test('empty settled workspace with unfinished onboarding', () => {
    expect(shouldShowFirstRunHome({
      onboarded: false, settled: true, applicationCount: 0, countsUnknown: false,
    })).toBe(true);
  });

  test('does not replace a live dashboard when the user already has applications', () => {
    expect(shouldShowFirstRunHome({
      onboarded: false, settled: true, applicationCount: 7, countsUnknown: false,
    })).toBe(false);
  });

  test('does not treat a fetch failure as an empty workspace', () => {
    expect(shouldShowFirstRunHome({
      onboarded: false, settled: true, applicationCount: 0, countsUnknown: true,
    })).toBe(false);
  });
});

describe('TodayPage first-run vs live dashboard', () => {
  beforeEach(() => {
    auth.onboarded = false;
    api.getCareerReadiness.mockResolvedValue({ error: 'x' });
    api.getPipelineFunnel.mockResolvedValue({ error: 'x' });
    api.getTodayInbox.mockResolvedValue({ error: 'x' });
  });

  test('while loading, keeps the dashboard layout and Continue workspace setup', () => {
    api.getOverview.mockImplementation(hang);
    api.listTailoringRecords.mockImplementation(hang);
    renderHome();
    expect(screen.getByRole('button', { name: /refresh dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue workspace setup/i })).toBeInTheDocument();
    expect(screen.queryByText(/this home fills in/i)).not.toBeInTheDocument();
  });

  test('after load, a workspace with applications keeps Continue workspace setup', async () => {
    api.getOverview.mockResolvedValue(overview(7));
    api.listTailoringRecords.mockResolvedValue(history(7));
    renderHome();
    expect(await screen.findByRole('button', { name: /refresh dashboard/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /continue workspace setup/i })).toBeInTheDocument();
    expect(screen.queryByText(/this home fills in/i)).not.toBeInTheDocument();
  });

  test('the Today-inbox hero is gone from Home', async () => {
    // The "needs your input" / "items need you today" block was removed from
    // the dashboard; its fetch must not run on load either.
    api.getOverview.mockResolvedValue(overview(7));
    api.listTailoringRecords.mockResolvedValue(history(7));
    renderHome();
    expect(await screen.findByRole('button', { name: /refresh dashboard/i })).toBeEnabled();
    expect(screen.queryByText(/needs your input/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/need you today/i)).not.toBeInTheDocument();
    // The now-unneeded Today-inbox fetch is no longer wired on Home.
    expect(api.getTodayInbox).not.toHaveBeenCalled();
  });

  test('after load, a truly empty unfinished workspace still gets the focused setup home', async () => {
    api.getOverview.mockResolvedValue(overview(0));
    api.listTailoringRecords.mockResolvedValue(history(0));
    renderHome();
    await waitFor(() => {
      expect(screen.getByText(/this home fills in/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /continue workspace setup/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /refresh dashboard/i })).not.toBeInTheDocument();
  });
});
