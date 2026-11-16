/**
 * Resume destination shell + the Tailor start screen's two companions.
 *
 * Covers the information-architecture contract of the 2026-11-16 redesign:
 *   - Resume has one header and one tab strip, like Jobs, Tracker and Grow
 *     (the left dock, the overview page and the "resume health" panel are
 *     gone);
 *   - the tabs are named for what a person does there;
 *   - every existing deep link still resolves to its feature;
 *   - `/app/resume` opens on the Tailor tool;
 *   - the start screen shows the real resume file and the newest tailored
 *     versions, which is what the old overview page was for.
 *
 * The API layer is mocked at the apiService boundary (house style).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import CraftPage from '@/app-shell/pages/CraftPage';
import { RESUME_SECTIONS } from '@/app-shell/nav.config';
import { ResumeWorkspaceProvider } from '@/app-shell/pages/craft/ResumeWorkspaceContext';
import { RecentTailored } from '@/app-shell/pages/craft/tailor/RecentTailored';
import { StartPreview } from '@/app-shell/pages/craft/tailor/StartPreview';
import type { ResumeAssetRow, TailoringRecord } from '@/types/resume';

vi.mock('@/lib/api', () => ({
  apiService: {
    listBaseResumes: vi.fn(),
    getTailoringHistoryPage: vi.fn(),
    downloadResumeFile: vi.fn(),
  },
}));

const api = apiService as unknown as Record<string, Mock>;

function baseResumes(): ResumeAssetRow[] {
  return [
    {
      resume_id: 'ra-1',
      filename: 'alpha.pdf',
      uploaded_at: '2026-07-01T10:00:00Z',
      size_bytes: 120_000,
      parse_status: 'parsed',
      is_active: true,
    },
  ];
}

function tailoringRecords(): TailoringRecord[] {
  return [
    {
      record_id: 'rec-1',
      user_email: 'a@b.c',
      jd_analysis: { job_title: 'STAFF ENGINEER', company: 'ACME CORP' },
      ats_scores: { overall: 82 },
      created_at: '2026-07-20T10:00:00Z',
      application: { status: 'applied' },
    } as TailoringRecord,
  ];
}

/** Mount the shell at `path` with a stub for each real child route, and the
 *  same index redirect the app's route table uses. */
function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/resume" element={<CraftPage />}>
          <Route index element={<Navigate to="tailor" replace />} />
          {RESUME_SECTIONS.map((s) => (
            <Route key={s.to} path={s.to} element={<div>stub:{s.to}</div>} />
          ))}
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listBaseResumes.mockResolvedValue({ data: { versions: baseResumes() } });
  api.getTailoringHistoryPage.mockResolvedValue({ data: { records: tailoringRecords(), total: 123, next_cursor: null } });
  // Default: the preview download fails, which exercises the fallback path.
  // Individual tests opt into a successful blob.
  api.downloadResumeFile.mockRejectedValue(new Error('no file'));
});

describe('Resume destination navigation', () => {
  test('one header and one tab strip, with no dock, overview column or health panel', async () => {
    renderShell('/app/resume/tailor');

    expect(await screen.findByRole('heading', { level: 1, name: 'Resume' })).toBeInTheDocument();
    // Exactly one Resume-scoped nav landmark.
    expect(screen.getAllByRole('navigation', { name: /resume sections/i })).toHaveLength(1);
    expect(screen.queryByRole('complementary', { name: /resume overview/i })).toBeNull();
    expect(screen.queryByText(/resume health/i)).toBeNull();
    // The old dock's group headings are not navigation any more.
    for (const heading of ['Create', 'Manage']) {
      expect(screen.queryByText(heading)).toBeNull();
    }
  });

  test('tabs are named for what you do there', async () => {
    renderShell('/app/resume/tailor');
    const tabs = await screen.findByRole('navigation', { name: /resume sections/i });

    for (const name of ['Tailor for a job', 'Several jobs at once', 'My resumes', 'Tailored resumes']) {
      expect(within(tabs).getByRole('link', { name })).toBeInTheDocument();
    }
    // The feature names these replaced needed explaining.
    for (const jargon of ['Batch', 'Library', 'Tailored versions']) {
      expect(within(tabs).queryByRole('link', { name: jargon })).toBeNull();
    }
  });

  test('hides deferred resume analysis tools', async () => {
    renderShell('/app/resume/tailor');
    const tabs = await screen.findByRole('navigation', { name: /resume sections/i });

    expect(within(tabs).queryByRole('link', { name: /six seconds|voice analysis/i })).not.toBeInTheDocument();
    // The rejected rename must not appear anywhere.
    expect(screen.queryByText(/first-glance scan/i)).not.toBeInTheDocument();
  });

  test('the strip exposes every section exactly once, with no orphans', async () => {
    renderShell('/app/resume/tailor');
    const tabs = await screen.findByRole('navigation', { name: /resume sections/i });

    const hrefs = within(tabs)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));

    expect(hrefs).toHaveLength(RESUME_SECTIONS.length);
    for (const section of RESUME_SECTIONS) {
      expect(hrefs).toContain(`/app/resume/${section.to}`);
    }
  });

  test.each(RESUME_SECTIONS.map((s) => s.to))('deep link /app/resume/%s still resolves', async (to) => {
    renderShell(`/app/resume/${to}`);
    expect(await screen.findByText(`stub:${to}`)).toBeInTheDocument();
  });

  test('marks the active section with aria-current, not colour alone', async () => {
    renderShell('/app/resume/library');
    const tabs = await screen.findByRole('navigation', { name: /resume sections/i });

    const active = within(tabs).getByRole('link', { current: 'page' });
    expect(active).toHaveAttribute('href', '/app/resume/library');
  });

  test('/app/resume opens on the Tailor tool, the thing the destination is for', async () => {
    renderShell('/app/resume');

    expect(await screen.findByText('stub:tailor')).toBeInTheDocument();
    const tabs = screen.getByRole('navigation', { name: /resume sections/i });
    expect(within(tabs).getByRole('link', { current: 'page' })).toHaveAttribute(
      'href',
      '/app/resume/tailor',
    );
  });

  test('the shell reads the shared model once, for whichever section wants it', async () => {
    renderShell('/app/resume/tailor');
    await screen.findByText('stub:tailor');

    await waitFor(() => expect(api.listBaseResumes).toHaveBeenCalledTimes(1));
    expect(api.getTailoringHistoryPage).toHaveBeenCalledTimes(1);
    expect(api.getTailoringHistoryPage).toHaveBeenCalledWith({ page_size: 5, sort: 'newest' });
  });
});

