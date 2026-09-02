/**
 * Suppression is a server fact, not a browser fact.
 *
 * The old implementation was localStorage-only, so "not interested" meant "not
 * interested on this laptop" - the same posting came back on a phone, and
 * clearing site data undid every dismissal a user had ever made. These tests
 * pin the two halves of the fix:
 *
 *  - a dismissal made elsewhere hides the card on a browser that has never
 *    seen it (fresh localStorage + the GET);
 *  - and the three DATA-QUALITY reasons still do not hide anything, because
 *    the server does not suppress on them and the UI must not pretend it does.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { NOT_INTERESTED_KEY } from '@/lib/techFeedNotInterested';
import { TechFeedPanel } from '@/components/job-search/tech-feed/TechFeedPanel';
import {
  TECH_FEED_TAXONOMY,
  makeTechFeedJob,
  makeTechFeedResponse,
} from '@/test/techFeedFixtures';

vi.mock('@/lib/api', () => ({
  apiService: {
    searchTechFeed: vi.fn(),
    getTechFeedTaxonomy: vi.fn(),
    getTechFeedCoverage: vi.fn(),
    getWorkdayCatalog: vi.fn(),
    getTechFeedFeedback: vi.fn(),
    recordTechFeedFeedback: vi.fn(),
    undoTechFeedFeedback: vi.fn(),
  },
}));

// Toasts are the only place the "hidden" vs "we will re-check" distinction is
// spoken out loud, so they are asserted rather than rendered.
vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  });
  return { toast: toastFn };
});

const api = apiService as unknown as Record<string, Mock>;
const toastMock = toast as unknown as Mock;

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/jobs/portals']}>
        <TechFeedPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function cached(): Array<Record<string, unknown>> {
  return JSON.parse(window.localStorage.getItem(NOT_INTERESTED_KEY) || '[]');
}

function suppression(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      job_ids: [],
      dedupe_group_ids: [],
      employer_ids: [],
      updated_at: null,
      ...overrides,
    },
    status: 200,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  api.getTechFeedTaxonomy.mockResolvedValue({ data: TECH_FEED_TAXONOMY, status: 200 });
  api.getWorkdayCatalog.mockResolvedValue({ data: { total: 0, industries: [] }, status: 200 });
  api.searchTechFeed.mockResolvedValue({
    data: makeTechFeedResponse({ jobs: [makeTechFeedJob()] }),
    status: 200,
  });
  api.getTechFeedFeedback.mockResolvedValue(suppression());
  api.recordTechFeedFeedback.mockResolvedValue({ data: {}, status: 204 });
  api.undoTechFeedFeedback.mockResolvedValue({ data: {}, status: 204 });
});

describe('suppression crosses devices', () => {
  test('a dismissal made on another device hides the card on a fresh browser', async () => {
    // Nothing in this browser has ever seen job-1 - only the server has.
    expect(cached()).toHaveLength(0);
    api.getTechFeedFeedback.mockResolvedValue(suppression({ job_ids: ['job-1'] }));

    renderPanel();

    await waitFor(() => expect(api.getTechFeedFeedback).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByTestId('tech-feed-job-card')).not.toBeInTheDocument(),
    );
  });

  test('the server list is cached without inventing the reason behind it', async () => {
    api.getTechFeedFeedback.mockResolvedValue(
      suppression({ job_ids: ['job-1'], updated_at: '2026-08-31T10:00:00Z' }),
    );

    renderPanel();

    await waitFor(() => expect(cached()).toHaveLength(1));
    // GET returns ids, not reasons. `null` records that honestly.
    expect(cached()[0]).toMatchObject({ job_id: 'job-1', reason: null, synced: true });
  });

  test('a dismissal undone elsewhere stops hiding the card here', async () => {
    window.localStorage.setItem(
      NOT_INTERESTED_KEY,
      JSON.stringify([
        { job_id: 'job-1', reason: 'not_interested', at: '2026-08-01T00:00:00Z', synced: true },
      ]),
    );
    api.getTechFeedFeedback.mockResolvedValue(suppression({ job_ids: [] }));

    renderPanel();

    expect(await screen.findByTestId('tech-feed-job-card')).toBeInTheDocument();
    await waitFor(() => expect(cached()).toHaveLength(0));
  });

  test('a failed reconciliation never silently un-hides what the user dismissed', async () => {
    window.localStorage.setItem(
      NOT_INTERESTED_KEY,
      JSON.stringify([
        { job_id: 'job-1', reason: 'not_interested', at: '2026-08-01T00:00:00Z', synced: true },
      ]),
    );
    api.getTechFeedFeedback.mockResolvedValue({ error: 'Network error' });

    renderPanel();

    await waitFor(() => expect(api.getTechFeedFeedback).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.queryByTestId('tech-feed-job-card')).not.toBeInTheDocument(),
    );
    expect(cached()).toHaveLength(1);
  });
});

describe('a data-quality report is not a dismissal', () => {
  test('reporting the wrong company keeps the job in the feed', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByTestId('tech-feed-job-card');
    await user.click(screen.getByRole('button', { name: /^Hide or report/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Wrong company' }));

    await waitFor(() =>
      expect(api.recordTechFeedFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ job_id: 'job-1', reason: 'wrong_company' }),
      ),
    );
    // The server records it and deliberately hides nothing. Neither do we.
    expect(screen.getByTestId('tech-feed-job-card')).toBeInTheDocument();
  });

  test('the confirmation promises a re-check, not a disappearance', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByTestId('tech-feed-job-card');
    await user.click(screen.getByRole('button', { name: /^Hide or report/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Looks closed or expired' }));

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const [message, options] = toastMock.mock.calls[toastMock.mock.calls.length - 1];
    expect(message).toBe("Thanks - we'll re-check this listing");
    expect(String(options.description)).toContain('stays in your feed');
    expect(String(message)).not.toMatch(/hidden/i);
  });

  test('the menu states each consequence before the click, grouped', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByTestId('tech-feed-job-card');
    await user.click(screen.getByRole('button', { name: /^Hide or report/ }));

    const menu = await screen.findByRole('menu');
    expect(menu).toHaveTextContent('Not for me');
    expect(menu).toHaveTextContent('Hides this job from your feed.');
    expect(menu).toHaveTextContent("Something's wrong with this listing");
    expect(menu).toHaveTextContent('We re-check the listing. It stays in your feed.');
  });

  test('a preference dismissal does hide, and says so', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByTestId('tech-feed-job-card');
    await user.click(screen.getByRole('button', { name: /^Hide or report/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Not the kind of role I want' }));

    await waitFor(() =>
      expect(screen.queryByTestId('tech-feed-job-card')).not.toBeInTheDocument(),
    );
    expect(toastMock.mock.calls[toastMock.mock.calls.length - 1][0]).toBe('Hidden from this feed');
  });
});

describe('undo and refusal', () => {
  test('undo deletes server-side and brings the card back', async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByTestId('tech-feed-job-card');
    await user.click(screen.getByRole('button', { name: /^Hide or report/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Not interested' }));
    await waitFor(() =>
      expect(screen.queryByTestId('tech-feed-job-card')).not.toBeInTheDocument(),
    );

    const options = toastMock.mock.calls[toastMock.mock.calls.length - 1][1];
    options.action.onClick();

    await waitFor(() => expect(api.undoTechFeedFeedback).toHaveBeenCalledWith('job-1'));
    expect(await screen.findByTestId('tech-feed-job-card')).toBeInTheDocument();
    await waitFor(() => expect(cached()).toHaveLength(0));
  });

  test('a refused write puts the card back instead of hiding it on a lie', async () => {
    const user = userEvent.setup();
    api.recordTechFeedFeedback.mockResolvedValue({
      error: 'Rate limit exceeded. Tech feed feedback is limited to 240 / 5 min.',
      status: 429,
    });
    renderPanel();

    await screen.findByTestId('tech-feed-job-card');
    await user.click(screen.getByRole('button', { name: /^Hide or report/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Not interested' }));

    expect(await screen.findByTestId('tech-feed-job-card')).toBeInTheDocument();
    expect(cached()).toHaveLength(0);
    expect((toast.error as unknown as Mock)).toHaveBeenCalledWith(
      'Could not save that feedback',
      expect.objectContaining({ description: expect.stringContaining('Rate limit') }),
    );
  });
});
