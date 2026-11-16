/**
 * Every Gmail state says what is happening and what to do next, and one press
 * runs a whole check. These render the real card against a mocked API.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import GmailIntegration from '@/components/resume/GmailIntegration';
import { apiService } from '@/lib/api';
import type { GmailChange, GmailStatus } from '@/types/gmail';

vi.mock('@/lib/api', () => ({
  apiService: {
    getGmailStatus: vi.fn(),
    getGmailAuthUrl: vi.fn(),
    requestGmailAccess: vi.fn(),
    getGmailActivity: vi.fn(),
    undoGmailChange: vi.fn(),
    syncGmail: vi.fn(),
    pollGmailSyncJob: vi.fn(),
    disconnectGmail: vi.fn(),
    listGmailSuggestions: vi.fn(),
    applyGmailSuggestion: vi.fn(),
    dismissGmailSuggestion: vi.fn(),
  },
}));

const api = vi.mocked(apiService);

const CONNECTED: GmailStatus = {
  configured: true,
  connected: true,
  state: 'synced',
  gmail_address: 'me@example.test',
  last_synced_at: new Date().toISOString(),
  pending_suggestions: 0,
  tracked_applications: 4,
  auto_sync: { enabled: true, interval_hours: 6 },
  access: { mode: 'production', expires_at: null },
};

function status(overrides: Partial<GmailStatus>): GmailStatus {
  return { ...CONNECTED, ...overrides };
}

function renderCard(props: Parameters<typeof GmailIntegration>[0] = {}) {
  return render(
    <MemoryRouter>
      <GmailIntegration {...props} />
    </MemoryRouter>,
  );
}

const realLocation = window.location;
let assign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  api.listGmailSuggestions.mockResolvedValue({ data: { suggestions: [] } });
  api.getGmailActivity.mockResolvedValue({ data: { changes: [] } });
  assign = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: 'http://localhost/app/apply/tracker', assign },
  });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('not connected', () => {
  test('says what is read and what never happens, right where the user connects', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: {
        configured: true,
        connected: false,
        state: 'not_connected',
        pending_suggestions: 0,
        access: { mode: 'testing', expires_at: null },
      },
    });
    renderCard();
    expect(await screen.findByText('Let Gmail keep this tracker up to date')).toBeInTheDocument();
    expect(screen.getByText(/sends, deletes, moves or marks\s+email\. Access is read only/)).toBeInTheDocument();
    expect(screen.getByText(/never used for ads and never used to train AI/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
      'href',
      '/privacy#google-user-data',
    );
    // While Google has the app in Testing, the 7 day limit is said up front.
    expect(screen.getByText(/Google ends each Gmail connection after 7 days/)).toBeInTheDocument();
  });

  test('Connect Gmail sends the browser to the Google consent URL', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: { configured: true, connected: false, state: 'not_connected', pending_suggestions: 0 },
    });
    api.getGmailAuthUrl.mockResolvedValue({
      data: { auth_url: 'https://accounts.google.com/o/oauth2/v2/auth?state=abc' },
    });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: 'Connect Gmail' }));
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?state=abc'),
    );
    // Connecting: the button stays busy and the page says where they are going.
    expect(screen.getByRole('button', { name: 'Opening Google...' })).toBeDisabled();
    expect(screen.getByText(/Taking you to Google/)).toBeInTheDocument();
  });

  test('a failed start says nothing was connected and never shows the server text', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: { configured: true, connected: false, state: 'not_connected', pending_suggestions: 0 },
    });
    api.getGmailAuthUrl.mockResolvedValue({ error: 'KeyError: GMAIL_TOKEN_ENCRYPTION_KEY', status: 500 });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: 'Connect Gmail' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing was connected');
    expect(screen.queryByText(/KeyError/)).not.toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeEnabled();
  });
});

describe('needs reconnect', () => {
  test('an expired connection shows Reconnect instead of "connected", and Reconnect opens Google', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: status({
        state: 'needs_reconnect',
        needs_reconnect: true,
        reconnect_reason: 'expired_or_revoked',
        access: { mode: 'testing', expires_at: null },
      }),
    });
    api.getGmailAuthUrl.mockResolvedValue({ data: { auth_url: 'https://accounts.google.com/again' } });
    const user = userEvent.setup();
    renderCard();
    expect(await screen.findByText('Reconnect Gmail to keep updates coming')).toBeInTheDocument();
    expect(screen.queryByText('Gmail connected')).not.toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Aspirely can no longer read me@example.test');
    expect(alert).toHaveTextContent('it ends every Gmail connection after 7 days');
    expect(screen.getByText(/No new email is read until you reconnect/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check Gmail now' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Reconnect Gmail' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://accounts.google.com/again'));
  });

  test('a missing Gmail permission tells the user which box to tick', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: status({ state: 'needs_reconnect', needs_reconnect: true, reconnect_reason: 'permission_missing' }),
    });
    renderCard();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'tick the box that lets Aspirely view your email messages',
    );
  });

  test('a reason this build does not know falls back to the general reconnect wording', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: status({ state: 'needs_reconnect', needs_reconnect: true, reconnect_reason: 'something_new' }),
    });
    renderCard();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The saved access no longer works. Reconnect to create a new one.',
    );
    expect(screen.getByRole('button', { name: 'Reconnect Gmail' })).toBeEnabled();
  });

  test('a check refused for reconnect reloads the status rather than showing an error code', async () => {
    api.getGmailStatus
      .mockResolvedValueOnce({ data: status({ state: 'synced' }) })
      .mockResolvedValue({
        data: status({ state: 'needs_reconnect', needs_reconnect: true, reconnect_reason: 'expired_or_revoked' }),
      });
    api.syncGmail.mockResolvedValue({
      error: 'Reconnect Gmail',
      status: 409,
      errorPayload: { code: 'gmail_reconnect_required' },
    });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: 'Check Gmail now' }));
    expect(await screen.findByRole('button', { name: 'Reconnect Gmail' })).toBeInTheDocument();
  });
});

describe('connected', () => {
  test('never checked: says nothing was read yet and that one press does the whole check', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: status({ state: 'never_synced', last_synced_at: null }),
    });
    renderCard();
    expect(await screen.findByText(/Not checked yet/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'look through the last 60 days of email for replies to your 4 applications. One press does the whole check.',
    );
    expect(screen.getByText(/checks by itself about every 6 hours/)).toBeInTheDocument();
  });

  test('an empty tracker is explained, with where to add an application', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: status({
        tracked_applications: 0,
        last_synced_at: null,
        state: 'synced',
        last_sync_summary: {
          messages_scanned: 0,
          auto_applied: 0,
          suggested: 0,
          ignored: 0,
          outcome: 'no_applications',
        },
      }),
    });
    renderCard();
    const result = await screen.findByRole('status');
    expect(result).toHaveTextContent('Your tracker is empty, so there was nothing to look for and no email was read');
    expect(within(result).getByRole('link', { name: 'Find jobs' })).toHaveAttribute('href', '/app/jobs/for-you');
    expect(within(result).getByRole('link', { name: 'tailor a resume' })).toHaveAttribute(
      'href',
      '/app/resume/tailor',
    );
    expect(screen.queryByText(/Scanned 0/)).not.toBeInTheDocument();
  });

  test.each([
    ['no_mail', { messages_scanned: 0 }, 'Nothing new: no email about job applications has arrived since the last check.'],
    [
      'no_matches',
      { messages_scanned: 212 },
      'Checked 212 emails. None were about the 4 applications in your tracker, so nothing changed.',
    ],
    [
      'up_to_date',
      { messages_scanned: 9 },
      'Checked 9 emails. The replies found agree with what your tracker already shows, so nothing changed.',
    ],
  ] as const)('a check that found nothing says why (%s)', async (outcome, counts, sentence) => {
    api.getGmailStatus.mockResolvedValue({
      data: status({
        last_sync_summary: { auto_applied: 0, suggested: 0, ignored: 0, ...counts, outcome },
      }),
    });
    renderCard();
    expect(await screen.findByRole('status')).toHaveTextContent(sentence);
  });

  test('the 7 day Google limit is shown as the date the connection ends', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: status({ access: { mode: 'testing', expires_at: '2026-11-22T15:00:00Z' } }),
    });
    renderCard();
    expect(await screen.findByText(/Google will end this connection on Nov 22/)).toBeInTheDocument();
  });

  test('a failed check shows the server sentence and a next step', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: status({
        sync: {
          run_id: 'run-1',
          state: 'failed',
          error_code: 'gmail_policy_blocked',
          error: 'Your Google Workspace policy blocks Gmail access.',
        },
      }),
    });
    renderCard();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your Google Workspace policy blocks Gmail access.');
    expect(alert).toHaveTextContent('connect a personal Gmail instead');
    expect(screen.getByRole('button', { name: 'Check Gmail now' })).toBeEnabled();
  });

  test('too many starts is a calm wait message, not a failure', async () => {
    api.getGmailStatus.mockResolvedValue({ data: status({}) });
    api.syncGmail.mockResolvedValue({
      error: 'Sync rate limit hit.',
      status: 429,
      errorPayload: { code: 'rate_limited' },
    });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: 'Check Gmail now' }));
    expect(await screen.findByText(/Wait about 5 minutes, then try again/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('one press runs the whole check', () => {
  test('progress comes from the status, the tracker catches up, and the result is stated', async () => {
    const onSyncComplete = vi.fn();
    const running = (scanned: number, moved: number) =>
      status({
        state: 'syncing',
        pending_suggestions: null,
        sync: {
          run_id: 'run-9',
          state: 'running',
          messages_scanned: scanned,
          auto_applied: moved,
          suggested: 0,
        },
      });
    api.getGmailStatus
      .mockResolvedValueOnce({ data: status({ state: 'never_synced', last_synced_at: null }) })
      .mockResolvedValueOnce({ data: running(50, 0) })
      .mockResolvedValueOnce({ data: running(100, 1) })
      .mockResolvedValueOnce({
        data: status({
          state: 'synced',
          pending_suggestions: null,
          sync: { run_id: 'run-9', state: 'completed', messages_scanned: 130, auto_applied: 1, suggested: 2 },
        }),
      })
      .mockResolvedValue({
        data: status({
          state: 'synced',
          pending_suggestions: 2,
          last_sync_summary: {
            messages_scanned: 130,
            auto_applied: 1,
            suggested: 2,
            ignored: 127,
            outcome: 'updated',
          },
        }),
      });
    api.syncGmail.mockResolvedValue({
      data: { ok: true, job_id: 'job-1', run_id: 'run-9', status: 'started' },
      status: 202,
    });
    renderCard({ onSyncComplete });
    const button = await screen.findByRole('button', { name: 'Check Gmail now' });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
    expect(screen.getByRole('progressbar', { name: 'Checking Gmail' })).toBeInTheDocument();
    expect(screen.getByText(/You can leave this page or close the tab/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByText(/50 emails read so far\. 0 statuses updated/)).toBeInTheDocument();
    expect(api.getGmailStatus).toHaveBeenLastCalledWith(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByText(/100 emails read so far\. 1 status updated/)).toBeInTheDocument();
    // A status moved mid-check, so the tracker is told before the check ends.
    expect(onSyncComplete).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole('button', { name: 'Check Gmail now' })).toBeEnabled();
    expect(screen.getByText(/Checked 130 emails\. 1 status updated for you, 2 waiting for your review\./)).toBeInTheDocument();
    expect(onSyncComplete).toHaveBeenCalledTimes(2);
    // The job was never polled, and no one was asked to press Continue.
    expect(api.pollGmailSyncJob).not.toHaveBeenCalled();
    expect(api.syncGmail).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
  });

  test('a check already running when the page opens shows its progress without a press', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: status({
        state: 'syncing',
        sync: {
          run_id: 'run-bg',
          trigger: 'scheduled',
          state: 'running',
          messages_scanned: 20,
          auto_applied: 0,
          suggested: 1,
        },
      }),
    });
    renderCard();
    expect(await screen.findByText('Checking your Gmail')).toBeInTheDocument();
    expect(screen.getByText(/20 emails read so far\. 0 statuses updated, 1 waiting for your review\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
    expect(api.syncGmail).not.toHaveBeenCalled();
  });
});

describe('what Gmail changed', () => {
  const change: GmailChange = {
    suggestion_id: 'sg-1',
    record_id: 'rec-1',
    company: 'Acme',
    title: 'Platform Engineer',
    from_status: 'applied',
    to_status: 'interviewing',
    subject: 'Interview availability for Platform Engineer',
    applied_at: new Date().toISOString(),
    undoable: true,
    undone: false,
  };

  test('lists each automatic move with its email, and Undo puts it back', async () => {
    const onSyncComplete = vi.fn();
    api.getGmailStatus.mockResolvedValue({ data: status({}) });
    api.getGmailActivity
      .mockResolvedValueOnce({ data: { changes: [change] } })
      .mockResolvedValue({ data: { changes: [{ ...change, undoable: false, undone: true }] } });
    api.undoGmailChange.mockResolvedValue({ data: { suggestion: {} as never, restored_status: 'applied' } });
    const user = userEvent.setup();
    renderCard({ onSyncComplete });

    const list = await screen.findByRole('region', { name: 'What Gmail changed' });
    expect(within(list).getByText('Platform Engineer')).toBeInTheDocument();
    expect(list).toHaveTextContent('Moved from Applied to Interviewing');
    expect(list).toHaveTextContent('Because of the email: Interview availability for Platform Engineer');

    await user.click(within(list).getByRole('button', { name: 'Undo the change to Platform Engineer' }));
    expect(api.undoGmailChange).toHaveBeenCalledWith('sg-1');
    expect(await within(list).findByText('Undone')).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: /^Undo/ })).not.toBeInTheDocument();
    // The tracker row has to move back too.
    expect(onSyncComplete).toHaveBeenCalled();
  });

  test('an application changed since cannot be undone, and says so plainly', async () => {
    api.getGmailStatus.mockResolvedValue({ data: status({}) });
    api.getGmailActivity.mockResolvedValue({ data: { changes: [change] } });
    api.undoGmailChange.mockResolvedValue({
      error: 'conflict',
      status: 409,
      errorPayload: { code: 'status_changed' },
    });
    const user = userEvent.setup();
    renderCard();
    await user.click(await screen.findByRole('button', { name: 'Undo the change to Platform Engineer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This application was changed again after Gmail moved it, so there is nothing to undo.',
    );
    expect(screen.queryByText('conflict')).not.toBeInTheDocument();
  });

  test('a backend without the activity route shows no list and no error', async () => {
    api.getGmailStatus.mockResolvedValue({ data: status({}) });
    api.getGmailActivity.mockResolvedValue({ error: 'HTTP 404', status: 404 });
    renderCard();
    await screen.findByText('Gmail connected');
    expect(screen.queryByRole('region', { name: 'What Gmail changed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/**
 * While Google limits Aspirely to accounts added by hand, a person who is not
 * on the list would be stopped on Google's own page. So the card asks for the
 * address first and offers Connect only once it has been added.
 */