describe('Recently tailored (Tailor start screen)', () => {
  function renderRecent() {
    return render(
      <MemoryRouter>
        <ResumeWorkspaceProvider>
          <RecentTailored />
        </ResumeWorkspaceProvider>
      </MemoryRouter>,
    );
  }

  test('lists the newest tailored resumes with their facts', async () => {
    renderRecent();

    const section = await screen.findByRole('region', { name: /recently tailored/i });
    // Scraped ALL-CAPS strings are title-cased for display.
    expect(within(section).getByText('Staff Engineer')).toBeInTheDocument();
    expect(within(section).getByText(/Acme Corp/)).toBeInTheDocument();
    expect(within(section).getByText('82')).toBeInTheDocument();
    // The count is the server's total, not the length of the page we loaded.
    expect(within(section).getByRole('link', { name: /see all 123/i })).toHaveAttribute(
      'href',
      '/app/resume/tailored',
    );
  });

  test('each one is a single link as a whole, not a small text target', async () => {
    renderRecent();

    const card = await screen.findByRole('link', {
      name: /open the resume tailored for staff engineer at acme corp/i,
    });
    expect(card).toHaveAttribute('href', '/app/resume/tailored');
    expect(within(card).queryByRole('link')).toBeNull();
    expect(within(card).getByText('82')).toBeInTheDocument();
  });

  test('says nothing when nothing was tailored yet', async () => {
    api.getTailoringHistoryPage.mockResolvedValue({ data: { records: [], total: 0, next_cursor: null } });
    renderRecent();

    await waitFor(() => expect(api.getTailoringHistoryPage).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: /recently tailored/i })).toBeNull();
  });

  test('a failed history read hides the list instead of showing an empty one', async () => {
    // A failed read is unknown, never "you have tailored nothing".
    api.getTailoringHistoryPage.mockResolvedValue({ error: 'boom' });
    renderRecent();

    await waitFor(() => expect(api.getTailoringHistoryPage).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: /recently tailored/i })).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('renders nothing outside the Resume shell', () => {
    const { container } = render(
      <MemoryRouter>
        <RecentTailored />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Your resume now (Tailor start screen)', () => {
  function renderPreview(resume: ResumeAssetRow | null) {
    return render(
      <MemoryRouter>
        <StartPreview resume={resume} />
      </MemoryRouter>,
    );
  }

  test('names the file and renders it inline when it is a PDF', async () => {
    api.downloadResumeFile.mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }));
    renderPreview(baseResumes()[0]);

    expect(screen.getByText('Your resume now')).toBeInTheDocument();
    expect(screen.getByText('alpha.pdf')).toBeInTheDocument();
    const frame = await screen.findByTitle(/preview of alpha\.pdf/i);
    expect(frame).toBeInTheDocument();
    expect(api.downloadResumeFile).toHaveBeenCalledWith('ra-1');
  });

  test('falls back quietly when the file cannot be previewed', async () => {
    // A DOCX cannot render in a browser at all - no request should even fire.
    renderPreview({ ...baseResumes()[0], filename: 'alpha.docx' });

    expect(await screen.findByText(/preview not available here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open resume/i })).toBeInTheDocument();
    expect(api.downloadResumeFile).not.toHaveBeenCalled();
  });

  test('a failed download degrades to the fallback, never an error banner', async () => {
    // `downloadResumeFile` rejects by default in beforeEach.
    renderPreview(baseResumes()[0]);

    expect(await screen.findByText(/preview not available here/i)).toBeInTheDocument();
    // The file name above it is still correct and must survive.
    expect(screen.getByText('alpha.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('always offers the way to change or add a resume', () => {
    renderPreview(baseResumes()[0]);

    expect(screen.getByRole('link', { name: /change or add a resume/i })).toHaveAttribute(
      'href',
      '/app/resume/library',
    );
  });

  test('says so when no resume is ready, without guessing why', () => {
    renderPreview(null);

    expect(screen.getByText(/not ready yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open my resumes/i })).toHaveAttribute(
      'href',
      '/app/resume/library',
    );
  });
});
