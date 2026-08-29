import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import TrackerPage from '@/components/tracker/TrackerPage';
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

// The Gmail panel does its own network work and is irrelevant here.
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

function renderTracker() {
  return render(
    <MemoryRouter>
      <TrackerPage />
    </MemoryRouter>,
  );
}

/** Filters live behind popovers now, so a test has to open one first. */
async function openDateFilter(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Filter by applied date' }));
}

async function pickDatePreset(user: ReturnType<typeof userEvent.setup>, label: string) {
  await openDateFilter(user);
  await user.click(await screen.findByRole('radio', { name: label }));
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
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Today Role');

    await pickDatePreset(user, 'Today');

    expect(screen.getByText('Today Role')).toBeInTheDocument();
    expect(screen.queryByText('Yesterday Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Old Role')).not.toBeInTheDocument();
  });

  test('a record that was never applied to is excluded from any date range', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Never Applied Role');

    await pickDatePreset(user, 'Last 30 days');

    expect(screen.queryByText('Never Applied Role')).not.toBeInTheDocument();
  });

  test('Last 7 days includes today and yesterday but not months ago', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');

    await pickDatePreset(user, 'Last 7 days');

    expect(screen.getByText('Today Role')).toBeInTheDocument();
    expect(screen.getByText('Yesterday Role')).toBeInTheDocument();
    expect(screen.queryByText('Old Role')).not.toBeInTheDocument();
  });

  test('the summary counts what survived, and Clear restores everything', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Today Role');

    await pickDatePreset(user, 'Today');
    expect(await screen.findByRole('status')).toHaveTextContent(/^1 application applied/);

    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.getByText('Old Role')).toBeInTheDocument();
    expect(screen.getByText('Never Applied Role')).toBeInTheDocument();
  });
});

describe('stage filtering', () => {
  test('a stage filter narrows the list independently of the date range', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Never Applied Role');

    await user.click(screen.getByRole('button', { name: 'Filter by stage' }));
    await user.click(await screen.findByRole('checkbox', { name: /Draft/ }));

    expect(screen.getByText('Never Applied Role')).toBeInTheDocument();
    expect(screen.queryByText('Today Role')).not.toBeInTheDocument();
  });
});

describe('sections', () => {
  test('the three terminal statuses share one collapsed Closed section', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          record('r-rejected', 'Rejected Role', LONG_AGO, 'rejected'),
          record('r-ghosted', 'Ghosted Role', LONG_AGO, 'ghosted'),
          record('r-withdrawn', 'Withdrawn Role', LONG_AGO, 'withdrawn'),
        ],
      },
    });
    const user = userEvent.setup();
    renderTracker();

    const closed = await screen.findByRole('button', { name: /^Closed 3$/ });
    // History starts out of the way.
    expect(closed).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Rejected Role')).not.toBeInTheDocument();

    await user.click(closed);

    // Merged into one section, so each row has to say which status it is.
    expect(screen.getByText('Rejected Role')).toBeInTheDocument();
    expect(screen.getByText('Ghosted')).toBeInTheDocument();
    expect(screen.getByText('Withdrawn')).toBeInTheDocument();
  });

  test('grouping by applied date buckets the list by civil day', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Today Role');

    await user.click(screen.getByRole('combobox', { name: 'Group applications by' }));
    await user.click(await screen.findByRole('option', { name: 'Group: Applied date' }));

    // Everything that was never applied to collects under its own heading
    // rather than disappearing.
    expect(await screen.findByRole('button', { name: /^Not applied 1$/ })).toBeInTheDocument();
  });
});

describe('unanswered apply prompt', () => {
  test('a pending confirmation resurfaces on the row and can be answered', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          {
            ...record('r-pending', 'Pending Role', null, 'draft'),
            application: { status: 'draft', confirmation_pending: true },
          },
        ],
      },
    });
    const user = userEvent.setup();
    renderTracker();

    const prompt = await screen.findByRole('group', { name: /did you apply\? pending role/i });
    await user.click(within(prompt).getByRole('button', { name: /yes, i applied/i }));

    await waitFor(() => expect(updateApplication).toHaveBeenCalled());
    const [, patch] = updateApplication.mock.calls[0];
    expect(patch.status).toBe('applied');
    expect(patch.confirmation_pending).toBe(false);
    expect(patch.applied_at).toBeTruthy();
  });

  test('the legacy batch-only flag still raises the prompt', async () => {
    // BatchTailor writes only `batch_confirmation_pending`. Reading just the
    // canonical name would silently swallow every batch-tailored prompt.
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          {
            ...record('r-batch', 'Batch Role', null, 'draft'),
            application: { status: 'draft', batch_confirmation_pending: true },
          },
        ],
      },
    });
    renderTracker();

    expect(
      await screen.findByRole('group', { name: /did you apply\? batch role/i }),
    ).toBeInTheDocument();
  });

  test('no prompt renders when nothing is pending', async () => {
    renderTracker();
    await screen.findByText('Today Role');

    expect(screen.queryByRole('group', { name: /did you apply/i })).not.toBeInTheDocument();
  });
});
