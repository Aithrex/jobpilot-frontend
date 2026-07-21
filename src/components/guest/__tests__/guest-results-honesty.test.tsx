/**
 * Guest results honesty - behavior/contract tests for the four claims the
 * guest match surface now makes about ITS OWN data:
 *
 *  1. partial job batches stream in and assemble progressively, with a stable
 *     visible order (append/merge by match_id, never a re-sort);
 *  2. freshness on every card comes from SERVER values only - never computed,
 *     never defaulted to "today";
 *  3. the FitScore v2 breakdown renders when the server sends it and degrades
 *     to the single scalar when it does not;
 *  4. the profile reveal shows real extracted COUNTS, and the invented
 *     "profile completeness" ring is gone.
 *
 * Mocked at the `apiService` boundary (never fetch, never component
 * internals), matching the sibling landing-flow suite.
 */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import LandingExperience from '@/components/landing/LandingExperience';
import { mergeMatchBatch } from '@/hooks/useGuestFlow';
import type { GuestJobMatch } from '@/types/guest';

// -- Module mocks ----------------------------------------------------------

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: {
    guestSession: vi.fn(),
    guestOnboard: vi.fn(),
    guestJobPoll: vi.fn(),
    guestMatches: vi.fn(),
    guestTailor: vi.fn(),
    guestDownloadIssue: vi.fn(),
    guestDownloadUrl: vi.fn((token: string) => `#download-${token}`),
    guestClaim: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/guest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/guest')>();
  return { ...actual, getFingerprintHash: vi.fn(async () => 'fp-test') };
});

const api = apiService as unknown as Record<string, Mock>;

// -- Fixtures --------------------------------------------------------------

function matchFix(i: number, extra: Partial<GuestJobMatch> = {}): GuestJobMatch {
  return {
    match_id: `m${i}`,
    title: `Role ${i}`,
    company: `Company ${i}`,
    location: `City ${i}`,
    match_score: 90 - i,
    matched_skills: ['React', 'TypeScript'],
    why: `Why fixture ${i}: strong overlap with your React work.`,
    source: 'greenhouse',
    ...extra,
  };
}

/** A full FitScore v2 payload, in the object-map component form. */
const fitV2 = {
  score: 82,
  band: 'strong',
  confidence: 'high',
  score_version: '2.0',
  components: {
    role_title: 20,
    required_skills: 24,
    experience_seniority: 15,
    location_work_mode: 3,
  },
  evidence: [
    {
      component: 'required_skills',
      text: 'Your resume lists React, TypeScript and GraphQL, all named as required.',
    },
    { label: 'Experience', text: 'Five years of frontend work against a 4 year minimum.' },
    'Shipped a design system, which this posting calls out by name.',
  ],
  missing_requirements: ['Kubernetes in production'],
  hard_constraints: [
    { label: 'Work authorization', text: 'US work authorization required', satisfied: false },
  ],
  explanation: 'Strong overlap on the core stack, with one unmet hard requirement.',
};

const parseResultWithProfile = {
  parsed_resume: {
    structured: {
      contact: { name: 'Alex Doe' },
      summary: 'Frontend engineer with five years of React.',
      skills: ['React', 'TypeScript', 'GraphQL', 'Node', 'Testing'],
      experience: [
        { title: 'Frontend Engineer', company: 'RealCo', dates: '2021-2026' },
        { title: 'Engineer', company: 'OldCo', dates: '2019-2021' },
        { title: 'Junior Engineer', company: 'FirstCo', dates: '2018-2019' },
      ],
    },
    filename: 'resume.pdf',
  },
  guest: { tailors_used: 0, tailors_limit: 1 },
  profile: {
    first_name: 'Alex',
    headline_title: 'Frontend Engineer',
    experience_level: 'Mid-level',
    years: 6,
    skills: ['React', 'TypeScript', 'GraphQL'],
  },
};

// -- Harness ---------------------------------------------------------------

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TooltipProvider>
        <LandingExperience />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

function seedReturningGuest() {
  localStorage.setItem('guest_id', 'g-1');
  api.guestSession.mockResolvedValue({
    data: { exists: true, has_resume: true, tailors_used: 0, tailors_limit: 1 },
    status: 200,
  });
}

