/**
 * Managed-mailbox Inbox + settings tests.
 *
 * Contract under test: jobpilot-backend/docs/specs/managed-mailbox-v1.md §5/§8.
 * The apiService boundary is mocked (house style); sonner is mocked. Covers:
 * thread list + unread filter, sandboxed sanitized-HTML rendering with remote
 * images off, a suspicious attachment showing no download link, provision/
 * pause/rotate wiring, and the forwarding-verify token POST.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import type { MessageView, ThreadDetail, ThreadSummary } from '@/types/mailbox';
import MailboxInboxTab from '@/components/mailbox/MailboxInboxTab';
import { ThreadDetailView } from '@/components/mailbox/ThreadDetailView';
import MailboxSettingsPanel from '@/app-shell/settings/MailboxSettingsPanel';
import VerifyForwardPanel from '@/app-shell/settings/VerifyForwardPanel';

vi.mock('@/lib/api', () => ({
  apiService: {
    getMailbox: vi.fn(),
    provisionMailbox: vi.fn(),
    pauseMailbox: vi.fn(),
    rotateMailbox: vi.fn(),
    setForwarding: vi.fn(),
    verifyForwarding: vi.fn(),
    getMailboxThreads: vi.fn(),
    getMailboxThread: vi.fn(),
    markThreadRead: vi.fn(),
    attachThread: vi.fn(),
    detachThread: vi.fn(),
    getAttachmentDownloadUrl: vi.fn(),
    reportPhishing: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const api = apiService as unknown as Record<string, Mock>;

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithProviders(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  return render(
    <QueryClientProvider client={makeClient()}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function threadFixtures(): ThreadSummary[] {
  return [
    {
      thread_id: 't-verified',
      alias_id: 'a1',
      subject: 'Your Greenhouse application',
      participants: ['Acme Recruiting <jobs@acme.com>', 'harshith.manne@pilotmail.co'],
      message_count: 1,
      unread_count: 1,
      last_message_at: '2026-07-22T10:00:00Z',
      trust: 'verified',
      snippet: 'Thanks for applying to Acme.',
      has_attachments: true,
    },
    {
      thread_id: 't-unverified',
      alias_id: 'a1',
      subject: 'You have won a prize',
      participants: ['spam@nowhere.example'],
      message_count: 1,
      unread_count: 0,
      last_message_at: '2026-07-21T10:00:00Z',
      trust: 'unverified',
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MailboxInboxTab', () => {
  test('renders the thread list (sender, subject, trust) and filters by unread', async () => {
    api.getMailboxThreads.mockResolvedValue({ data: { threads: threadFixtures() }, status: 200 });

    renderWithProviders(<MailboxInboxTab />);

    expect(await screen.findByText('Your Greenhouse application')).toBeInTheDocument();
    expect(screen.getByText(/Acme Recruiting/)).toBeInTheDocument();
    // Trust chips from §8 are rendered per row.
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
    expect(screen.getByText('Unverified')).toBeInTheDocument();

    // Initial load is unfiltered.
    expect(api.getMailboxThreads).toHaveBeenCalledWith(undefined);

    // Toggling "Unread only" re-queries with { unread: true }.
    await userEvent.click(screen.getByLabelText('Unread only'));
    await waitFor(() =>
      expect(api.getMailboxThreads).toHaveBeenCalledWith({ unread: true }),
    );
  });

  test('shows the empty state when there are no threads', async () => {
    api.getMailboxThreads.mockResolvedValue({ data: { threads: [] }, status: 200 });
    renderWithProviders(<MailboxInboxTab />);
    expect(await screen.findByText('No messages yet')).toBeInTheDocument();
  });

  test('a 404 (feature flag off) hides the surface', async () => {
    api.getMailboxThreads.mockResolvedValue({ error: 'not found', status: 404 });
    renderWithProviders(<MailboxInboxTab />);
    expect(await screen.findByText(/isn't available yet/i)).toBeInTheDocument();
  });
});

function detailFixture(overrides?: Partial<MessageView>): ThreadDetail {
  const message: MessageView = {
    message_id: 'm1',
    from: 'Acme Recruiting <jobs@acme.com>',
    subject: 'Your Greenhouse application',
    received_at: '2026-07-22T10:00:00Z',
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    html: '<p>Hello candidate</p><img src="https://tracker.example/pixel.gif">',
    attachments: [],
    trust: 'verified',
    read: false,
    ...overrides,
  };
  return {
    thread: {
      thread_id: 't-verified',
      alias_id: 'a1',
      subject: 'Your Greenhouse application',
      participants: ['Acme Recruiting <jobs@acme.com>'],
      message_count: 1,
      unread_count: 1,
      last_message_at: '2026-07-22T10:00:00Z',
      trust: 'verified',
    },
    messages: [message],
  };
}

describe('ThreadDetailView', () => {
  test('renders sanitized HTML in a sandboxed iframe with remote images off by default', async () => {
    render(<ThreadDetailView detail={detailFixture()} />);

    const frame = screen.getByTitle(/Message from Acme/i) as HTMLIFrameElement;
    // Sandboxed with NO allow-scripts and NO allow-same-origin (null origin).
    expect(frame).toHaveAttribute('sandbox');
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('sandbox') ?? '').not.toContain('allow-scripts');
    expect(frame.getAttribute('sandbox') ?? '').not.toContain('allow-same-origin');

    // Remote images blocked by CSP until the user opts in.
    const srcdoc = frame.getAttribute('srcdoc') ?? '';
    expect(srcdoc).toContain("script-src 'none'");
    expect(srcdoc).toContain('img-src data:');
    expect(srcdoc).not.toContain('img-src https: data:');

    // Opting in flips the image policy (still no scripts).
    await userEvent.click(screen.getByRole('button', { name: /show images/i }));
    const frame2 = screen.getByTitle(/Message from Acme/i) as HTMLIFrameElement;
    expect(frame2.getAttribute('srcdoc') ?? '').toContain('img-src https: data:');
  });

  test('SPF/DKIM/DMARC evidence chips render', () => {
    render(<ThreadDetailView detail={detailFixture()} />);
    expect(screen.getByTitle('SPF: pass')).toBeInTheDocument();
    expect(screen.getByTitle('DKIM: pass')).toBeInTheDocument();
    expect(screen.getByTitle('DMARC: pass')).toBeInTheDocument();
  });

  test('a suspicious attachment shows no download link', () => {
    render(
      <ThreadDetailView
        detail={detailFixture({
          attachments: [
            { id: 'att-bad', filename: 'invoice.pdf', size: 2048, verdict: 'suspicious' },
          ],
        })}
      />,
    );
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
    expect(screen.getByText(/download disabled/i)).toBeInTheDocument();
  });

  test('a clean attachment offers a download button', () => {
    render(
      <ThreadDetailView
        detail={detailFixture({
          attachments: [
            { id: 'att-ok', filename: 'offer.pdf', size: 4096, verdict: 'clean' },
          ],
        })}
      />,
    );
    expect(screen.getByRole('button', { name: /download/i })).toBeEnabled();
  });

  test('the reply box is present but disabled (sending is a later task)', () => {
    render(<ThreadDetailView detail={detailFixture()} />);
    expect(screen.getByLabelText(/reply/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });
});

describe('MailboxSettingsPanel', () => {
  test('provision calls provisionMailbox with the privacy-alias flag', async () => {
    api.getMailbox.mockResolvedValue({ data: { provisioned: false }, status: 200 });
    api.provisionMailbox.mockResolvedValue({
      data: { provisioned: true, address: 'harshith.manne@pilotmail.co' },
      status: 200,
    });

    renderWithProviders(<MailboxSettingsPanel />);

    const cta = await screen.findByRole('button', { name: /create my address/i });
    await userEvent.click(cta);
    await waitFor(() =>
      expect(api.provisionMailbox).toHaveBeenCalledWith({ privacy_alias: false }),
    );
  });

  test('pause toggle calls pauseMailbox(true)', async () => {
    api.getMailbox.mockResolvedValue({
      data: {
        provisioned: true,
        address: 'harshith.manne@pilotmail.co',
        paused: false,
        forwarding_enabled: false,
        forward_to: null,
        forward_to_verified: false,
        unread_count: 0,
      },
      status: 200,
    });
    api.pauseMailbox.mockResolvedValue({ data: {}, status: 200 });

    renderWithProviders(<MailboxSettingsPanel />);
    const toggle = await screen.findByLabelText('Pause mailbox');
    await userEvent.click(toggle);
    await waitFor(() => expect(api.pauseMailbox).toHaveBeenCalledWith(true));
  });

  test('rotate is confirmed then calls rotateMailbox', async () => {
    api.getMailbox.mockResolvedValue({
      data: {
        provisioned: true,
        address: 'harshith.manne@pilotmail.co',
        paused: false,
        forwarding_enabled: false,
        forward_to: null,
        forward_to_verified: false,
        unread_count: 0,
      },
      status: 200,
    });
    api.rotateMailbox.mockResolvedValue({
      data: { provisioned: true, address: 'harshith.manne2@pilotmail.co' },
      status: 200,
    });

    renderWithProviders(<MailboxSettingsPanel />);
    await userEvent.click(await screen.findByRole('button', { name: /^rotate$/i }));

    // Confirm inside the alert dialog.
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /rotate address/i }));
    await waitFor(() => expect(api.rotateMailbox).toHaveBeenCalledTimes(1));
  });
});

describe('VerifyForwardPanel', () => {
  test('posts the token from the query string on mount', async () => {
    api.verifyForwarding.mockResolvedValue({ data: { forward_to_verified: true }, status: 200 });

    renderWithProviders(
      <Routes>
        <Route path="/verify" element={<VerifyForwardPanel />} />
      </Routes>,
      ['/verify?token=tok-123'],
    );

    await waitFor(() => expect(api.verifyForwarding).toHaveBeenCalledWith('tok-123'));
    expect(await screen.findByText(/forwarding verified/i)).toBeInTheDocument();
  });

  test('a missing token shows the incomplete-link state and posts nothing', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/verify" element={<VerifyForwardPanel />} />
      </Routes>,
      ['/verify'],
    );
    expect(await screen.findByText(/missing verification token/i)).toBeInTheDocument();
    expect(api.verifyForwarding).not.toHaveBeenCalled();
  });
});
