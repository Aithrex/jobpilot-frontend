/**
 * The dashboard's "Top matches" panel reads the SAME shared job feed as the
 * "For you" board, and must show the SAME default view: restricted to the
 * candidate's own experience levels (the server `experience_view`, which the
 * provider seeds into `seniorityLevels`) and best-match-first.
 *
 * This mirrors src/components/job-search/__tests__/experience-level-default.test.tsx
 * at the dashboard surface: a junior candidate must not see an architect or an
 * executive role in their top matches, and the active view is surfaced as a
 * compact chip so the user understands WHY these roles. An older backend with
 * no view falls back to showing every level, and never a misleading chip.
 */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { TopMatchesPanel } from '@/app-shell/pages/today/TopMatchesPanel';
import type { ExperienceView, WorkdayJob } from '@/types/jobs';
import type { SeniorityLevel } from '@/lib/careerJobs';
import { selectForYouJobs } from '@/lib/forYouSelection';

// Keep the row chrome light and provider-free: the fit button and the logo
// both read context/network we do not need for a filter/order assertion.
vi.mock('@/components/CompanyLogo', () => ({
  CompanyLogo: () => <span data-testid="logo" />,
}));
vi.mock('@/components/job-search/JobFitDetails', () => ({
  WhyThisScoreButton: () => <span data-testid="why" />,
}));

// The panel's single source of truth. We mock the whole context so we can set
// the feed, the active levels, and the server view directly.
const ctx = {
  ensureStarted: vi.fn(),
  jobs: [] as WorkdayJob[],
  seniorityLevels: [] as SeniorityLevel[],
  experienceView: null as ExperienceView | null,
  sortBy: 'score' as 'score' | 'newest',
  recency: 'today' as const,
  search: '',
  minScore: 0,
  sponsorFilter: 'friendly' as const,
  showApplied: false,
  hiddenJobIds: new Set<string>(),
  getJobStatus: (_id: string) => null as string | null,
  get visibleJobs() { return selectForYouJobs(this.jobs, this).visibleJobs; },
  ready: true,
  canSearch: true,
  loading: false,
  hasResult: true,
  resumeSkillCount: 5,
  progress: { done: 1, total: 1 },
  states: {
    workday: { error: null },
    careers: { error: null },
    mncs: { error: null },
  },
  sync: vi.fn(),
};

vi.mock('@/components/job-search/CombinedJobsProvider', () => ({
  useCombinedJobsCtx: () => ctx,
}));

/** A scored career-portal row at a given seniority band. */
function job(id: string, title: string, seniority: string, score: number): WorkdayJob {
  return {
    job_id: id,
    title,
    company: 'Acme',
    location: 'Remote',
    seniority,
    match_score: score,
    score_version: 'v1',
    fit: { score_version: 'v1' },
  } as unknown as WorkdayJob;
}

const JUNIOR_VIEW: ExperienceView = {
  levels: ['entry', 'mid'],
  source: 'preference+resume',
  years: 3,
  preference: 'Junior',
};

// A deliberately mixed feed: two early-career roles and two senior/exec roles.
const FEED: WorkdayJob[] = [
  job('exec', 'VP of Engineering', 'staff', 99),
  job('arch', 'Principal Architect', 'staff', 95),
  job('mid', 'Software Engineer II', 'mid', 88),
  job('entry', 'Associate Engineer', 'entry', 82),
];

function renderPanel() {
  return render(
    <MemoryRouter>
      <TopMatchesPanel />
    </MemoryRouter>,
  );
}

function rowTitles(): string[] {
  const list = screen.getByRole('list');
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.querySelector('a')?.textContent?.trim() ?? '')
    .filter(Boolean);
}

beforeEach(() => {
  vi.clearAllMocks();
  ctx.jobs = FEED;
  ctx.seniorityLevels = [];
  ctx.experienceView = null;
  ctx.sortBy = 'score';
  ctx.hiddenJobIds = new Set();
  ctx.getJobStatus = () => null;
});

describe('dashboard matches respect the default experience view', () => {
  test('Home excludes older, hidden, applied and sponsorship-refused roles from the same 19-role feed', () => {
    ctx.seniorityLevels = ['entry', 'mid'];
    ctx.experienceView = JUNIOR_VIEW;
    ctx.jobs = [
      ...Array.from({ length: 12 }, (_, i) => ({ ...job(`senior-${i}`, `Senior Role ${i}`, 'senior', 99), days_ago: 0 })),
      { ...job('hidden', 'Hidden Role', 'entry', 99), days_ago: 0 },
      { ...job('applied', 'Applied Role', 'entry', 98), days_ago: 0 },
      { ...job('refused', 'Refused Role', 'entry', 97), days_ago: 0, sponsorship: 'refused' },
      { ...job('older', 'Older Role', 'entry', 96), days_ago: 5 },
      ...Array.from({ length: 3 }, (_, i) => ({ ...job(`visible-${i}`, `Visible Role ${i}`, 'entry', 90 - i), days_ago: 0 })),
    ] as WorkdayJob[];
    ctx.hiddenJobIds = new Set(['hidden']);
    ctx.getJobStatus = (id) => id === 'applied' ? 'applied' : null;
    renderPanel();
    expect(rowTitles().map((title) => title.split(' (')[0])).toEqual(['Visible Role 0', 'Visible Role 1', 'Visible Role 2']);
  });
  test('a junior view keeps only entry/mid roles, best-match-first', () => {
    // The provider seeds seniorityLevels from the server view.
    ctx.seniorityLevels = ['entry', 'mid'];
    ctx.experienceView = JUNIOR_VIEW;
    renderPanel();

    const titles = rowTitles();
    expect(titles.join(' | ')).toContain('Software Engineer II');
    expect(titles.join(' | ')).toContain('Associate Engineer');
    // The architect and the executive roles must NOT appear.
    expect(titles.join(' | ')).not.toContain('Engineering');
    expect(titles.join(' | ')).not.toContain('Principal Architect');
    // Best match first: the mid role (88) leads the entry role (82).
    expect(titles[0]).toContain('Software Engineer II');
  });

  test('the active experience view is surfaced as a compact chip', () => {
    ctx.seniorityLevels = ['entry', 'mid'];
    ctx.experienceView = JUNIOR_VIEW;
    renderPanel();
    expect(screen.getByText('Entry + Mid')).toBeInTheDocument();
    expect(screen.getByText(/using your selected experience levels/i)).toBeInTheDocument();
  });

  test('no server view: every level shows and no chip is rendered', () => {
    ctx.seniorityLevels = [];
    ctx.experienceView = null;
    renderPanel();

    const titles = rowTitles();
    // Unfiltered: the senior roles are present again (current fallback).
    expect(titles.join(' | ')).toContain('VP Of Engineering');
    expect(titles.join(' | ')).toContain('Principal Architect');
    // No misleading chip while there is no resolved view.
    expect(screen.queryByText(/using your selected experience levels/i)).not.toBeInTheDocument();
  });

  test('the experience chip shows an override rather than the inferred default', () => {
    ctx.seniorityLevels = ['staff'];
    ctx.experienceView = JUNIOR_VIEW;
    renderPanel();
    expect(screen.getByText('Staff+')).toBeInTheDocument();
    expect(screen.queryByText('Entry + Mid')).not.toBeInTheDocument();
  });
});
