import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import TrackerPage from '@/components/tracker/TrackerPage';
import { formatCivilDay, localDayISO } from '@/lib/applicationDates';

const listTailoringRecords = vi.fn();
const getTailoringRecord = vi.fn();
const updateApplication = vi.fn();
const listGmailSuggestions = vi.fn();
const applyGmailSuggestion = vi.fn();
const dismissGmailSuggestion = vi.fn();

vi.mock('@/lib/api', () => ({
  apiService: {
    listTailoringRecords: (...a: unknown[]) => listTailoringRecords(...a),
    getTailoringRecord: (...a: unknown[]) => getTailoringRecord(...a),
    updateApplication: (...a: unknown[]) => updateApplication(...a),
    listGmailSuggestions: (...a: unknown[]) => listGmailSuggestions(...a),
    applyGmailSuggestion: (...a: unknown[]) => applyGmailSuggestion(...a),
    dismissGmailSuggestion: (...a: unknown[]) => dismissGmailSuggestion(...a),
    getFunnelAnalytics: () => Promise.resolve({ data: null }),
    getStaleApplications: () => Promise.resolve({ data: null }),
    reframeRejection: () => Promise.resolve({ data: null }),
    generateIntelligenceFollowup: () => Promise.resolve({ data: null }),
    dismissIntelligenceFollowup: () => Promise.resolve({ data: null }),
  },
}));

// The Gmail connect/sync panel does its own network work and lives in the
// Insights sheet; the suggestion queue it feeds is exercised directly.
vi.mock('@/components/resume/GmailIntegration', () => ({
  default: () => <button>Connect Gmail</button>,
}));

const TODAY = localDayISO();
const YESTERDAY = localDayISO(-1);
const LONG_AGO = '2026-01-05';

type App = Record<string, unknown>;

function record(id: string, title: string, day: string | null, status = 'applied', app: App = {}) {
  return {
    record_id: id,
    user_email: 'u@example.com',
    jd_analysis: { job_title: title, company: 'Acme' },
    application: {
      status,
      ...(day ? { applied_date: day, applied_at: `${day}T19:00:00` } : {}),
      ...app,
    },
    created_at: '2026-01-01T00:00:00Z',
  };
}

/** An ISO instant `days` from now, for next_action_date fixtures. */
function inDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function renderTracker() {
  return render(
    <MemoryRouter>
      <TrackerPage />
    </MemoryRouter>,
  );
}

/**
 * The tracker's layout is viewport-driven and the global matchMedia stand-in
 * answers false to everything, which would run every test in the phone layout.
 * Pin a viewport instead: `desktop` is wide enough for the spine rail and has a
 * mouse, so stage drop targets exist.
 */
function setViewport(kind: 'desktop' | 'phone') {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: kind === 'desktop' && /min-width|hover: hover|pointer: fine/.test(query),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

const scopeButton = (name: 'Focus' | 'Active' | 'All') =>
  screen.getByRole('radio', { name: new RegExp(`^${name}`) });

/** Most assertions are about the pipeline, which lives behind the All scope. */
async function showAll(user: ReturnType<typeof userEvent.setup>) {
  await user.click(scopeButton('All'));
}

async function pickDatePreset(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: 'Filter by applied date' }));
  await user.click(await screen.findByRole('radio', { name: label }));
}

