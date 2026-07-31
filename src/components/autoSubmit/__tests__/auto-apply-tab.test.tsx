/**
 * Defect H - AutoApplyTab double-approval fix.
 *
 * Contract: docs/specs/auto-apply-defects-plan.md §H + /auto-submit/pending
 * rows LABELED with `status` + `already_approved`. The apiService boundary +
 * useAuth + sonner are mocked. Covers: ready_for_review rows are actionable
 * (one "Approve & submit"), already-approved rows render READ-ONLY with NO
 * approve button (so re-approval / double-charge is impossible from the UI),
 * copilot mode renders a read-only answer sheet, and rows key stably (no React
 * key warning) even when approval_id is absent on ledger rows.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import type {
  AutoSubmitPending,
  AutoSubmitSettings,
  NeedsInputItem,
} from '@/types/autoSubmit';
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
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
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

function settings(mode: AutoSubmitSettings['mode']): AutoSubmitSettings {
  return { auto_submit_enabled: true, autonomy_threshold: 0.9, mode };
}

/** One actionable ready_for_review row + two already-approved (read-only) rows. */
function pendingMixed(): AutoSubmitPending {
  return {
    pending: [
      {
        application_id: 'app-ready',
        status: 'ready_for_review',
        already_approved: false,
        url: 'https://boards.greenhouse.io/acme/jobs/1',
        title: 'Backend Engineer',
        company: 'Acme',
        answers_snapshot: { 'Why Acme?': 'I love builders.' },
      },
      {
        // NOTE: no approval_id (canonical ledger row) - key must fall back.
        application_id: 'app-approved',
        status: 'approved',
        already_approved: true,
        url: 'https://boards.greenhouse.io/beta/jobs/2',
        title: 'Frontend Engineer',
        company: 'Beta',
      },
      {
        application_id: 'app-queued',
        status: 'queued_for_execution',
        already_approved: true,
        url: 'https://boards.greenhouse.io/gamma/jobs/3',
        title: 'Data Engineer',
        company: 'Gamma',
      },
    ],
    waiting: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.updateAutoSubmitSettings.mockResolvedValue({ data: settings('approval'), status: 200 });
  api.approveAutoSubmit.mockResolvedValue({ data: { created: true }, status: 201 });
});

