import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import ApplicationsTab from '@/components/resume/ApplicationsTab';
import { localDayISO } from '@/lib/applicationDates';

const listTailoringRecords = vi.fn();
const updateApplication = vi.fn();

vi.mock('@/lib/api', () => ({
  apiService: {
    listTailoringRecords: (...a: unknown[]) => listTailoringRecords(...a),
    updateApplication: (...a: unknown[]) => updateApplication(...a),
    getFunnelAnalytics: () => Promise.resolve({ data: null }),
    getStaleApplications: () => Promise.resolve({ data: null }),
    reframeRejection: () => Promise.resolve({ data: null }),
    generateIntelligenceFollowup: () => Promise.resolve({ data: null }),
    dismissIntelligenceFollowup: () => Promise.resolve({ data: null }),
  },
}));

// Gmail panel does its own network work and is irrelevant to filtering.
vi.mock('@/components/resume/GmailIntegration', () => ({ default: () => null }));

const TODAY = localDayISO();
const YESTERDAY = localDayISO(-1);
const LONG_AGO = '2026-01-05';

function record(id: string, title: string, day: string | null, status = 'applied') {
  return {
    record_id: id,
    user_email: 'u@example.com',
    jd_analysis: { job_title: title, company: 'Acme' },
    application: {
      status,
      ...(day ? { applied_date: day, applied_at: `${day}T19:00:00` } : {}),
    },
    created_at: '2026-01-01T00:00:00Z',
  };
}

function renderTab() {
  return render(
    <MemoryRouter>
      <ApplicationsTab embedded />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  updateApplication.mockResolvedValue({ data: { application: { status: 'applied' } } });
  listTailoringRecords.mockResolvedValue({
    data: {
      records: [
        record('r-today', 'Today Role', TODAY),
        record('r-yesterday', 'Yesterday Role', YESTERDAY),
        record('r-old', 'Old Role', LONG_AGO),
        record('r-draft', 'Never Applied Role', null, 'draft'),
      ],
    },
  });
});

describe('applied-date filtering', () => {
  test('Today shows only what was applied today', async () => {
    renderTab();
    await screen.findByText('Today Role');

    await userEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(screen.getByText('Today Role')).toBeInTheDocument();
    expect(screen.queryByText('Yesterday Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Old Role')).not.toBeInTheDocument();
  });

  test('a record that was never applied to is excluded from any date range', async () => {
    renderTab();
    await screen.findByText('Never Applied Role');

    await userEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));

    expect(screen.queryByText('Never Applied Role')).not.toBeInTheDocument();
  });

  test('Last 7 days includes today and yesterday but not months ago', async () => {
    renderTab();
    await screen.findByText('Old Role');

    await userEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));

    expect(screen.getByText('Today Role')).toBeInTheDocument();
    expect(screen.getByText('Yesterday Role')).toBeInTheDocument();
    expect(screen.queryByText('Old Role')).not.toBeInTheDocument();
  });

  test('the summary counts what survived the filter, and Clear restores everything', async () => {
    renderTab();
    await screen.findByText('Today Role');

    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/^1 application applied/);

    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.getByText('Old Role')).toBeInTheDocument();
    expect(screen.getByText('Never Applied Role')).toBeInTheDocument();
  });

  test('status chips narrow the board independently of the date range', async () => {
    renderTab();
    await screen.findByText('Never Applied Role');

    await userEvent.click(screen.getByRole('button', { name: /^Draft$/ }));

    expect(screen.getByText('Never Applied Role')).toBeInTheDocument();
    expect(screen.queryByText('Today Role')).not.toBeInTheDocument();
  });
});

describe('unanswered apply prompt', () => {
  test('a pending confirmation resurfaces on the card and can be answered', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [{
          ...record('r-pending', 'Pending Role', null, 'draft'),
          application: { status: 'draft', confirmation_pending: true },
        }],
      },
    });
    renderTab();

    const prompt = await screen.findByRole('group', { name: /did you apply for pending role/i });
    await userEvent.click(within(prompt).getByRole('button', { name: /yes, i applied/i }));

    await waitFor(() => expect(updateApplication).toHaveBeenCalled());
    const [, patch] = updateApplication.mock.calls[0];
    expect(patch.status).toBe('applied');
    expect(patch.confirmation_pending).toBe(false);
    expect(patch.applied_at).toBeTruthy();
  });

  test('no prompt renders when nothing is pending', async () => {
    renderTab();
    await screen.findByText('Today Role');

    expect(screen.queryByRole('group', { name: /did you apply/i })).not.toBeInTheDocument();
  });
});