beforeEach(() => {
  vi.clearAllMocks();
  setViewport('desktop');
  updateApplication.mockResolvedValue({ data: { application: { status: 'applied' } } });
  getTailoringRecord.mockResolvedValue({ data: { record: {} } });
  listGmailSuggestions.mockResolvedValue({ data: { suggestions: [] } });
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

describe('scopes', () => {
  test('Gmail remains available when the tracker is empty', async () => {
    listTailoringRecords.mockResolvedValue({ data: { records: [] } });
    renderTracker();
    await screen.findByText('No applications yet');
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeInTheDocument();
  });

  test('rejected summary opens the closed records instead of the active scope', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          record('r-live', 'Live Role', TODAY),
          record('r-dead', 'Rejected Role', LONG_AGO, 'rejected'),
        ],
      },
    });
    const user = userEvent.setup();
    renderTracker();
    await user.click(await screen.findByRole('button', { name: 'Rejected 1' }));
    expect(scopeButton('All')).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText('Live Role')).not.toBeInTheDocument();
    expect(screen.getByText('Rejected Role')).toBeInTheDocument();
  });
  test('the tracker opens on Focus, not on everything', async () => {
    renderTracker();

    // Old Role went quiet months ago; the rest are recent and want nothing.
    expect(await screen.findByText('Old Role')).toBeInTheDocument();
    expect(screen.queryByText('Today Role')).not.toBeInTheDocument();
    expect(scopeButton('Focus')).toHaveAttribute('aria-checked', 'true');
  });

  test('the counts describe each scope, not the current filter', async () => {
    renderTracker();
    await screen.findByText('Old Role');

    expect(scopeButton('Focus')).toHaveAccessibleName('Focus 1');
    expect(scopeButton('Active')).toHaveAccessibleName('Active 4');
    expect(scopeButton('All')).toHaveAccessibleName('All 4');
  });

  test('All shows the whole pipeline', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');

    await showAll(user);

    expect(screen.getByText('Today Role')).toBeInTheDocument();
    expect(screen.getByText('Yesterday Role')).toBeInTheDocument();
  });

  test('Active hides closed applications', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          record('r-live', 'Live Role', TODAY),
          record('r-dead', 'Rejected Role', LONG_AGO, 'rejected'),
        ],
      },
    });
    const user = userEvent.setup();
    renderTracker();

    await user.click(await screen.findByRole('radio', { name: /^Active/ }));
    expect(screen.getByText('Live Role')).toBeInTheDocument();
    expect(screen.queryByText('Rejected Role')).not.toBeInTheDocument();
  });
});

describe('the Focus queue', () => {
  test('an unanswered apply prompt outranks every other reason', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          record('r-pending', 'Pending Role', null, 'draft', { confirmation_pending: true }),
        ],
      },
    });
    renderTracker();

    const section = await screen.findByRole('button', { name: /^Needs an answer 1$/ });
    expect(section).toBeInTheDocument();
  });

  test('a next action in the past is overdue, and one next week is upcoming', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          record('r-late', 'Late Role', TODAY, 'applied', { next_action_date: inDays(-3) }),
          record('r-soon', 'Soon Role', TODAY, 'applied', { next_action_date: inDays(4) }),
        ],
      },
    });
    renderTracker();

    expect(await screen.findByRole('button', { name: /^Overdue 1$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^This week 1$/ })).toBeInTheDocument();
    expect(screen.getByText('Late Role')).toBeInTheDocument();
    expect(screen.getByText('Soon Role')).toBeInTheDocument();
  });

  test('a rejection is never asking for a decision', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          record('r-dead', 'Rejected Role', LONG_AGO, 'rejected', {
            next_action_date: inDays(-3),
          }),
        ],
      },
    });
    renderTracker();

    expect(await screen.findByText(/nothing needs you right now/i)).toBeInTheDocument();
    expect(screen.queryByText('Rejected Role')).not.toBeInTheDocument();
  });

  test('the all-clear offers the pipeline instead of a dead end', async () => {
    listTailoringRecords.mockResolvedValue({
      data: { records: [record('r-fresh', 'Fresh Role', TODAY)] },
    });
    const user = userEvent.setup();
    renderTracker();

    await user.click(await screen.findByRole('button', { name: /see the pipeline/i }));

    expect(scopeButton('Active')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Fresh Role')).toBeInTheDocument();
  });

  test('Gmail suggestions are decisions, so they sit in Focus', async () => {
    listGmailSuggestions.mockResolvedValue({
      data: {
        suggestions: [
          {
            suggestion_id: 's-1',
            record_id: 'r-today',
            title: 'Today Role',
            company: 'Acme',
            current_status: 'applied',
            suggested_status: 'interviewing',
            confidence: 0.92,
            applied: false,
            dismissed: false,
          },
        ],
      },
    });
    applyGmailSuggestion.mockResolvedValue({ data: { ok: true } });
    const user = userEvent.setup();
    renderTracker();

    const inbox = await screen.findByRole('button', { name: /^From your inbox 1/ });
    expect(inbox).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Update status' }));
    await waitFor(() => expect(applyGmailSuggestion).toHaveBeenCalledWith('s-1'));
  });

  test('pending inbox reviews remain visible once when Focus has no search matches', async () => {
    listGmailSuggestions.mockResolvedValue({
      data: {
        suggestions: [
          {
            suggestion_id: 'review-filtered',
            record_id: 'r-today',
            title: 'Inbox review role',
            company: 'Acme',
            current_status: 'applied',
            suggested_status: 'interviewing',
            confidence: 0.92,
            applied: false,
            dismissed: false,
          },
        ],
      },
    });
    const user = userEvent.setup();
    renderTracker();
    await screen.findByRole('button', { name: /^From your inbox 1/ });
    await user.type(
      screen.getByRole('textbox', { name: 'Search applications' }),
      'No role matches this',
    );
    expect(screen.getByText('Nothing matches those filters.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^From your inbox 1/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Update status' })).toHaveLength(1);
  });
});