async function openMatches(user: ReturnType<typeof userEvent.setup>) {
  renderLanding();
  await user.click(await screen.findByRole('button', { name: /See today's matches/i }));
}

async function findDesktopMatchesList() {
  const lists = await screen.findAllByRole('list', { name: 'Matched jobs' });
  return lists[0];
}

/** Visible titles, in DOM order, inside a match list. */
function titlesIn(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.textContent?.match(/Role \d+/)?.[0] ?? '');
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  api.guestSession.mockResolvedValue({ data: { exists: false }, status: 200 });
  api.guestOnboard.mockResolvedValue({ error: 'guestOnboard not configured', status: 500 });
  api.guestJobPoll.mockResolvedValue({ error: 'guestJobPoll not configured', status: 500 });
  api.guestMatches.mockResolvedValue({ error: 'guestMatches not configured', status: 500 });
  api.guestTailor.mockResolvedValue({ error: 'guestTailor not configured', status: 500 });
});

// -- 1. Progressive assembly ----------------------------------------------

describe('partial job batches', () => {
  test('mergeMatchBatch appends new ids in server order and never re-sorts what is on screen', () => {
    const first = mergeMatchBatch([], [matchFix(2), matchFix(1)]);
    expect(first.map((m) => m.match_id)).toEqual(['m2', 'm1']);

    // A later batch re-sorted by score, plus a new row: existing cards hold
    // their positions and only the genuinely new id appends.
    const second = mergeMatchBatch(first, [matchFix(1), matchFix(2), matchFix(3)]);
    expect(second.map((m) => m.match_id)).toEqual(['m2', 'm1', 'm3']);

    // A repeated identical batch is a no-op (same reference, no re-render).
    expect(mergeMatchBatch(second, [matchFix(1), matchFix(2), matchFix(3)])).toBe(second);

    // Rows that cannot render honestly are skipped, never invented.
    expect(
      mergeMatchBatch([], [{ match_id: '', title: 'x' }, { title: 'no id' }] as GuestJobMatch[]),
    ).toHaveLength(0);
  });

  test('streamed batches assemble real cards while the scan is still running', async () => {
    seedReturningGuest();
    let emit: ((jobs: GuestJobMatch[]) => void) | undefined;
    api.guestMatches.mockImplementation((...args: unknown[]) => {
      emit = args[6] as (jobs: GuestJobMatch[]) => void;
      emit?.([matchFix(2), matchFix(1)]);
      // The scan keeps running: the flow stays in its loading state.
      return new Promise(() => {});
    });

    const user = userEvent.setup();
    await openMatches(user);

    const partial = await screen.findByTestId('partial-matches');
    expect(within(partial).getByText(/2 matches found so far/)).toBeInTheDocument();
    const list = within(partial).getByRole('list', { name: 'Matches found so far' });
    expect(titlesIn(list)).toEqual(['Role 2', 'Role 1']);

    // A later batch arrives re-sorted with one addition: no reordering churn.
    await act(async () => {
      emit!([matchFix(1), matchFix(2), matchFix(3)]);
    });
    await waitFor(() => expect(titlesIn(list)).toEqual(['Role 2', 'Role 1', 'Role 3']));

    // Real cards replace the skeletons rather than sitting beside them.
    expect(screen.queryByRole('list', { name: 'Matched jobs' })).not.toBeInTheDocument();
  });

  test('no partial batches: the loading state is exactly as before', async () => {
    seedReturningGuest();
    api.guestMatches.mockImplementation(
      (_gid, _token, _signal, _onStatus, onProgress) => {
        onProgress?.({ phase: 'searching_sources' });
        return new Promise(() => {});
      },
    );
    const user = userEvent.setup();
    await openMatches(user);

    await screen.findByText('Searching live sources');
    expect(screen.queryByTestId('partial-matches')).not.toBeInTheDocument();
  });

  test('the completed payload is the final authority over any streamed preview', async () => {
    seedReturningGuest();
    api.guestMatches.mockImplementation(async (...args: unknown[]) => {
      (args[6] as (jobs: GuestJobMatch[]) => void)?.([matchFix(9), matchFix(8)]);
      return { data: { jobs: [matchFix(1), matchFix(2)], cached: false }, status: 200 };
    });
    const user = userEvent.setup();
    await openMatches(user);

    const list = await findDesktopMatchesList();
    await waitFor(() => expect(titlesIn(list)).toEqual(['Role 1', 'Role 2']));
    expect(screen.queryByTestId('partial-matches')).not.toBeInTheDocument();
    expect(screen.queryByText('Role 9')).not.toBeInTheDocument();
  });
});

// -- 2. Server-authoritative freshness -------------------------------------

describe('freshness', () => {
  test('renders from server values on every card, and renders nothing when absent', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: {
        jobs: [
          matchFix(1, { days_ago: 2, posted: '2026-07-19' }),
          matchFix(2, { posted_text: 'Posted yesterday', days_ago: 1 }),
          matchFix(3, { days_ago: 0 }),
          matchFix(4), // no server freshness at all
        ],
        cached: true,
      },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);
    const list = await findDesktopMatchesList();
    const [row1, row2, row3, row4] = within(list).getAllByRole('listitem');

    // days_ago -> words, computed by NOBODY on the client.
    expect(within(row1).getByText('Posted 2 days ago')).toBeInTheDocument();
    // posted_text wins verbatim when the server supplies it.
    expect(within(row2).getByText('Posted yesterday')).toBeInTheDocument();
    expect(within(row2).queryByText('Posted 1 day ago')).not.toBeInTheDocument();
    // days_ago 0 is a real server value, so "today" here is server-said.
    expect(within(row3).getByText('Posted today')).toBeInTheDocument();
    // No server value = no freshness, and never a "today" fallback.
    expect(within(row4).queryByText(/^Posted/)).not.toBeInTheDocument();

    // The machine-readable date comes from `posted`, never a client clock.
    expect(within(row1).getByText('Posted 2 days ago').closest('time')).toHaveAttribute(
      'datetime',
      '2026-07-19',
    );
  });

  test('freshness also reaches the detail pane', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: { jobs: [matchFix(1, { days_ago: 3 })], cached: true },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);
    await screen.findByText(/Why fixture 1/);
    // Desktop card + detail header both carry it.
    expect(screen.getAllByText('Posted 3 days ago').length).toBeGreaterThanOrEqual(2);
  });
});

