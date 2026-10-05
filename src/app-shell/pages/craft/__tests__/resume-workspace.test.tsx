/**
 * Resume workspace shell + overview.
 *
 * Covers the information-architecture contract of the redesign:
 *   - the horizontal sub-tab strip is gone, replaced by a grouped left rail
 *     using the exact headings CREATE / MANAGE / INSIGHTS;
 *   - "Six Seconds" keeps its product name verbatim;
 *   - every existing deep link still resolves to its feature;
 *   - `/app/resume` renders the overview instead of redirecting to Tailor.
 *
 * The API layer is mocked at the apiService boundary (house style).
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import CraftPage from '@/app-shell/pages/CraftPage';
import ResumeOverviewPage from '@/app-shell/pages/craft/ResumeOverviewPage';
import { RESUME_SECTIONS } from '@/app-shell/nav.config';
import type { ResumeAssetRow, TailoringRecord } from '@/types/resume';

vi.mock('@/lib/api', () => ({
  apiService: {
    listBaseResumes: vi.fn(),
    getTailoringHistoryPage: vi.fn(),
    downloadResumeFile: vi.fn(),
    getApplicationStreak: vi.fn(),
    getDailyUsage: vi.fn(),
  },
}));

// The overview panel's streak + quota both gate on an authenticated user.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { email: 'a@b.c' } }),
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

/** Mount the shell at `path` with a stub for each real child route. */
function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/resume" element={<CraftPage />}>
          <Route index element={<ResumeOverviewPage />} />
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
  api.getApplicationStreak.mockResolvedValue({
    data: {
      current_streak: 3,
      longest_streak: 9,
      today_count: 1,
      total_applications: 12,
      last_application_date: '2026-07-30',
      heatmap: [],
    },
  });
  api.getDailyUsage.mockResolvedValue({
    data: {
      used: 2,
      limit: 5,
      remaining: 3,
      resets_at: '2026-08-01T00:00:00Z',
      resets_in_seconds: 3600,
      date: '2026-07-31',
    },
  });
});

describe('Resume workspace navigation', () => {
  test('renders a grouped rail, not a horizontal tab strip', async () => {
    renderShell('/app/resume/tailor');

    // Exactly one Resume-scoped nav landmark on desktop + the mobile trigger's
    // sheet content is not open, so the rail is the only section nav present.
    const rail = await screen.findByRole('navigation', { name: /resume sections/i });

    for (const heading of ['Create', 'Manage', 'Insights']) {
      expect(within(rail).getByText(heading)).toBeInTheDocument();
    }
  });

  test('keeps the "Six Seconds" product name verbatim', async () => {
    renderShell('/app/resume/tailor');
    const rail = await screen.findByRole('navigation', { name: /resume sections/i });

    expect(within(rail).getByRole('link', { name: /six seconds/i })).toBeInTheDocument();
    // The rejected rename must not appear anywhere.
    expect(screen.queryByText(/first-glance scan/i)).not.toBeInTheDocument();
  });

  test('rail exposes every section exactly once, with no orphans', async () => {
    renderShell('/app/resume/tailor');
    const rail = await screen.findByRole('navigation', { name: /resume sections/i });

    const hrefs = within(rail)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));

    expect(hrefs).toHaveLength(RESUME_SECTIONS.length);
    for (const section of RESUME_SECTIONS) {
      expect(hrefs).toContain(`/app/resume/${section.to}`);
    }
    // No "More" fallback group means every section was explicitly placed.
    expect(within(rail).queryByText('More')).not.toBeInTheDocument();
  });

  test.each(RESUME_SECTIONS.map((s) => s.to))('deep link /app/resume/%s still resolves', async (to) => {
    renderShell(`/app/resume/${to}`);
    expect(await screen.findByText(`stub:${to}`)).toBeInTheDocument();
  });

  test('marks the active section with aria-current, not colour alone', async () => {
    renderShell('/app/resume/library');
    const rail = await screen.findByRole('navigation', { name: /resume sections/i });

    const active = within(rail).getByRole('link', { current: 'page' });
    expect(active).toHaveAttribute('href', '/app/resume/library');
  });
});

