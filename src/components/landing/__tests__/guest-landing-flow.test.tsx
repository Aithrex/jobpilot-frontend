/**
 * Guest landing flow — behavior/contract tests for the live guest workspace
 * on `/` (LandingExperience + useGuestFlow + the guest/* components).
 *
 * The API layer is mocked at the `apiService` boundary (never fetch, never
 * component internals); `@/lib/guest` stays real (localStorage-backed ids)
 * except the crypto.subtle-dependent fingerprint hash. Framer-motion runs for
 * real — async queries wait out the step transitions.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import LandingExperience from '@/components/landing/LandingExperience';
import { setReducedMotion } from '@/test/setup';
import type { GuestJobMatch } from '@/types/guest';

// ── Module mocks ─────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  companyLogoSrc: (logoUrl?: string | null) => logoUrl ?? null,
  apiService: {
    guestSession: vi.fn(),
    guestOnboard: vi.fn(),
    guestJobPoll: vi.fn(),
    guestMatches: vi.fn(),
    guestTailor: vi.fn(),
    guestDownloadIssue: vi.fn(),
    // Hash-only href so jsdom's anchor click never logs a navigation error.
    guestDownloadUrl: vi.fn((token: string) => `#download-${token}`),
    guestClaim: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Keep the real guest identity plumbing (localStorage-backed guest_id /
// device_token, feature flag) — only the SubtleCrypto fingerprint is stubbed.
vi.mock('@/lib/guest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/guest')>();
  return {
    ...actual,
    getFingerprintHash: vi.fn(async () => 'fp-test'),
  };
});

const api = apiService as unknown as Record<string, Mock>;

// ── Fixtures ─────────────────────────────────────────────────────

function matchFix(i: number): GuestJobMatch {
  return {
    match_id: `m${i}`,
    title: `Role ${i}`,
    company: `Company ${i}`,
    location: `City ${i}`,
    match_score: 90 - i,
    matched_skills: ['React', 'TypeScript'],
    why: `Why fixture ${i}: strong overlap with your React work.`,
    source: 'greenhouse',
  };
}

function matchesData(n: number) {
  return {
    jobs: Array.from({ length: n }, (_, i) => matchFix(i + 1)),
    date: '2026-07-20',
    min_score: 60,
    cached: true,
  };
}

const parseResult = {
  parsed_resume: {
    structured: {
      contact: { name: 'Alex Doe' },
      summary: 'Frontend engineer with five years of React.',
      experience: [
        { title: 'Frontend Engineer', company: 'RealCo', dates: '2021-2026', bullets: ['Built things'] },
      ],
    },
    filename: 'resume.pdf',
  },
  guest: { tailors_used: 0, tailors_limit: 1 },
};

const tailorResult = {
  tailored_resume: {
    contact: { name: 'Alex Doe' },
    summary: 'Tailored summary aligned to the role.',
    skills: { Frontend: ['React', 'TypeScript'] },
    experience: [
      { title: 'Frontend Engineer', company: 'RealCo', dates: '2021-2026', bullets: ['Built things'] },
    ],
    education: [],
    certifications: [],
    projects: [],
    target_role: 'Role 1',
  },
  record_id: 'rec-1',
  download: { token: 'grant-1', formats: ['pdf', 'docx'] as ('pdf' | 'docx')[] },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

// ── Harness ──────────────────────────────────────────────────────

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}</div>;
}

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TooltipProvider>
        <LandingExperience />
        <LocationProbe />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

async function pickFile() {
  const input = await screen.findByLabelText(/^Resume file/);
  const file = new File(['x'], 'resume.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
}

function seedReturningGuest(session: Record<string, unknown> = {}) {
  localStorage.setItem('guest_id', 'g-1');
  api.guestSession.mockResolvedValue({
    data: { exists: true, has_resume: true, tailors_used: 0, tailors_limit: 1, ...session },
    status: 200,
  });
}

/** The FIRST "Matched jobs" list is the desktop master list (both desktop and
 * mobile lists are in the DOM — jsdom applies no responsive CSS). */
async function findDesktopMatchesList() {
  const lists = await screen.findAllByRole('list', { name: 'Matched jobs' });
  return lists[0];
}