// -- 3. Fit component breakdown --------------------------------------------

describe('fit breakdown', () => {
  test('renders band, component contributions, evidence and genuine constraints', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: { jobs: [matchFix(1, { fit: fitV2 })], cached: true },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);

    const panel = await screen.findByTestId('fit-breakdown');
    // Band + version stamp come from the server.
    expect(within(panel).getByText('Strong fit')).toBeInTheDocument();
    expect(within(panel).getByText('Scorer 2.0')).toBeInTheDocument();
    expect(within(panel).getByText(/Strong overlap on the core stack/)).toBeInTheDocument();

    // Component contributions, scaled against the published weights.
    expect(within(panel).getByText('Required skills')).toBeInTheDocument();
    expect(within(panel).getByText('24 of 30')).toBeInTheDocument();
    expect(within(panel).getByText('Role and title')).toBeInTheDocument();
    expect(within(panel).getByText('20 of 25')).toBeInTheDocument();

    // Evidence-backed reasons, capped at three.
    expect(
      within(panel).getByText(/all named as required/),
    ).toBeInTheDocument();
    expect(within(panel).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);

    // Genuine missing requirements + hard constraints, both attributed to the
    // POSTING rather than presented as a verdict on the person.
    expect(within(panel).getByText('Kubernetes in production')).toBeInTheDocument();
    expect(
      within(panel).getByText(/Work authorization: US work authorization required/),
    ).toBeInTheDocument();
    expect(within(panel).getByText(/Read off this posting/)).toBeInTheDocument();
  });

  test('supports the array component form too', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: {
        jobs: [
          matchFix(1, {
            fit: {
              band: 'moderate',
              components: [
                { key: 'required_skills', label: 'Must-have skills', score: 12, max: 30 },
                { key: 'domain', score: 5 },
              ],
            },
          }),
        ],
        cached: true,
      },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);

    const panel = await screen.findByTestId('fit-breakdown');
    expect(within(panel).getByText('Must-have skills')).toBeInTheDocument();
    expect(within(panel).getByText('12 of 30')).toBeInTheDocument();
    // Weight resolved from the published table when the server omits `max`.
    expect(within(panel).getByText('Domain')).toBeInTheDocument();
    expect(within(panel).getByText('5 of 5')).toBeInTheDocument();
  });

  test('degrades cleanly to the single score when the server sends no fit block', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: { jobs: [matchFix(1)], cached: true },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);

    await screen.findByText(/Why fixture 1/);
    expect(screen.queryByTestId('fit-breakdown')).not.toBeInTheDocument();
    // Today's scalar badge is untouched.
    expect(screen.getAllByText('Est. 89% match').length).toBeGreaterThanOrEqual(1);
  });

  test('an empty or malformed fit block never crashes and never invents a breakdown', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: {
        jobs: [
          matchFix(1, {
            fit: { score_version: '2.0', components: null, evidence: 'nope' },
          } as unknown as Partial<GuestJobMatch>),
        ],
        cached: true,
      },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);

    await screen.findByText(/Why fixture 1/);
    expect(screen.queryByTestId('fit-breakdown')).not.toBeInTheDocument();
  });
});

