import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import GmailSuggestions, {
  explainMatch,
  explainReason,
  gmailReviewRetry,
  type GmailSuggestion,
} from '@/components/resume/GmailSuggestions';
import GmailIntegrationCard from '@/components/resume/GmailIntegration';
import { apiService } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiService: {
    getGmailStatus: vi
      .fn()
      .mockResolvedValue({ data: { configured: false, connected: false, pending_suggestions: 0 } }),
    listGmailSuggestions: vi.fn().mockResolvedValue({ data: { suggestions: [] } }),
    applyGmailSuggestion: vi.fn().mockResolvedValue({ data: { suggestion: {} } }),
    syncGmail: vi.fn(),
    pollGmailSyncJob: vi.fn(),
    getGmailActivity: vi.fn().mockResolvedValue({ data: { changes: [] } }),
  },
}));

/** The card links to Find jobs and the privacy policy, so it needs a router. */
function GmailIntegration(props: Parameters<typeof GmailIntegrationCard>[0]) {
  return (
    <MemoryRouter>
      <GmailIntegrationCard {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  // The one automatic second try, without the wait.
  gmailReviewRetry.delayMs = 0;
  vi.mocked(apiService.listGmailSuggestions).mockReset();
  vi.mocked(apiService.listGmailSuggestions).mockResolvedValue({ data: { suggestions: [] } });
  vi.mocked(apiService.getGmailStatus).mockResolvedValue({
    data: { configured: false, connected: false, pending_suggestions: 0 },
  });
});
afterEach(() => vi.useRealTimers());

describe('Gmail review', () => {
  test('an incomplete review queue shows a retry instead of a misleading empty count', async () => {
    vi.mocked(apiService.getGmailStatus).mockResolvedValue({
      data: { configured: true, connected: true, pending_suggestions: 105 },
    });
    // The page tries a second time by itself before it says anything.
    vi.mocked(apiService.listGmailSuggestions)
      .mockResolvedValueOnce({ error: 'Request timed out. Please try again.' })
      .mockResolvedValueOnce({ error: 'Request timed out. Please try again.' });
    render(<GmailIntegration />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Email updates from Gmail did not load.');
    expect(alert).not.toHaveTextContent('timed out');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Load email updates' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  test('one slow answer is retried quietly and never shown as an error', async () => {
    vi.mocked(apiService.getGmailStatus).mockResolvedValue({
      data: { configured: true, connected: true, pending_suggestions: 0 },
    });
    const calls = vi.mocked(apiService.listGmailSuggestions);
    calls.mockClear();
    calls.mockResolvedValueOnce({ error: 'Request timed out. Please try again.' });
    render(<GmailIntegration />);
    await waitFor(() => expect(calls).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('the connected review queue forwards the chosen outcome through the API', async () => {
    vi.mocked(apiService.getGmailStatus).mockResolvedValue({
      data: {
        configured: true,
        connected: true,
        pending_suggestions: 1,
      },
    });
    vi.mocked(apiService.listGmailSuggestions).mockResolvedValue({
      data: {
        suggestions: [
          {
            suggestion_id: 'queue-unknown',
            record_id: 'record-1',
            company: 'Example',
            title: 'Engineer',
            current_status: 'applied',
            suggested_status: null,
            requires_status_selection: true,
            confidence: 0,
            applied: false,
            dismissed: false,
            candidate_records: [{ record_id: 'record-1', company: 'Example', title: 'Engineer' }],
          },
        ],
      },
    });
    const onSyncComplete = vi.fn();
    render(<GmailIntegration onSyncComplete={onSyncComplete} />);
    const user = userEvent.setup();
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Choose application' }),
      'record-1',
    );
    expect(screen.getByRole('button', { name: 'Update status' })).toBeDisabled();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Choose outcome' }),
      'interviewing',
    );
    await user.click(screen.getByRole('button', { name: 'Update status' }));
    expect(apiService.applyGmailSuggestion).toHaveBeenCalledWith(
      'queue-unknown',
      'record-1',
      'interviewing',
    );
    expect(onSyncComplete).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Update status' })).not.toBeInTheDocument();
  });

  test('an uncertain outcome requires both an application and an explicit status', async () => {
    const onApply = vi.fn();
    const suggestion = {
      suggestion_id: 'unclear',
      record_id: 'backend',
      company: 'Acme',
      title: 'Backend Engineer',
      current_status: 'applied',
      suggested_status: null,
      requires_status_selection: true,
      confidence: 0,
      applied: false,
      dismissed: false,
      candidate_records: [{ record_id: 'backend', company: 'Acme', title: 'Backend Engineer' }],
      snippet: 'Please check the candidate portal for an update.',
    } as GmailSuggestion;
    render(
      <GmailSuggestions
        suggestions={[suggestion]}
        busyId={null}
        onApply={onApply}
        onDismiss={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    const apply = screen.getByRole('button', { name: 'Update status' });
    expect(apply).toBeDisabled();
    expect(screen.getByText('Outcome needs review')).toBeInTheDocument();
    expect(screen.queryByText(/0% status confidence/)).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Choose outcome' }), 'rejected');
    expect(apply).toBeDisabled();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Choose application' }),
      'backend',
    );
    await user.click(apply);
    expect(onApply).toHaveBeenCalledWith('unclear', 'backend', 'rejected');
  });

  test('an email for an untracked role cannot update an unrelated application', () => {
    const suggestion = {
      suggestion_id: 'untracked',
      record_id: null,
      company: 'Acme',
      title: 'Data Engineer',
      current_status: null,
      suggested_status: 'rejected',
      requires_application_match: true,
      requires_record_selection: true,
      candidate_records: [],
      confidence: 0.99,
      applied: false,
      dismissed: false,
    } as GmailSuggestion;
    render(
      <GmailSuggestions
        suggestions={[suggestion]}
        busyId={null}
        onApply={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.getByText(/No matching application is available/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update status' })).not.toBeInTheDocument();
  });

  test('a finished check says what was read, what moved and what waits for review', async () => {
    vi.mocked(apiService.getGmailStatus).mockResolvedValue({
      data: {
        configured: true,
        connected: true,
        pending_suggestions: 3,
        last_synced_at: new Date().toISOString(),
        last_sync_summary: {
          outcome: 'updated',
          messages_scanned: 50,
          auto_applied: 2,
          suggested: 3,
          ignored: 45,
          deferred: 2,
          model_calls: 0,
        },
      },
    });
    render(<GmailIntegration />);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Checked 50 emails. 2 statuses updated for you, 3 waiting for your review.',
    );
  });

  test('an ambiguous rejection requires an explicit role and shows the email evidence', async () => {
    const onApply = vi.fn();
    const suggestion = {
      suggestion_id: 's-1',
      record_id: '',
      company: 'Acme',
      current_status: 'applied',
      suggested_status: 'rejected',
      confidence: 0.99,
      applied: false,
      dismissed: false,
      requires_record_selection: true,
      match_confidence: 0.5,
      match_reason: 'Two roles at this company',
      candidate_records: [
        { record_id: 'backend', company: 'Acme', title: 'Backend Engineer' },
        { record_id: 'frontend', company: 'Acme', title: 'Frontend Engineer' },
      ],
      from_address: 'careers@acme.test',
      subject: 'Application update',
      snippet: 'We have moved ahead with another candidate.',
      email_received_at: '2026-10-25T14:00:00Z',
    } as GmailSuggestion;
    render(
      <GmailSuggestions
        suggestions={[suggestion]}
        busyId={null}
        onApply={onApply}
        onDismiss={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    const apply = screen.getByRole('button', { name: 'Update status' });
    expect(apply).toBeDisabled();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Choose application' }),
      'frontend',
    );
    await user.click(apply);
    expect(onApply).toHaveBeenCalledWith('s-1', 'frontend');
    expect(screen.getByText('careers@acme.test')).toBeInTheDocument();
    expect(screen.getByText(suggestion.snippet!)).toBeInTheDocument();
    expect(screen.getByText(suggestion.match_reason!)).toBeInTheDocument();
  });

  test('unavailable Gmail setup is explained rather than silently removed', async () => {
    render(<GmailIntegration />);
    expect(await screen.findByText('Gmail connection is switched off')).toBeInTheDocument();
    expect(screen.getByText(/nothing is read from your email/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Gmail' })).toBeDisabled();
  });

  test('a check that stopped part way says it continues by itself, with no Continue sync chore', async () => {
    vi.mocked(apiService.getGmailStatus).mockResolvedValue({
      data: {
        configured: true,
        connected: true,
        pending_suggestions: 7,
        has_more: true,
        last_synced_at: null,
        last_sync_summary: { messages_scanned: 50, auto_applied: 2, suggested: 7, ignored: 0 },
      },
    });
    render(<GmailIntegration />);
    expect(await screen.findByText('Gmail check paused, more email to read')).toBeInTheDocument();
    expect(screen.getByText(/50 emails read so far/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Aspirely carries on by itself within about 30 minutes',
    );
    expect(screen.getByRole('button', { name: 'Continue now' })).toBeEnabled();
    expect(screen.queryByText(/Not checked yet/i)).not.toBeInTheDocument();
  });

  test('a finished scan labels the completion watermark separately from batch counts', async () => {
    vi.mocked(apiService.getGmailStatus).mockResolvedValue({
      data: {
        configured: true,
        connected: true,
        pending_suggestions: 0,
        has_more: false,
        last_synced_at: new Date().toISOString(),
        last_sync_summary: { messages_scanned: 3, auto_applied: 0, suggested: 0, ignored: 3 },
      },
    });
    render(<GmailIntegration />);
    expect(await screen.findByText(/Last checked just now/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Last check: 3 emails checked');
    expect(screen.getByRole('button', { name: 'Check Gmail now' })).toBeEnabled();
  });

  test('candidate dates distinguish repeated roles and only identical labels need a reference', async () => {
    const onApply = vi.fn();
    const suggestion: GmailSuggestion = {
      suggestion_id: 'repeat-role',
      record_id: '',
      current_status: 'applied',
      suggested_status: 'rejected',
      confidence: 0.9,
      applied: false,
      dismissed: false,
      requires_record_selection: true,
      candidate_records: [
        {
          record_id: 'record-11111111',
          company: 'Example',
          title: 'Engineer',
          applied_date: '2026-10-12',
          created_at: '2026-09-01T12:00:00Z',
        },
        {
          record_id: 'record-22222222',
          company: 'Example',
          title: 'Engineer',
          applied_date: '2026-10-12',
        },
        {
          record_id: 'record-33333333',
          company: 'Example',
          title: 'Engineer',
          applied_date: '2026-10-15',
        },
        {
          record_id: 'record-44444444',
          company: 'Example',
          title: 'Designer',
          created_at: '2026-10-16T19:00:00Z',
        },
        { record_id: 'legacy-55555555', company: 'Example', title: 'Analyst' },
        { record_id: 'legacy-66666666', company: 'Example', title: 'Analyst' },
      ],
    };
    render(
      <GmailSuggestions
        suggestions={[suggestion]}
        busyId={null}
        onApply={onApply}
        onDismiss={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('option', {
        name: 'Engineer · Example · Applied Oct 12, 2026 · Application 11111111',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', {
        name: 'Engineer · Example · Applied Oct 12, 2026 · Application 22222222',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Engineer · Example · Applied Oct 15, 2026' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Designer · Example · Added Oct 16, 2026' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Analyst · Example · Application 55555555' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Analyst · Example · Application 66666666' }),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByRole('combobox'), 'record-22222222');
    await user.click(screen.getByRole('button', { name: 'Update status' }));
    expect(onApply).toHaveBeenCalledWith('repeat-role', 'record-22222222');
  });

  test('a failed check on an older backend (job, no run) gives an inline retryable error', async () => {
    vi.mocked(apiService.getGmailStatus).mockResolvedValue({
      data: { configured: true, connected: true, pending_suggestions: 0 },
    });
    vi.mocked(apiService.syncGmail).mockResolvedValue({
      data: { ok: true, job_id: 'job-1', status: 'queued' },
    });
    vi.mocked(apiService.pollGmailSyncJob).mockResolvedValue({
      data: { status: 'failed', error: 'Google connection expired. Reconnect Gmail.' },
    });
    render(<GmailIntegration />);
    const button = await screen.findByRole('button', { name: 'Check Gmail now' });
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Google connection expired');
    expect(screen.getByRole('button', { name: 'Check Gmail now' })).toBeEnabled();
  });
});

/**
 * The scan stores its notes in the words of a log. A person reading an email
 * card gets a sentence, and a note this build has never seen is shown as sent.
 */
describe('why an email is read the way it is, in plain words', () => {
  test('the quoted phrase is kept and the log label is dropped', () => {
    expect(explainReason('Decline phrase: "we have decided to move forward with other candidates"')).toBe(
      'The email says: "we have decided to move forward with other candidates"',
    );
    expect(explainReason('Possible decline, please check: "Unfortunately, at this time"')).toBe(
      'This may be a no. The email says: "Unfortunately, at this time"',
    );
    expect(
      explainReason('Interview wording inside an application receipt, please check: "schedule a call"'),
    ).toBe('This reads like a confirmation that also mentions next steps: "schedule a call"');
  });

  test('an older email says so, and "unclear" is not repeated under a card that already says it', () => {
    expect(explainReason('Email predates your latest status change. Offer phrase: "offer letter attached"')).toBe(
      'This email is older than the last change you made. The email says: "offer letter attached"',
    );
    expect(explainReason('Outcome is unclear. Review this email and choose the application status.')).toBeNull();
    expect(explainReason('The recruiter asks for a time on Thursday.')).toBe(
      'The recruiter asks for a time on Thursday.',
    );
    expect(explainReason(undefined)).toBeNull();
  });

  test('only what the person needs to act on is said about the match', () => {
    expect(
      explainMatch(
        'Company identified in application content; Exact role title in email; Email requisition is not uniquely confirmed in this application',
      ),
    ).toEqual(['The email gives a job number your tracker does not have, so check it is this application.']);
    expect(explainMatch('Company identified in application content; Exact role title in email')).toEqual([]);
    expect(explainMatch('Two roles at this company')).toEqual(['Two roles at this company']);
  });
});