describe('Resume health panel', () => {
  test('reports only checks derived from real loaded data', async () => {
    renderShell('/app/resume/tailor');
    const dock = await screen.findByRole('navigation', { name: /resume sections/i });

    expect(within(dock).getByText('Resume health')).toBeInTheDocument();
    // Active + parsed + has-tailored, all satisfied by the fixtures above.
    expect(await within(dock).findByText('Active resume set')).toBeInTheDocument();
    expect(within(dock).getByText('Resume parsed and ready')).toBeInTheDocument();
    expect(within(dock).getByText('Recent version saved')).toBeInTheDocument();
    expect(within(dock).getByText('3/3')).toBeInTheDocument();
  });

  test('states gaps honestly instead of inventing a score', async () => {
    api.listBaseResumes.mockResolvedValue({ data: { versions: [] } });
    api.getTailoringHistoryPage.mockResolvedValue({ data: { records: [], total: 0, next_cursor: null } });

    renderShell('/app/resume/tailor');
    const dock = await screen.findByRole('navigation', { name: /resume sections/i });

    expect(await within(dock).findByText('No active resume')).toBeInTheDocument();
    expect(within(dock).getByText('Nothing tailored yet')).toBeInTheDocument();
    expect(within(dock).getByText('0/3')).toBeInTheDocument();
  });

  test('an unparsed resume counts as a real, actionable gap', async () => {
    api.listBaseResumes.mockResolvedValue({
      data: { versions: [{ ...baseResumes()[0], parse_status: 'pending' }] },
    });

    renderShell('/app/resume/tailor');
    const dock = await screen.findByRole('navigation', { name: /resume sections/i });

    expect(await within(dock).findByText('Active resume set')).toBeInTheDocument();
    expect(within(dock).getByText('Resume not parsed yet')).toBeInTheDocument();
    expect(within(dock).getByText('2/3')).toBeInTheDocument();
  });

  test('shows no ratio while data is still unknown', async () => {
    // An endpoint that errors leaves its checks indeterminate - the panel must
    // not present a confident "n/3" built on a failed read.
    api.getTailoringHistoryPage.mockResolvedValue({ error: 'boom' });

    renderShell('/app/resume/tailor');
    const dock = await screen.findByRole('navigation', { name: /resume sections/i });

    await waitFor(() =>
      expect(within(dock).getByText('Active resume set')).toBeInTheDocument(),
    );
    expect(within(dock).queryByText(/^\d\/3$/)).toBeNull();
    expect(within(dock).getByText('Tailored history unavailable')).toBeInTheDocument();
    expect(within(dock).queryByText('Nothing tailored yet')).toBeNull();
  });
});

