/**
 * Auto-Apply onboarding flow tests.
 *
 * Contract: jobpilot-backend/docs/specs/auto-apply-fill-engine.md (QT2) +
 * /api/apply/onboarding/{questions,answers}. The apiService boundary + useAuth +
 * sonner are mocked (house style). Covers: grouped fields render, EEO defaults
 * to the decline option (no real value pre-selected), the mode picker forces an
 * explicit choice, required fields block completion, and a successful save PUTs
 * the answers + mode.
 */
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import type {
  OnboardingAnswerValue,
  OnboardingCategory,
  OnboardingField,
  OnboardingQuestions,
  OnboardingSensitivity,
  OnboardingValueType,
} from '@/types/onboarding';
import AutoApplyOnboarding from '@/components/autoSubmit/AutoApplyOnboarding';

vi.mock('@/lib/api', () => ({
  apiService: {
    getOnboardingQuestions: vi.fn(),
    saveOnboardingAnswers: vi.fn(),
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

function Harness({ focusMode = false }: { focusMode?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <QueryClientProvider client={makeClient()}>
      <AutoApplyOnboarding open={open} onOpenChange={setOpen} focusMode={focusMode} />
    </QueryClientProvider>
  );
}

/** All required missing (phone + both work-auth booleans), mode unset. */
function questionsMissing(): OnboardingQuestions {
  return {
    groups: [
      {
        category: 'identity',
        fields: [
          field('full_name', 'Full name', 'identity', 'safe', 'text', { current: 'Jane Doe' }),
          field('email', 'Email', 'identity', 'safe', 'email', { current: 'jane@doe.test' }),
          field('phone', 'Phone', 'identity', 'safe', 'phone', { required: true, missing: true }),
        ],
      },
      {
        category: 'work_auth',
        fields: [
          field('work_authorized_us', 'Authorized to work in the US?', 'work_auth', 'safe', 'boolean', {
            required: true,
            missing: true,
          }),
          field('requires_sponsorship', 'Require sponsorship?', 'work_auth', 'safe', 'boolean', {
            required: true,
            missing: true,
          }),
        ],
      },
      {
        category: 'eeo',
        fields: [
          field('gender', 'Gender', 'eeo', 'protected', 'select', {
            options: ['Male', 'Female', 'Non-binary', 'Decline to self-identify'],
            default: 'Decline to self-identify',
          }),
        ],
      },
    ],
    ready_for_autoapply: false,
    mode: null,
    required_fields: ['full_name', 'email', 'phone', 'work_authorized_us', 'requires_sponsorship'],
  };
}

/** All required present (values declared), mode still unset. */
function questionsReadyExceptMode(): OnboardingQuestions {
  return {
    groups: [
      {
        category: 'identity',
        fields: [
          field('full_name', 'Full name', 'identity', 'safe', 'text', { current: 'Jane Doe' }),
          field('email', 'Email', 'identity', 'safe', 'email', { current: 'jane@doe.test' }),
          field('phone', 'Phone', 'identity', 'safe', 'phone', { current: '555-0100' }),
        ],
      },
      {
        category: 'work_auth',
        fields: [
          field('work_authorized_us', 'Authorized to work in the US?', 'work_auth', 'safe', 'boolean', {
            current: true,
          }),
          field('requires_sponsorship', 'Require sponsorship?', 'work_auth', 'safe', 'boolean', {
            current: false,
          }),
        ],
      },
    ],
    ready_for_autoapply: false,
    mode: null,
    required_fields: ['full_name', 'email', 'phone', 'work_authorized_us', 'requires_sponsorship'],
  };
}

function field(
  field_id: string,
  label: string,
  category: OnboardingCategory,
  sensitivity: OnboardingSensitivity,
  value_type: OnboardingValueType,
  opts: {
    required?: boolean;
    missing?: boolean;
    options?: string[];
    default?: OnboardingAnswerValue | null;
    current?: OnboardingAnswerValue | null;
  } = {},
): OnboardingField {
  return {
    field_id,
    label,
    category,
    sensitivity,
    value_type,
    options: opts.options ?? [],
    required: opts.required ?? false,
    default: opts.default ?? null,
    current_value: opts.current ?? null,
    missing: opts.missing ?? false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AutoApplyOnboarding', () => {
  test('renders grouped fields, defaults EEO to decline (no real value pre-selected), and blocks completion until required + mode', async () => {
    api.getOnboardingQuestions.mockResolvedValue({ data: questionsMissing(), status: 200 });

    render(<Harness />);

    // Step 1: identity group.
    expect(await screen.findByText('Full name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();

    // -> work_auth group.
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText('Authorized to work in the US?')).toBeInTheDocument();

    // -> eeo group: the decline option is pre-selected; NO real value is.
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    const decline = await screen.findByRole('button', { name: 'Decline to self-identify' });
    expect(decline).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Male' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Female' })).toHaveAttribute('aria-pressed', 'false');

    // -> mode step: Save & finish is disabled with no mode chosen.
    await userEvent.click(screen.getByRole('button', { name: /continue/i }));
    const finish = await screen.findByRole('button', { name: /save . finish/i });
    expect(finish).toBeDisabled();

    // Picking a mode is not enough while required contact/work-auth are missing.
    await userEvent.click(screen.getByRole('radio', { name: /^Auto\b(?! Aggressive)/i }));
    expect(screen.getByRole('button', { name: /save . finish/i })).toBeDisabled();
    expect(api.saveOnboardingAnswers).not.toHaveBeenCalled();
  });

  test('forces a mode choice, then PUTs the answers + chosen mode', async () => {
    api.getOnboardingQuestions.mockResolvedValue({ data: questionsReadyExceptMode(), status: 200 });
    api.saveOnboardingAnswers.mockResolvedValue({
      data: { ...questionsReadyExceptMode(), mode: 'approval', ready_for_autoapply: true },
      status: 200,
    });

    render(<Harness focusMode />);

    // focusMode lands us on the mode step; the CTA is blocked until a pick.
    const finish = await screen.findByRole('button', { name: /save . finish/i });
    expect(finish).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: /^Auto\b(?! Aggressive)/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /save . finish/i })).toBeEnabled(),
    );

    await userEvent.click(screen.getByRole('button', { name: /save . finish/i }));

    await waitFor(() => expect(api.saveOnboardingAnswers).toHaveBeenCalledTimes(1));
    const body = api.saveOnboardingAnswers.mock.calls[0][0];
    expect(body.mode).toBe('approval');
    expect(body.answers).toEqual(
      expect.objectContaining({
        full_name: 'Jane Doe',
        email: 'jane@doe.test',
        phone: '555-0100',
        work_authorized_us: true,
        requires_sponsorship: false,
      }),
    );
  });
});