describe('AutoApplyTab (defect H)', () => {
  test('renders ready_for_review as actionable and already-approved rows read-only (no approve button)', async () => {
    api.getAutoSubmitSettings.mockResolvedValue({ data: settings('approval'), status: 200 });
    api.getAutoSubmitPending.mockResolvedValue({ data: pendingMixed(), status: 200 });

    renderTab();

    // The one ready_for_review row is actionable.
    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    // The already-approved rows appear under the read-only "Approved & submitting".
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Data Engineer')).toBeInTheDocument();

    // EXACTLY one "Approve & submit" button - only the ready_for_review row.
    const approveButtons = screen.getAllByRole('button', { name: /approve & submit/i });
    expect(approveButtons).toHaveLength(1);
  });

  test('approving is only possible on the ready_for_review row (no double-charge path)', async () => {
    api.getAutoSubmitSettings.mockResolvedValue({ data: settings('approval'), status: 200 });
    api.getAutoSubmitPending.mockResolvedValue({ data: pendingMixed(), status: 200 });

    renderTab();

    await screen.findByText('Backend Engineer');
    await userEvent.click(screen.getByRole('button', { name: /approve & submit/i }));

    await waitFor(() => expect(api.approveAutoSubmit).toHaveBeenCalledTimes(1));
    expect(api.approveAutoSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ application_id: 'app-ready' }),
    );
    // Never called for an already-approved application.
    for (const call of api.approveAutoSubmit.mock.calls) {
      expect(call[0].application_id).not.toBe('app-approved');
      expect(call[0].application_id).not.toBe('app-queued');
    }
  });

  test('does not emit a React key warning when ledger rows lack approval_id', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.getAutoSubmitSettings.mockResolvedValue({ data: settings('approval'), status: 200 });
    api.getAutoSubmitPending.mockResolvedValue({ data: pendingMixed(), status: 200 });

    renderTab();
    await screen.findByText('Backend Engineer');

    const keyWarning = errSpy.mock.calls.find((c) =>
      String(c[0] ?? '').toLowerCase().includes('unique "key"'),
    );
    expect(keyWarning).toBeUndefined();
    errSpy.mockRestore();
  });

  test('surfaces waiting_human / needs_input / submission_unknown with the right copy + CTA', async () => {
    api.getAutoSubmitSettings.mockResolvedValue({ data: settings('approval'), status: 200 });
    api.getAutoSubmitPending.mockResolvedValue({
      data: {
        pending: [
          {
            application_id: 'a1',
            status: 'waiting_human',
            url: 'https://boards.greenhouse.io/acme/jobs/1',
            title: 'Role A',
            company: 'Co A',
            reason: 'a verification wall',
          },
          {
            application_id: 'a2',
            status: 'needs_input',
            url: 'https://boards.greenhouse.io/beta/jobs/2',
            title: 'Role B',
            company: 'Co B',
            needs_input: [{ question: 'Years of Python?', field_id: 'years_python' }],
          },
          {
            application_id: 'a3',
            status: 'submission_unknown',
            url: 'https://boards.greenhouse.io/gamma/jobs/3',
            title: 'Role C',
            company: 'Co C',
          },
        ],
        waiting: [],
      },
      status: 200,
    });

    renderTab();

    // The attention section renders, ahead of the review queue.
    expect(await screen.findByText('Needs your attention')).toBeInTheDocument();

    // waiting_human: "Needs you: <pending action>" + a Take-over CTA. This one
    // legitimately links out - only a person can clear a wall on their site.
    expect(screen.getByText('a verification wall')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /take over/i })).toBeInTheDocument();

    // needs_input: the question is a REAL, LABELLED INPUT in the app. The old
    // "Review & answer" link (which dumped the user on the employer's portal to
    // redo the whole application by hand) must be gone for good.
    expect(screen.getByLabelText('Years of Python?')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /review & answer/i }),
    ).not.toBeInTheDocument();

    // submission_unknown: neutral HELD copy - not an error, not a success.
    expect(screen.getByText(/won't retry automatically/i)).toBeInTheDocument();

    // None of the three held rows is ever re-approvable from here.
    expect(
      screen.queryByRole('button', { name: /approve & submit/i }),
    ).not.toBeInTheDocument();
  });

  test('copilot mode surfaces a read-only answer sheet with no approve action', async () => {
    api.getAutoSubmitSettings.mockResolvedValue({ data: settings('copilot'), status: 200 });
    api.getAutoSubmitPending.mockResolvedValue({
      data: {
        pending: [
          {
            application_id: 'app-copilot',
            status: 'ready_for_review',
            already_approved: false,
            url: 'https://boards.greenhouse.io/acme/jobs/9',
            title: 'ML Engineer',
            company: 'Acme',
            answers_snapshot: { 'Years of Python?': '5' },
          },
        ],
        waiting: [],
      },
      status: 200,
    });

    renderTab();

    expect(await screen.findByText('ML Engineer')).toBeInTheDocument();
    // Copilot never submits - so no approve action, just the answer sheet + link.
    expect(screen.queryByRole('button', { name: /approve & submit/i })).not.toBeInTheDocument();
    expect(screen.getByText('Your answers')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open job to apply/i })).toBeInTheDocument();
  });
});

/**
 * AUTOAPPLY_REPAIR_SPEC §3 - the in-app answer surface.
 *
 * The row is answered HERE and the run resumes. The user is never sent to the
 * employer's portal for a question they could have typed in one box.
 */
function needsInputPending(items: NeedsInputItem[]): AutoSubmitPending {
  return {
    pending: [
      {
        application_id: 'a-ni',
        status: 'needs_input',
        url: 'https://boards.greenhouse.io/acme/jobs/7',
        title: 'Platform Engineer',
        company: 'Acme',
        needs_input: items,
      },
    ],
    waiting: [],
  };
}

