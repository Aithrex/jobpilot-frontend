/**
 * MyResumesPage on the Resume Platform v3 versions contract.
 *
 * GET /resume/versions rows are {resume_id, filename, uploaded_at,
 * size_bytes, parse_status, is_active} — no s3_key. Set-active goes through
 * PUT /resume/active {resume_id}; 409 resume_not_parsed surfaces as a
 * user-facing toast, and unparsed rows can't be activated at all.
 * The API layer is mocked at the apiService boundary (house style).
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import MyResumesPage from '@/app-shell/pages/craft/MyResumesPage';
import type { ResumeAssetRow } from '@/types/resume';

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  VERSION_LIMIT_MESSAGE:
    'This tailored resume already has 5 versions. Start a new tailoring session to continue.',
  apiService: {
    listBaseResumes: vi.fn(),
    setActiveResume: vi.fn(),
    deleteResume: vi.fn(),
    uploadResumeForParser: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const api = apiService as unknown as Record<string, Mock>;
const toastMock = toast as unknown as { success: Mock; error: Mock; info: Mock };

function rows(): ResumeAssetRow[] {
  return [
    {
      resume_id: 'ra-active',
      filename: 'alpha.pdf',
      uploaded_at: '2026-07-01T10:00:00Z',
      size_bytes: 120_000,
      parse_status: 'parsed',
      is_active: true,
    },
    {
      resume_id: 'ra-parsed',
      filename: 'beta.docx',
      uploaded_at: '2026-07-10T10:00:00Z',
      size_bytes: 90_000,
      parse_status: 'parsed',
      is_active: false,
    },
    {
      resume_id: 'ra-pending',
      filename: 'gamma.pdf',
      uploaded_at: '2026-07-19T10:00:00Z',
      size_bytes: 45_000,
      parse_status: 'pending',
      is_active: false,
    },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listBaseResumes.mockResolvedValue({ data: { versions: rows() } });
});

describe('MyResumesPage (Resume Platform v3)', () => {
  test('renders v3 rows: filenames, Active badge, parse-status chip', async () => {
    render(<MyResumesPage />);

    expect(await screen.findByText('alpha.pdf')).toBeInTheDocument();
    expect(screen.getByText('beta.docx')).toBeInTheDocument();
    expect(screen.getByText('gamma.pdf')).toBeInTheDocument();

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Parsing')).toBeInTheDocument();

    // Unparsed rows can't be activated (the backend would answer 409).
    const useButtons = screen.getAllByRole('button', { name: 'Use for Tailoring' });
    expect(useButtons).toHaveLength(2); // beta (enabled) + gamma (disabled)
    expect(useButtons[0]).toBeEnabled();
    expect(useButtons[1]).toBeDisabled();
  });

  test('active switch calls setActiveResume with the resume_id and reloads', async () => {
    api.setActiveResume.mockResolvedValue({ data: { resume_id: 'ra-parsed' } });
    render(<MyResumesPage />);

    const [betaButton] = await screen.findAllByRole('button', {
      name: 'Use for Tailoring',
    });
    await userEvent.click(betaButton);

    await waitFor(() =>
      expect(api.setActiveResume).toHaveBeenCalledWith('ra-parsed'),
    );
    // Initial load + post-switch refresh.
    await waitFor(() => expect(api.listBaseResumes).toHaveBeenCalledTimes(2));
  });

  test('409 resume_not_parsed surfaces the parsing-in-progress toast', async () => {
    api.setActiveResume.mockResolvedValue({
      error: 'resume_not_parsed',
      status: 409,
      errorPayload: { error: 'resume_not_parsed' },
    });
    render(<MyResumesPage />);

    const [betaButton] = await screen.findAllByRole('button', {
      name: 'Use for Tailoring',
    });
    await userEvent.click(betaButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Couldn't set active resume",
        expect.objectContaining({
          description:
            'This resume has not finished parsing yet. Try again in a moment.',
        }),
      ),
    );
    // No refresh on failure.
    expect(api.listBaseResumes).toHaveBeenCalledTimes(1);
  });

  test('upload failure copy surfaces via toast (503/413 mapped in apiService)', async () => {
    api.uploadResumeForParser.mockResolvedValue({
      error:
        'File storage is temporarily unavailable. Please try again in a few minutes.',
      status: 503,
    });
    const { container } = render(<MyResumesPage />);
    await screen.findByText('alpha.pdf');

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(['x'], 'resume.pdf', { type: 'application/pdf' })] },
    });

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        'Upload failed',
        expect.objectContaining({
          description: expect.stringMatching(/temporarily unavailable/i),
        }),
      ),
    );
  });
});
