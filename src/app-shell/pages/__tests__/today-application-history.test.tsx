import { render, screen, waitFor, within } from '@testing-library/react';
import { cloneElement, type ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import TodayPage from '../TodayPage';
import { apiService } from '@/lib/api';
import { formatCivilDay, localDayISO } from '@/lib/applicationDates';
import type { ApplicationStatus, TailoringRecord } from '@/types/resume';

vi.mock('@/lib/api', () => ({ apiService: {
  getOverview: vi.fn(), getCareerReadiness: vi.fn(), getPipelineFunnel: vi.fn(),
  getApplicationStreak: vi.fn(), getSavedJobs: vi.fn(), listTailoringRecords: vi.fn(),
} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { onboarded: true } }) }));
vi.mock('../today/TopMatchesPanel', () => ({ TopMatchesPanel: () => null }));
vi.mock('../today/ResumeEntryPanel', () => ({ ResumeEntryPanel: () => null }));
// jsdom has no measured layout; keep the real chart with deterministic dimensions.
vi.mock('recharts', async (importOriginal) => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: ({ children }: { children: ReactElement }) => cloneElement(children, { width: 600, height: 224 }),
}));

function record(id: string, application: TailoringRecord['application']): TailoringRecord {
  return {
    record_id: id, user_email: 'test@example.com', created_at: `${localDayISO(-90)}T12:00:00Z`,
    jd_analysis: { job_title: id, company: 'Example' }, application,
  };
}

describe('Home application history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiService.getOverview).mockResolvedValue({ error: 'unavailable' });
    vi.mocked(apiService.getCareerReadiness).mockResolvedValue({ error: 'unavailable' });
    vi.mocked(apiService.getPipelineFunnel).mockResolvedValue({ data: {
      stages: [], conversion: { applied_to_interview: 0, interview_to_offer: 0, applied_to_offer: 0 }, untracked_stages: [],
    } });
    // These older sources intentionally disagree: Home must not read either.
    vi.mocked(apiService.getApplicationStreak).mockResolvedValue({ data: {
      current_streak: 0, longest_streak: 0, today_count: 0, total_applications: 115,
      last_application_date: null, heatmap: [],
    } });
    vi.mocked(apiService.getSavedJobs).mockResolvedValue({ data: { jobs: [] } });
  });

  test('charts submitted dates and recent applications from the complete tracker history', async () => {
    vi.mocked(apiService.listTailoringRecords).mockResolvedValue({ data: { records: [
      record('Older application', { status: 'applied', applied_date: localDayISO(-31) }),
      record('Recently submitted', { status: 'applied', applied_date: localDayISO() }),
      record('Rejected application', { status: 'rejected', applied_date: localDayISO() }),
      record('Offer application', { status: 'offer', applied_date: localDayISO(-29) }),
      { ...record('Draft only', { status: 'draft' }), created_at: new Date().toISOString() },
      record('Undated application', { status: 'applied', updated_at: new Date().toISOString() }),
    ] } });
    render(<MemoryRouter><TodayPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh dashboard' })).toBeEnabled());

    expect(screen.getByText(/Total in window: 3\./)).toBeInTheDocument();
    expect(screen.getByText('2 recorded today')).toBeInTheDocument();
    expect(screen.getByText(/1 application has no recorded application date/)).toBeInTheDocument();
    const recent = screen.getByRole('region', { name: 'Recent applications' });
    const rows = within(recent).getAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(rows[1]).toHaveTextContent('Recently submitted');
    expect(rows[1]).toHaveTextContent(formatCivilDay(localDayISO()));
    expect(within(recent).getByRole('columnheader', { name: 'Applied' })).toBeInTheDocument();
    expect(within(recent).getByText('Rejected application')).toBeInTheDocument();
    expect(within(recent).queryByText('Draft only')).not.toBeInTheDocument();
    expect(within(recent).queryByText('Undated application')).not.toBeInTheDocument();
    expect(within(recent).getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/app/apply/tracker');
    expect(apiService.listTailoringRecords).toHaveBeenCalledWith({ view: 'list' });
    expect(apiService.listTailoringRecords).toHaveBeenCalledTimes(1);
    expect(apiService.getApplicationStreak).not.toHaveBeenCalled();
    expect(apiService.getSavedJobs).not.toHaveBeenCalled();
  });

  test('a history failure shows retry states instead of zero applications', async () => {
    vi.mocked(apiService.listTailoringRecords).mockResolvedValue({ error: 'page two failed' });
    render(<MemoryRouter><TodayPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh dashboard' })).toBeEnabled());
    expect(within(screen.getByRole('region', { name: 'Trends' })).getByRole('alert')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Recent applications' })).getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('none recorded today')).not.toBeInTheDocument();
    expect(screen.queryByText('No applications in the last 30 days')).not.toBeInTheDocument();
  });

  test('undated legacy applications stay unknown rather than becoming zero or draft creation activity', async () => {
    vi.mocked(apiService.listTailoringRecords).mockResolvedValue({ data: { records: [
      record('Missing application date', { status: 'interview' as ApplicationStatus }),
      record('Invalid application date', { status: 'applied', applied_date: '2026-02-30' }),
      record('Saved only', { status: 'saved' }),
    ] } });
    render(<MemoryRouter><TodayPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh dashboard' })).toBeEnabled());
    expect(screen.getByText(/2 applications have no recorded application date/)).toBeInTheDocument();
    expect(screen.getByText('No dated applications in the last 30 days')).toBeInTheDocument();
    expect(screen.getByText('No dated applications yet')).toBeInTheDocument();
    expect(screen.queryByText('No applications in the last 30 days')).not.toBeInTheDocument();
  });
});