describe('needs_input answer surface (spec §3)', () => {
  beforeEach(() => {
    api.getAutoSubmitSettings.mockResolvedValue({ data: settings('approval'), status: 200 });
  });

  test('answers a question in-app and resumes the application', async () => {
    api.getAutoSubmitPending.mockResolvedValue({
      data: needsInputPending([
        { question: 'Years of Python?', kind: 'screening', field_id: 'years_python' },
      ]),
      status: 200,
    });
    api.answerNeedsInput.mockResolvedValue({
      data: {
        status: 'resumed',
        application_status: 'ready_for_review',
        remaining: [],
      },
      status: 200,
    });

    renderTab();

    const input = await screen.findByLabelText('Years of Python?');
    await userEvent.type(input, '5');
    await userEvent.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(api.answerNeedsInput).toHaveBeenCalledTimes(1));
    expect(api.answerNeedsInput).toHaveBeenCalledWith({
      application_id: 'a-ni',
      answers: { years_python: 5 },
    });

    // It resumed - and the copy NEVER tells the user to go apply manually.
    const resumed = await screen.findByText(/back in your review queue/i);
    expect(resumed).toBeInTheDocument();
    expect(screen.queryByText(/apply manually/i)).not.toBeInTheDocument();
  });

  test('shows only what is still missing when the backend returns `remaining`', async () => {
    api.getAutoSubmitPending.mockResolvedValue({
      data: needsInputPending([
        { question: 'Years of Python?', kind: 'screening', field_id: 'years_python' },
        { question: 'Desired salary?', kind: 'screening', field_id: 'desired_salary' },
      ]),
      status: 200,
    });
    api.answerNeedsInput.mockResolvedValue({
      data: {
        status: 'resumed',
        application_status: 'needs_input',
        remaining: [
          { question: 'Desired salary?', kind: 'screening', field_id: 'desired_salary' },
        ],
      },
      status: 200,
    });

    renderTab();

    await userEvent.type(await screen.findByLabelText('Years of Python?'), '5');
    await userEvent.click(screen.getByRole('button', { name: /save & continue/i }));

    // The answered question is gone; only the outstanding one remains.
    await waitFor(() =>
      expect(screen.queryByLabelText('Years of Python?')).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Desired salary?')).toBeInTheDocument();
    expect(screen.getByText(/1 question still needs an answer/i)).toBeInTheDocument();
  });

  test('a legal attestation renders as Yes/No with NOTHING preselected', async () => {
    api.getAutoSubmitPending.mockResolvedValue({
      data: needsInputPending([
        {
          question: 'Are you legally authorized to work in the United States?',
          kind: 'legal_attestation',
          field_id: 'work_authorized_us',
        },
      ]),
      status: 200,
    });

    renderTab();

    const yes = await screen.findByRole('button', { name: 'Yes' });
    const no = screen.getByRole('button', { name: 'No' });
    // Safety rule 1: a legal attestation is NEVER pre-answered for the user.
    expect(yes).toHaveAttribute('aria-pressed', 'false');
    expect(no).toHaveAttribute('aria-pressed', 'false');
    // Nothing filled -> nothing to submit.
    expect(screen.getByRole('button', { name: /save & continue/i })).toBeDisabled();
  });

  test('an Oracle wall is a browser hand-off, NOT a text box', async () => {
    api.getAutoSubmitPending.mockResolvedValue({
      data: needsInputPending([
        {
          question: 'Verification required (captcha) to finish this application',
          kind: 'oracle_captcha',
          field_id: 'oracle_captcha',
          apply_url: 'https://boards.greenhouse.io/acme/jobs/7',
          action: 'complete_in_browser',
        },
      ]),
      status: 200,
    });

    renderTab();

    expect(await screen.findByText('Human check required')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /open the employer's site/i }),
    ).toBeInTheDocument();
    // A captcha is not answerable in-app: no input, no save action.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /save & continue/i }),
    ).not.toBeInTheDocument();
  });
});

/**
 * Spec §4 + the missing half of the status union: rows in these states used to
 * fall through every branch and either vanish or render as an approvable review
 * card.
 */
describe('unsupported / failed rows (spec §4)', () => {
  beforeEach(() => {
    api.getAutoSubmitSettings.mockResolvedValue({ data: settings('approval'), status: 200 });
  });

  test('unsupported renders calmly as "apply manually", never as an error', async () => {
    api.getAutoSubmitPending.mockResolvedValue({
      data: {
        pending: [
          {
            application_id: 'a-uns',
            status: 'unsupported',
            url: 'https://jobs.example.com/apply/1',
            title: 'Systems Engineer',
            company: 'Delta',
            ats: 'icims',
          },
        ],
        waiting: [],
      },
      status: 200,
    });

    renderTab();

    expect(
      await screen.findByText(/can't auto-apply to this employer's system yet/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Apply manually')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open job to apply/i })).toBeInTheDocument();
    // Informational, not actionable.
    expect(
      screen.queryByRole('button', { name: /approve & submit/i }),
    ).not.toBeInTheDocument();
  });

  test('a failed row is VISIBLE instead of silently vanishing', async () => {
    api.getAutoSubmitPending.mockResolvedValue({
      data: {
        pending: [
          {
            application_id: 'a-fail',
            status: 'failed',
            url: 'https://boards.lever.co/echo/jobs/2',
            title: 'SRE',
            company: 'Echo',
            reason: 'form_timeout',
          },
        ],
        waiting: [],
      },
      status: 200,
    });

    renderTab();

    expect(await screen.findByText('SRE')).toBeInTheDocument();
    expect(screen.getByText("Didn't go through")).toBeInTheDocument();
    expect(screen.getByText(/Nothing was submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/form_timeout/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /approve & submit/i }),
    ).not.toBeInTheDocument();
  });
});