describe('Resume overview', () => {
  test('/app/resume renders the workspace overview, not a Tailor redirect', async () => {
    renderShell('/app/resume');

    expect(await screen.findByRole('heading', { name: /shape your story/i })).toBeInTheDocument();
    expect(screen.getByText(/create stronger resumes for every opportunity/i)).toBeInTheDocument();
    expect(screen.queryByText('stub:tailor')).not.toBeInTheDocument();
  });

  test('surfaces the active resume and recent tailored versions', async () => {
    renderShell('/app/resume');

    expect(await screen.findByText('alpha.pdf')).toBeInTheDocument();
    // Scraped ALL-CAPS strings are title-cased for display.
    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    expect(screen.getByText(/ATS 82/)).toBeInTheDocument();
  });

  test('offers an upload path when there is no resume yet', async () => {
    api.listBaseResumes.mockResolvedValue({ data: { versions: [] } });
    renderShell('/app/resume');

    expect(await screen.findByText(/no resume yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload a resume/i })).toHaveAttribute(
      'href',
      '/app/resume/library',
    );
  });

  test('each panel fails independently and stays retryable', async () => {
    api.getTailoringHistoryPage.mockResolvedValue({ error: 'boom' });
    renderShell('/app/resume');

    // The resume panel still renders its data...
    expect(await screen.findByText('alpha.pdf')).toBeInTheDocument();
    // ...while only the tailored panel shows a recoverable error.
    await waitFor(() =>
      expect(screen.getByText(/could not load tailored versions/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  test('a tailored row is clickable as a whole, not via a small text link', async () => {
    renderShell('/app/resume');

    // One link per record - the row itself. A separate "Review" text target
    // inside the row would show up as a second, nested link.
    const row = (await screen.findByRole('link', { name: /review tailored resume for staff engineer/i }));
    expect(row).toHaveAttribute('href', '/app/resume/tailored');
    expect(within(row).queryByRole('link')).toBeNull();
    // The row carries the record's facts, so the label is not the only cue.
    expect(within(row).getByText(/ATS 82/)).toBeInTheDocument();
  });

});

describe('No duplicated controls', () => {
  // The right column used to repeat Six Seconds / Voice analysis as tiles and
  // the header repeated "Tailor a resume" as a button, so three destinations
  // were each reachable twice from one viewport. The dock is now the only
  // place tools launch from.
  test.each([
    ['Six Seconds', /^six seconds$/i],
    ['Voice analysis', /^voice analysis$/i],
    ['Tailor a resume', /^tailor a resume$/i],
  ])('%s appears exactly once on the overview', async (_label, pattern) => {
    renderShell('/app/resume');
    await screen.findByRole('navigation', { name: /resume sections/i });

    expect(screen.getAllByRole('link', { name: pattern })).toHaveLength(1);
  });

  test('the only occurrence is the dock row', async () => {
    renderShell('/app/resume');
    const dock = await screen.findByRole('navigation', { name: /resume sections/i });

    for (const pattern of [/^six seconds$/i, /^voice analysis$/i, /^tailor a resume$/i]) {
      expect(within(dock).getByRole('link', { name: pattern })).toBeInTheDocument();
    }
  });
});

describe('Active resume preview', () => {
  test('renders the real file inline when it is a PDF', async () => {
    api.downloadResumeFile.mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }));
    renderShell('/app/resume');

    const frame = await screen.findByTitle(/preview of alpha\.pdf/i);
    expect(frame).toBeInTheDocument();
    expect(api.downloadResumeFile).toHaveBeenCalledWith('ra-1');
  });

  test('falls back quietly when the file cannot be previewed', async () => {
    // A DOCX cannot render in a browser at all - no request should even fire.
    api.listBaseResumes.mockResolvedValue({
      data: { versions: [{ ...baseResumes()[0], filename: 'alpha.docx' }] },
    });
    renderShell('/app/resume');

    expect(await screen.findByText(/preview not available here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open resume/i })).toBeInTheDocument();
    expect(api.downloadResumeFile).not.toHaveBeenCalled();
  });

  test('a failed download degrades to the fallback, never an error banner', async () => {
    // `downloadResumeFile` rejects by default in beforeEach.
    renderShell('/app/resume');

    expect(await screen.findByText(/preview not available here/i)).toBeInTheDocument();
    // The metadata above it is still correct and must survive.
    expect(screen.getByText('alpha.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Overview panel', () => {
  test('shows streak, library counts and the daily quota', async () => {
    renderShell('/app/resume');
    const panel = await screen.findByRole('complementary', { name: /resume overview/i });

    // Streak comes from the reused StreakWidget.
    expect(await within(panel).findByText('3')).toBeInTheDocument();
    // Counts are raw list lengths, not derived metrics.
    expect(within(panel).getByText('1 file')).toBeInTheDocument();
    expect(within(panel).getByText('123 versions')).toBeInTheDocument();
    expect(api.getTailoringHistoryPage).toHaveBeenCalledWith({ page_size: 5, sort: 'newest' });
    // Quota reuses QuotaMeter.
    expect(within(panel).getByText('Tailors today')).toBeInTheDocument();
    expect(within(panel).getByText('2 / 5')).toBeInTheDocument();
  });

  test('is absent inside a tool, where it would compete with the work', async () => {
    renderShell('/app/resume/tailor');
    await screen.findByText('stub:tailor');

    expect(screen.queryByRole('complementary', { name: /resume overview/i })).toBeNull();
  });
});