describe('early access', () => {
  const WAITING_ROOM: GmailStatus = status({
    connected: false,
    state: 'not_connected',
    gmail_address: null,
    access: { mode: 'testing', expires_at: null, gate: 'invite', state: 'none', google_email: null },
  });

  test('nobody is sent to Google before asking: the card takes an address instead', async () => {
    api.getGmailStatus.mockResolvedValue({ data: WAITING_ROOM });
    api.requestGmailAccess.mockResolvedValue({
      data: {
        access: {
          mode: 'testing',
          gate: 'invite',
          state: 'requested',
          google_email: 'priya@gmail.test',
          requested_at: '2026-11-16T10:00:00+00:00',
        },
      },
    });
    const user = userEvent.setup();
    renderCard();

    await screen.findByText('Let Gmail keep this tracker up to date');
    expect(screen.queryByRole('button', { name: 'Connect Gmail' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request access' })).toBeDisabled();

    await user.type(screen.getByLabelText('Google address you will connect'), ' priya@gmail.test ');
    await user.click(screen.getByRole('button', { name: 'Request access' }));

    expect(api.requestGmailAccess).toHaveBeenCalledWith('priya@gmail.test');
    const note = await screen.findByRole('status');
    expect(note).toHaveTextContent('priya@gmail.test');
    expect(note).toHaveTextContent('email you when it is ready');
    expect(api.getGmailAuthUrl).not.toHaveBeenCalled();
  });

  test('a request already made is shown as waiting, and the address can be changed', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: {
        ...WAITING_ROOM,
        access: { mode: 'testing', gate: 'invite', state: 'requested', google_email: 'old@gmail.test' },
      },
    });
    const user = userEvent.setup();
    renderCard();

    expect(await screen.findByRole('status')).toHaveTextContent('old@gmail.test');
    await user.click(screen.getByRole('button', { name: 'Use a different Google address' }));
    expect(screen.getByLabelText('Google address you will connect')).toHaveValue('old@gmail.test');
  });

  test('a refused address is explained in words and nothing is lost', async () => {
    api.getGmailStatus.mockResolvedValue({ data: WAITING_ROOM });
    api.requestGmailAccess.mockResolvedValue({ error: 'gmail_address_invalid', status: 400 });
    const user = userEvent.setup();
    renderCard();

    await user.type(await screen.findByLabelText('Google address you will connect'), 'priya@gmail');
    await user.click(screen.getByRole('button', { name: 'Request access' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Enter the full Google address');
    expect(alert).not.toHaveTextContent('gmail_address_invalid');
    expect(screen.getByLabelText('Google address you will connect')).toHaveValue('priya@gmail');
  });

  test('once the address is added, Connect appears and names the account to choose', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: {
        ...WAITING_ROOM,
        access: { mode: 'testing', gate: 'invite', state: 'approved', google_email: 'priya@gmail.test' },
      },
    });
    renderCard();

    expect(await screen.findByRole('button', { name: 'Connect Gmail' })).toBeEnabled();
    expect(screen.getByText(/On Google's screen choose/)).toHaveTextContent('priya@gmail.test');
    expect(screen.queryByRole('button', { name: 'Request access' })).not.toBeInTheDocument();
  });

  test('a backend that sends no gate still offers Connect, as it always did', async () => {
    api.getGmailStatus.mockResolvedValue({
      data: { ...WAITING_ROOM, access: { mode: 'testing', expires_at: null } },
    });
    renderCard();
    expect(await screen.findByRole('button', { name: 'Connect Gmail' })).toBeEnabled();
  });
});