describe('applied-date filtering', () => {
  test('Today shows only what was applied today', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');
    await showAll(user);

    await pickDatePreset(user, 'Today');

    expect(screen.getByText('Today Role')).toBeInTheDocument();
    expect(screen.queryByText('Yesterday Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Old Role')).not.toBeInTheDocument();
  });

  test('a record that was never applied to is excluded from any date range', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');
    await showAll(user);
    expect(screen.getByRole('button', { name: 'Draft, 1 applications' })).toBeInTheDocument();

    await pickDatePreset(user, 'Last 30 days');

    // The only draft has no applied date, so the stage empties out entirely.
    expect(screen.getByRole('button', { name: 'Draft, 0 applications' })).toBeInTheDocument();
  });

  test('Last 7 days includes today and yesterday but not months ago', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');
    await showAll(user);

    await pickDatePreset(user, 'Last 7 days');

    expect(screen.getByText('Today Role')).toBeInTheDocument();
    expect(screen.getByText('Yesterday Role')).toBeInTheDocument();
    expect(screen.queryByText('Old Role')).not.toBeInTheDocument();
  });

  test('the summary counts what survived, and Clear restores everything', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');
    await showAll(user);

    await pickDatePreset(user, 'Today');
    expect(await screen.findByRole('status')).toHaveTextContent(/^1 application applied/);

    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.getByText('Old Role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Draft, 1 applications' })).toBeInTheDocument();
  });
});

describe('stage filtering', () => {
  test('a stage filter narrows the pipeline independently of the date range', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');
    await showAll(user);

    await user.click(screen.getByRole('button', { name: 'Filter by stage' }));
    await user.click(await screen.findByRole('checkbox', { name: /Draft/ }));

    expect(screen.getByText('Never Applied Role')).toBeInTheDocument();
    expect(screen.queryByText('Today Role')).not.toBeInTheDocument();
  });
});

