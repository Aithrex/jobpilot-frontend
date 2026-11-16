/**
 * MyResumesPage on the Resume Platform v3 versions contract.
 *
 * GET /resume/versions rows are {resume_id, filename, uploaded_at,
 * size_bytes, parse_status, is_active} - no s3_key. Set-active goes through
 * PUT /resume/active {resume_id}; 409 resume_not_parsed surfaces as a
 * user-facing toast, and unparsed rows can't be activated at all.
 * The API layer is mocked at the apiService boundary (house style).
 *
 * The page speaks the user's words (2026-11-16): the resume in use is "Used
 * for job matching" rather than "Active", and a new upload is being "read"
 * rather than "parsed". The behaviour under those words is unchanged.
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
    getResumeStatus: vi.fn(),
    downloadResumeFile: vi.fn(),
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

/** The page links to the Tailor tool, so it needs a router around it. */
function renderPage() {
  return render(
    <MemoryRouter>
      <MyResumesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listBaseResumes.mockResolvedValue({ data: { versions: rows() } });
  api.getResumeStatus.mockResolvedValue({
    data: {
      has_resume: true,
      filename: 'alpha.pdf',
      experience_years: 2,
      job_titles: ['Data Analyst Intern', 'Junior Business Analyst'],
      skills: ['SQL', 'Python', 'Tableau'],
    },
  });
});

describe('MyResumesPage (Resume Platform v3)', () => {
  test('renders v3 rows: filenames, the in-use badge, and where each file stands', async () => {
    renderPage();

    expect(await screen.findByText('alpha.pdf')).toBeInTheDocument();
    expect(screen.getByText('beta.docx')).toBeInTheDocument();
    expect(screen.getByText('gamma.pdf')).toBeInTheDocument();

    // Exactly one resume is the one job matching runs on, and it says so.
    expect(screen.getByText('Used for job matching')).toBeInTheDocument();
    expect(screen.getByText('Reading your resume')).toBeInTheDocument();
    expect(screen.getAllByText('Ready')).toHaveLength(2);

    // Unparsed rows can't be activated (the backend would answer 409).
    const useButtons = screen.getAllByRole('button', { name: 'Use for job matching' });
    expect(useButtons).toHaveLength(2); // beta (enabled) + gamma (disabled)
    expect(useButtons[0]).toBeEnabled();
    expect(useButtons[1]).toBeDisabled();
  });

  test('active switch calls setActiveResume with the resume_id and reloads', async () => {
    api.setActiveResume.mockResolvedValue({ data: { resume_id: 'ra-parsed' } });
    renderPage();

    const [betaButton] = await screen.findAllByRole('button', {
      name: 'Use for job matching',
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
    renderPage();

    const [betaButton] = await screen.findAllByRole('button', {
      name: 'Use for job matching',
    });
    await userEvent.click(betaButton);

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Couldn't switch resumes",
        expect.objectContaining({
          description: 'We are still reading this resume. Try again in a moment.',
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
    const { container } = renderPage();
    await screen.findByText('alpha.pdf');

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    fireEvent.change(input as HTMLInputElement, {
      target: { files: [new File(['x'], 'resume.pdf', { type: 'application/pdf' })] },
    });

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Couldn't upload that file",
        expect.objectContaining({
          description: expect.stringMatching(/temporarily unavailable/i),
        }),
      ),
    );
  });
  test('shows what was read from the resume job matching uses', async () => {
    renderPage();

    const panel = await screen.findByRole('complementary', {
      name: /what we read from your resume/i,
    });
    expect(within(panel).getByText(/From alpha\.pdf/)).toBeInTheDocument();
    expect(within(panel).getByText('2 years')).toBeInTheDocument();
    expect(within(panel).getByText('Data Analyst Intern, Junior Business Analyst')).toBeInTheDocument();
    for (const skill of ['SQL', 'Python', 'Tableau']) {
      expect(within(panel).getByText(skill)).toBeInTheDocument();
    }
  });

  test('a failed read of that summary never breaks the list', async () => {
    api.getResumeStatus.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByText('alpha.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: /what we read/i })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('View opens the stored file for that row', async () => {
    api.downloadResumeFile.mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }));
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    // jsdom has no object URLs.
    const createObjectURL = vi.fn(() => 'blob:fixture');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    renderPage();

    const [viewAlpha] = await screen.findAllByRole('button', { name: 'View' });
    await userEvent.click(viewAlpha);

    await waitFor(() => expect(api.downloadResumeFile).toHaveBeenCalledWith('ra-active'));
    expect(open).toHaveBeenCalledWith('blob:fixture', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });
});
