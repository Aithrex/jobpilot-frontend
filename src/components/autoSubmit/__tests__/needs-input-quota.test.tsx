/**
 * Two design-review defects in the needs_input answer loop
 * (AUTOAPPLY_REPAIR_SPEC §3).
 *
 * 1. THREE CONTRADICTORY MESSAGES FOR ONE SUCCESSFUL SAVE. The backend
 *    deliberately merges the full result into the 429 body
 *    (`services/jobs/blueprints/apply.py::needs_input_answer`), so it carries
 *    `application_status: "ready_for_review"` + `remaining: []`: the answers WERE
 *    saved and the row DID advance - the user is only out of auto-submit slots.
 *    `useAutoSubmit.answerNeedsInput` short-circuited 429 to `{ok: false}` before
 *    reading either field, so the card said "You've reached your auto-apply limit
 *    for now", never set `resumed`, and (because `setValues({})` only runs in the
 *    ok branch) left the form populated - so the user resubmitted and got 409
 *    "This application already moved on".
 *
 * 2. IN-FLIGHT ROWS. The backend fold now emits `queued` / `gathering` /
 *    `running` rows (they used to vanish for the whole browser run). These tests
 *    are the FE half of that contract: the rows render, read-only, with no
 *    Approve button and no dead Cancel affordance - i.e. no FE change was needed.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import type { AutoSubmitPending, AutoSubmitSettings } from '@/types/autoSubmit';
import AutoApplyTab from '@/components/autoSubmit/AutoApplyTab';

vi.mock('@/lib/api', () => ({
  apiService: {
    getAutoSubmitSettings: vi.fn(),
    updateAutoSubmitSettings: vi.fn(),
    getAutoSubmitPending: vi.fn(),
    approveAutoSubmit: vi.fn(),
    cancelAutoSubmit: vi.fn(),
    markAutoSubmitSubmitted: vi.fn(),
    getOnboardingQuestions: vi.fn(),
    saveOnboardingAnswers: vi.fn(),
    answerNeedsInput: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderTab() {
  return render(
    <QueryClientProvider client={makeClient()}>
      <AutoApplyTab />
    </QueryClientProvider>,
  );
}

const SETTINGS: AutoSubmitSettings = {
  auto_submit_enabled: true,
  autonomy_threshold: 0.9,
  mode: 'approval',
};

function needsInputPending(): AutoSubmitPending {
  return {
    pending: [
      {
        application_id: 'a-quota',
        status: 'needs_input',
        url: 'https://boards.greenhouse.io/acme/jobs/7',
        title: 'Platform Engineer',
        company: 'Acme',
        needs_input: [
          {
            question: 'How did you hear about us?',
            kind: 'screening',
            field_id: 'how_did_you_hear',
            value_type: 'select',
            options: ['Company website', 'LinkedIn', 'Indeed'],
          },
        ],
      },
    ],
    waiting: [],
  };
}

describe('needs_input answer + exhausted auto-submit quota (429)', () => {
  beforeEach(() => {
    // Module-level vi.fn()s: call counts leak between tests without this.
    vi.clearAllMocks();
    api.getAutoSubmitSettings.mockResolvedValue({ data: SETTINGS, status: 200 });
    api.getAutoSubmitPending.mockResolvedValue({
      data: needsInputPending(),
      status: 200,
    });
    // The 429 the backend sends: quota body MERGED with the full §3 result.
    api.answerNeedsInput.mockResolvedValue({
      status: 429,
      error: 'Auto-apply limit reached',
      errorPayload: {
        error: 'quota_exceeded',
        usage: { limit: 25, used: 25, remaining: 0, resets_at: '2026-08-01T00:00:00Z' },
        status: 'resumed',
        application_status: 'ready_for_review',
        remaining: [],
      },
    });
  });

  async function answerTheSelect() {
    // The backend now ships the option list, so this is a real choice, not a
    // text box the user can free-type into.
    await userEvent.click(await screen.findByRole('button', { name: 'LinkedIn' }));
    await userEvent.click(screen.getByRole('button', { name: /save & continue/i }));
    await waitFor(() => expect(api.answerNeedsInput).toHaveBeenCalledTimes(1));
  }

  test('renders the RESUMED state, not "we could not save that"', async () => {
    renderTab();
    await answerTheSelect();

    expect(api.answerNeedsInput).toHaveBeenCalledWith({
      application_id: 'a-quota',
      answers: { how_did_you_hear: 'LinkedIn' },
    });
    // The save SUCCEEDED and the row advanced - say so.
    expect(
      await screen.findByText(/back in your review queue/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Status: ready for review/i)).toBeInTheDocument();
    // The three old contradictions must all be gone.
    expect(
      screen.queryByText(/reached your auto-apply limit/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/already moved on/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/couldn't save/i)).not.toBeInTheDocument();
  });

  test('still tells the user the quota ran out, in the same breath', async () => {
    renderTab();
    await answerTheSelect();

    expect(
      await screen.findByText(/out of auto-apply submissions for now/i),
    ).toBeInTheDocument();
  });

  test('clears the form so the user cannot resubmit into a 409', async () => {
    renderTab();
    await answerTheSelect();

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /save & continue/i }),
      ).not.toBeInTheDocument(),
    );
    // One save attempt, ever - no resubmit path is left on screen.
    expect(api.answerNeedsInput).toHaveBeenCalledTimes(1);
  });
});

describe('in-flight rows stay visible (fold: queued / gathering / running)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAutoSubmitSettings.mockResolvedValue({ data: SETTINGS, status: 200 });
  });

  test.each(['queued', 'gathering'] as const)(
    'a %s row renders as "Preparing", never as approvable',
    async (status) => {
      api.getAutoSubmitPending.mockResolvedValue({
        data: {
          pending: [
            {
              application_id: `a-${status}`,
              status,
              already_approved: true,
              eligible: false,
              url: 'https://boards.greenhouse.io/acme/jobs/8',
              title: 'Data Engineer',
              company: 'Acme',
            },
          ],
          waiting: [],
        },
        status: 200,
      });

      renderTab();

      expect(await screen.findByText('Data Engineer')).toBeInTheDocument();
      expect(screen.getByText('Preparing')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /approve & submit/i }),
      ).not.toBeInTheDocument();
    },
  );

  test('a running row is visible, read-only, with no dead Cancel button', async () => {
    api.getAutoSubmitPending.mockResolvedValue({
      data: {
        pending: [
          {
            application_id: 'a-running',
            status: 'running',
            already_approved: true,
            eligible: false,
            // No `undo_until`: a running row has left the cancellable window.
            url: 'https://boards.greenhouse.io/acme/jobs/9',
            title: 'Site Reliability Engineer',
            company: 'Acme',
          },
        ],
        waiting: [],
      },
      status: 200,
    });

    renderTab();

    expect(
      await screen.findByText('Site Reliability Engineer'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Handed to your browser to submit/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /approve & submit/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();
  });
});