// -- 4. Real extracted counts ----------------------------------------------

describe('profile reveal counts', () => {
  test('shows real extracted counts and NO completeness ring', async () => {
    api.guestOnboard.mockResolvedValue({
      data: { guest_id: 'g-1', job_id: 'parse-job-1', device_token: 'dev-1' },
      status: 202,
    });
    api.guestJobPoll.mockResolvedValue({ data: parseResultWithProfile, status: 200 });

    renderLanding();
    const input = await screen.findByLabelText(/^Resume file/);
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'resume.pdf', { type: 'application/pdf' })] },
    });

    await screen.findByRole('region', { name: 'What we understood from your resume' });
    const counts = await screen.findByTestId('extracted-counts');
    // 5 structured skills, 3 real roles, 6 years - all genuinely extracted.
    expect(counts).toHaveTextContent('5 skills · 3 roles · 6 years detected');

    // The invented completeness score is gone in every form.
    expect(screen.queryByLabelText(/completeness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/completeness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument();
  });

  test('omits a count the parser did not produce, rather than showing a zero', async () => {
    api.guestOnboard.mockResolvedValue({
      data: { guest_id: 'g-1', job_id: 'parse-job-1', device_token: 'dev-1' },
      status: 202,
    });
    api.guestJobPoll.mockResolvedValue({
      data: {
        parsed_resume: {
          structured: { contact: { name: 'Alex Doe' }, summary: 'A summary.' },
          filename: 'resume.pdf',
        },
        guest: { tailors_used: 0, tailors_limit: 1 },
        profile: { first_name: 'Alex', headline_title: 'Frontend Engineer' },
      },
      status: 200,
    });

    renderLanding();
    const input = await screen.findByLabelText(/^Resume file/);
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'resume.pdf', { type: 'application/pdf' })] },
    });

    await screen.findByRole('region', { name: 'What we understood from your resume' });
    // Nothing countable was extracted, so the strip does not render at all.
    expect(screen.queryByTestId('extracted-counts')).not.toBeInTheDocument();
    expect(screen.queryByText(/0 skills/)).not.toBeInTheDocument();
  });
});

// -- 5. Low and zero counts are successes ----------------------------------

describe('honest counts', () => {
  test('states the freshness window from the server when it is known', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: {
        jobs: [matchFix(1, { days_ago: 1 }), matchFix(2, { days_ago: 4 })],
        total_considered: 180,
        sources_report: { ok: ['greenhouse'], considered: 180, max_age_days: 7 },
        cached: true,
      },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);
    await findDesktopMatchesList();

    expect(screen.getByText(/We found 2 fresh matches across 180 roles considered/)).toBeInTheDocument();
    expect(
      screen.getByText(/Showing openings posted in the last 7 days/),
    ).toBeInTheDocument();
  });

  test('zero results: explains the window precisely when dropped_stale is known', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: {
        jobs: [],
        empty_reason: 'no_openings_matched',
        total_considered: 210,
        sources_report: { ok: ['greenhouse'], dropped_stale: 12, max_age_days: 7 },
      },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);

    await screen.findByText('No fresh matches today');
    expect(
      screen.getByText(/12 roles worth looking at, but they were posted too long ago/),
    ).toBeInTheDocument();
    expect(screen.getByText(/last 7 days/)).toBeInTheDocument();
    // Never claims the openings did not exist - they did, they were stale.
    expect(screen.queryByText(/no openings exist/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  test('a single match reads as a success in the singular', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      data: { jobs: [matchFix(1)], total_considered: 90, cached: true },
      status: 200,
    });
    const user = userEvent.setup();
    await openMatches(user);
    const list = await findDesktopMatchesList();

    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/We found 1 fresh match across 90 roles considered/)).toBeInTheDocument();
  });

  test('matches error still surfaces a retry that recovers', async () => {
    seedReturningGuest();
    api.guestMatches
      .mockResolvedValue({ data: { jobs: [matchFix(1), matchFix(2)], cached: true }, status: 200 })
      .mockResolvedValueOnce({ error: 'Network down', status: 500 });
    const user = userEvent.setup();
    await openMatches(user);

    await screen.findByText("Couldn't load your matches");
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    const list = await findDesktopMatchesList();
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(2));
  });
});