/** Returning-guest shortcut into the matches dashboard. */
async function openMatches(user: ReturnType<typeof userEvent.setup>) {
  renderLanding();
  await user.click(await screen.findByRole('button', { name: /See today's matches/i }));
}

/** Drive the full confirm → tailor → completed path for Role 1. */
async function tailorFirstMatch(user: ReturnType<typeof userEvent.setup>) {
  seedReturningGuest();
  api.guestMatches.mockResolvedValue({ data: matchesData(3), status: 200 });
  api.guestTailor.mockResolvedValue({
    data: { job_id: 'tailor-job-1', tailors_used: 1, tailors_limit: 1 },
    status: 202,
  });
  api.guestJobPoll.mockResolvedValue({ data: tailorResult, status: 200 });

  await openMatches(user);
  await user.click(
    await screen.findByRole('button', { name: /^Tailor my resume for Role 1/i }),
  );
  await user.click(await screen.findByRole('button', { name: 'Use my free tailor' }));
  await screen.findByText(/You've used your guest tailor/);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  // Safe defaults — individual tests override what they exercise. Anything a
  // test does NOT expect to hit resolves as an explicit error payload so an
  // unexpected call fails an assertion instead of hanging.
  api.guestSession.mockResolvedValue({ data: { exists: false }, status: 200 });
  api.guestOnboard.mockResolvedValue({ error: 'guestOnboard not configured in this test', status: 500 });
  api.guestJobPoll.mockResolvedValue({ error: 'guestJobPoll not configured in this test', status: 500 });
  api.guestMatches.mockResolvedValue({ error: 'guestMatches not configured in this test', status: 500 });
  api.guestTailor.mockResolvedValue({ error: 'guestTailor not configured in this test', status: 500 });
  api.guestDownloadIssue.mockResolvedValue({ error: 'guestDownloadIssue not configured in this test', status: 500 });
  api.guestDownloadUrl.mockImplementation((token: string) => `#download-${token}`);
  api.guestClaim.mockResolvedValue({ data: {}, status: 200 });
});

// ── Tests ────────────────────────────────────────────────────────

describe('guest landing flow', () => {
  test('1. upload stays on / — guestOnboard fires and the parsing region appears without navigation', async () => {
    api.guestOnboard.mockResolvedValue({
      data: { guest_id: 'g-new', job_id: 'parse-job-1', device_token: 'dev-1' },
      status: 202,
    });
    // Keep the parse in flight so the flow stays on the parsing step.
    api.guestJobPoll.mockImplementation(() => new Promise(() => {}));

    renderLanding();
    await pickFile();

    await screen.findByRole('region', { name: 'Reading your resume' });
    expect(api.guestOnboard).toHaveBeenCalledTimes(1);
    // File + fingerprint hash went to the API layer.
    const [file, fingerprint] = api.guestOnboard.mock.calls[0];
    expect(file).toBeInstanceOf(File);
    expect(fingerprint).toBe('fp-test');
    // Still on the landing route — the flow runs in place.
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/');
  });

  test('2. matches render exactly what the server returned (5 jobs, then 3 — no padding)', async () => {
    api.guestOnboard.mockResolvedValue({
      data: { guest_id: 'g-1', job_id: 'parse-job-1', device_token: 'dev-1' },
      status: 202,
    });
    api.guestJobPoll.mockResolvedValue({ data: parseResult, status: 200 });
    api.guestMatches.mockResolvedValue({ data: matchesData(5), status: 200 });

    const first = renderLanding();
    await pickFile();

    let list = await findDesktopMatchesList();
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    for (let i = 1; i <= 5; i += 1) {
      expect(within(list).getByText(`Role ${i}`)).toBeInTheDocument();
    }
    expect(within(list).getByText(/Company 3/)).toBeInTheDocument();
    expect(within(list).getByText('Est. 89% match')).toBeInTheDocument(); // Role 1: 90 - 1

    // A 3-job response renders exactly 3 — nothing padded, nothing hidden.
    first.unmount();
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({ data: matchesData(3), status: 200 });
    const user = userEvent.setup();
    await openMatches(user);

    list = await findDesktopMatchesList();
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByText('Role 4')).not.toBeInTheDocument();
  });

  test('3. clicking a match reveals its "Why this matches" detail', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({ data: matchesData(3), status: 200 });
    const user = userEvent.setup();
    await openMatches(user);

    // Default detail is the first match.
    await screen.findByText(/Why fixture 1/);

    // Selecting Role 2 swaps the detail pane to its reasoning.
    await user.click(
      await screen.findByRole('button', { name: /Role 2 at Company 2/ }),
    );
    const why2 = await screen.findAllByText(/Why fixture 2/);
    expect(why2.length).toBeGreaterThanOrEqual(1);
    await waitFor(() =>
      expect(screen.queryByText(/Why fixture 1/)).not.toBeInTheDocument(),
    );
  });

  test('4. exactly one tailor: confirm flow calls guestTailor once, other matches lock', async () => {
    const user = userEvent.setup();
    await tailorFirstMatch(user);

    expect(api.guestTailor).toHaveBeenCalledTimes(1);
    expect(api.guestTailor).toHaveBeenCalledWith(
      expect.objectContaining({ guest_id: 'g-1', match_id: 'm1' }),
    );

    // Back on the dashboard, a different match now shows the locked state.
    await user.click(screen.getByRole('button', { name: /Back to matches/i }));
    await user.click(
      await screen.findByRole('button', { name: /Role 2 at Company 2/ }),
    );
    const locked = await screen.findAllByRole('button', { name: /Free tailor used/i });
    expect(locked.length).toBeGreaterThanOrEqual(1);
    locked.forEach((btn) => expect(btn).toBeDisabled());
    // The tailored match itself offers its result instead.
    await user.click(
      screen.getByRole('button', { name: /Role 1 at Company 1.*tailored/i }),
    );
    expect(
      (await screen.findAllByRole('button', { name: /View my tailored resume/i })).length,
    ).toBeGreaterThanOrEqual(1);
  });

  test('5. completed state offers PDF + DOCX; PDF click issues a pdf download token', async () => {
    const user = userEvent.setup();
    await tailorFirstMatch(user);
    api.guestDownloadIssue.mockResolvedValue({ data: { token: 'tok-1' }, status: 200 });

    const pdfBtn = screen.getByRole('button', { name: 'Download PDF' });
    expect(screen.getByRole('button', { name: 'Download DOCX' })).toBeInTheDocument();

    await user.click(pdfBtn);
    await waitFor(() =>
      expect(api.guestDownloadIssue).toHaveBeenCalledWith('g-1', 'rec-1', 'pdf'),
    );
    expect(api.guestDownloadIssue).toHaveBeenCalledTimes(1);
  });

  test('6. signup gate shows after the tailor while remaining matches stay visible', async () => {
    const user = userEvent.setup();
    await tailorFirstMatch(user);

    expect(screen.getByText(/You've used your guest tailor/)).toBeInTheDocument();

    // The other matches are still fully readable — nothing disappears.
    await user.click(screen.getByRole('button', { name: /Back to matches/i }));
    const list = await findDesktopMatchesList();
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('Role 2')).toBeInTheDocument();
    expect(within(list).getByText('Role 3')).toBeInTheDocument();
    // Quota-exhausted conversion prompt on the dashboard header.
    expect(screen.getByText(/Your free tailor is used/)).toBeInTheDocument();
  });

  test('7. refresh restore: stored pointer re-polls the tailor job and marks the match Tailored', async () => {
    localStorage.setItem('guest_id', 'g-1');
    localStorage.setItem(
      'guest_tailored_v1',
      JSON.stringify({ job_id: 'tailor-job-1', match_id: 'm2', record_id: 'rec-1' }),
    );
    api.guestSession.mockResolvedValue({
      data: { exists: true, has_resume: true, tailors_used: 1, tailors_limit: 1 },
      status: 200,
    });
    api.guestJobPoll.mockResolvedValue({ data: tailorResult, status: 200 });
    api.guestMatches.mockResolvedValue({ data: matchesData(3), status: 200 });

    const user = userEvent.setup();
    renderLanding();

    // The mount probe re-reads the completed tailor job from the pointer.
    await waitFor(() =>
      expect(api.guestJobPoll).toHaveBeenCalledWith('tailor-job-1', 'g-1', 15000),
    );

    // "See today's matches" still works and shows the Tailored mark on m2.
    await user.click(await screen.findByRole('button', { name: /See today's matches/i }));
    await screen.findByRole('button', { name: /Role 2 at Company 2.*tailored/i });
    expect(screen.getAllByText('Tailored').length).toBeGreaterThanOrEqual(1);
    // Quota restored from the session: 1 of 1 used → gate copy present.
    expect(screen.getByText(/Your free tailor is used/)).toBeInTheDocument();
  });

  test('8. feature disabled (503) falls back to the account-first panel with no further guest calls', async () => {
    api.guestSession.mockResolvedValue({ error: 'Guest onboarding unavailable', status: 503 });

    renderLanding();

    await screen.findByText('Free to start. No card needed.');
    expect(screen.getByText('Start free')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Upload my resume to find matches/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Create free account/i }).length).toBeGreaterThan(0);
    expect(api.guestOnboard).not.toHaveBeenCalled();
    expect(api.guestMatches).not.toHaveBeenCalled();
    expect(api.guestTailor).not.toHaveBeenCalled();
  });

  test('9a. upload failure shows the parsing error card with Try again', async () => {
    api.guestOnboard.mockResolvedValue({ error: 'Upload failed hard', status: 500 });

    renderLanding();
    await pickFile();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('We hit a snag reading your resume')).toBeInTheDocument();
    expect(within(alert).getByText('Upload failed hard')).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  test('9b. 429 capacity on matches renders a conversion CTA, not an error card', async () => {
    seedReturningGuest();
    api.guestMatches.mockResolvedValue({
      error: 'HTTP 429',
      status: 429,
      errorPayload: { error: 'capacity', global: true },
    });
    const user = userEvent.setup();
    await openMatches(user);

    await screen.findByText("We're at guest capacity today");
    expect(screen.queryByText("Couldn't load your matches")).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // Conversion actions, never an error surface.
    expect(screen.getAllByRole('link', { name: /Create free account/i }).length).toBeGreaterThan(0);
  });

  test('9c. matches network error shows retry, and retry recovers', async () => {
    seedReturningGuest();
    api.guestMatches
      .mockResolvedValue({ data: matchesData(2), status: 200 })
      .mockResolvedValueOnce({ error: 'Network error. Please try again.' });
    const user = userEvent.setup();
    await openMatches(user);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText("Couldn't load your matches")).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    const list = await findDesktopMatchesList();
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(api.guestMatches).toHaveBeenCalledTimes(2);
  });

  test('10. keyboard: the dropzone is a real button (Enter opens the file dialog) and downloads are reachable buttons', async () => {
    const user = userEvent.setup();

    const first = renderLanding();
    const dropButton = await screen.findByRole('button', {
      name: /Upload my resume to find matches/i,
    });
    expect(dropButton.tagName).toBe('BUTTON');
    expect(dropButton).toBeEnabled();

    const input = screen.getByLabelText(/^Resume file/) as HTMLInputElement;
    expect(input.type).toBe('file');
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    dropButton.focus();
    expect(dropButton).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    first.unmount();

    // Completed state: Download actions are enabled buttons in tab order.
    await tailorFirstMatch(user);
    // GuestFlowShell moves focus to the new step's region ~340ms after a step
    // change — wait for that app-driven focus move so it can't race the
    // assertions below.
    await waitFor(() =>
      expect(screen.getByRole('region', { name: 'Tailoring your resume' })).toHaveFocus(),
    );
    const pdf = screen.getByRole('button', { name: 'Download PDF' });
    const docx = screen.getByRole('button', { name: 'Download DOCX' });
    expect(pdf).toBeEnabled();
    expect(docx).toBeEnabled();
    pdf.focus();
    expect(pdf).toHaveFocus();
    await user.tab();
    expect(docx).toHaveFocus();
  });

  test('11. reduced motion: every step still renders', async () => {
    setReducedMotion(true);
    const user = userEvent.setup();

    // Step 1: upload → the parsing step renders (parse kept in flight).
    api.guestOnboard.mockResolvedValue({
      data: { guest_id: 'g-1', job_id: 'parse-job-1', device_token: 'dev-1' },
      status: 202,
    });
    api.guestJobPoll.mockImplementation(() => new Promise(() => {}));
    const first = renderLanding();
    await pickFile();
    await screen.findByRole('region', { name: 'Reading your resume' });
    first.unmount();

    // Steps 2-4 on a fresh mount: matches → tailor → completed. (The
    // parsing→matches AnimatePresence handoff under reduced motion is
    // covered by the todo below.)
    await tailorFirstMatch(user);
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download DOCX' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /Back to matches/i }));
    const list = await findDesktopMatchesList();
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  test.todo(
    '11b. reduced motion: the parsing→matches handoff specifically — under the jsdom matchMedia ' +
      'reduced-motion emulation, when the step advance originates from a resolved poll promise (not a user ' +
      'event), the matches section entering AnimatePresence mode="wait" (GuestFlowShell) freezes on its ' +
      'loading skeleton and never re-renders, even though guestMatches resolved and loadMatches consumed ' +
      'the data (verified via instrumented mocks; an explicit act() flush does not unstick it). The same ' +
      'handoff works with motion enabled, and hero→matches / matches→tailor handoffs work under reduced ' +
      'motion. Possible real framer-motion 12.23 reduced-motion bug — flagged to frontend-engineer for ' +
      'browser verification before pinning behavior here.',
  );
});