describe('the stage rail', () => {
  test('the busiest stage opens and the rest stay as spines', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');
    await showAll(user);

    // Three applied, one draft, so Applied opens.
    expect(screen.getByText('Today Role')).toBeInTheDocument();
    const savedSpine = screen.getByRole('button', { name: 'Saved, 0 applications' });
    expect(savedSpine).toHaveAttribute('aria-expanded', 'false');

    // The draft is behind its own spine until it is opened.
    expect(screen.queryByText('Never Applied Role')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Draft, 1 applications' }));
    expect(screen.getByText('Never Applied Role')).toBeInTheDocument();
  });

  test('the three terminal statuses share one Closed spine and self-label', async () => {
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

    await user.click(await screen.findByRole('radio', { name: /^All/ }));

    // Nothing is live, so Closed opens rather than an empty Saved column.
    expect(screen.getByText('Rejected Role')).toBeInTheDocument();
    expect(screen.getByText('Ghosted')).toBeInTheDocument();
    expect(screen.getByText('Withdrawn')).toBeInTheDocument();
  });

  test('on a phone the spines become chips, because five of them leave no column', async () => {
    setViewport('phone');
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');
    await showAll(user);

    // Same stages, same counts, laid out as a scrollable row instead.
    expect(screen.queryByRole('button', { name: 'Draft, 1 applications' })).not.toBeInTheDocument();
    const draft = screen.getByRole('radio', { name: 'Draft 1' });
    expect(draft).toHaveAttribute('aria-checked', 'false');

    await user.click(draft);
    expect(screen.getByText('Never Applied Role')).toBeInTheDocument();
  });

  test('a busy stage rolls up into a header per day', async () => {
    const days = [TODAY, localDayISO(-1), localDayISO(-2)];
    const records = days.flatMap((day, d) =>
      Array.from({ length: 10 }, (_, i) => record(`r-${d}-${i}`, `Role ${d}-${i}`, day)),
    );
    listTailoringRecords.mockResolvedValue({ data: { records } });
    const user = userEvent.setup();
    renderTracker();

    await user.click(await screen.findByRole('radio', { name: /^All/ }));

    // Only the most recent day is open; the rest are one line each.
    expect(screen.getByText('Role 0-0')).toBeInTheDocument();
    expect(screen.queryByText('Role 2-0')).not.toBeInTheDocument();

    const label = formatCivilDay(days[2], { weekday: 'short', month: 'short', day: 'numeric' });
    await user.click(screen.getByRole('button', { name: `${label} 10` }));
    expect(screen.getByText('Role 2-0')).toBeInTheDocument();
  });
});

describe('slim list rows', () => {
  test('a base-resume application says so without the versions array', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          {
            ...record('r-base', 'Base Role', LONG_AGO, 'applied', { resume_used: 'base' }),
            ats_scores: { overall: 71 },
            version_count: 0,
            has_tailored_resume: false,
          },
        ],
      },
    });
    renderTracker();

    expect(await screen.findByText('Base resume')).toBeInTheDocument();
    expect(screen.getByText('ATS 71')).toBeInTheDocument();
  });

  test('the list asks for slim rows and fetches the rest only when one is opened', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');

    expect(listTailoringRecords).toHaveBeenCalledWith({ view: 'list' });
    expect(getTailoringRecord).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Old Role/ }));
    await waitFor(() => expect(getTailoringRecord).toHaveBeenCalledWith('r-old'));
  });
});

describe('unanswered apply prompt', () => {
  test('a pending confirmation resurfaces on the row and can be answered', async () => {
    listTailoringRecords.mockResolvedValue({
      data: {
        records: [
          record('r-pending', 'Pending Role', null, 'draft', { confirmation_pending: true }),
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
          record('r-batch', 'Batch Role', null, 'draft', { batch_confirmation_pending: true }),
        ],
      },
    });
    renderTracker();

    expect(
      await screen.findByRole('group', { name: /did you apply\? batch role/i }),
    ).toBeInTheDocument();
  });

  test('no prompt renders when nothing is pending', async () => {
    const user = userEvent.setup();
    renderTracker();
    await screen.findByText('Old Role');
    await showAll(user);

    expect(screen.queryByRole('group', { name: /did you apply/i })).not.toBeInTheDocument();
  });
});
