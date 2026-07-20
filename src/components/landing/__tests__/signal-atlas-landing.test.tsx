/**
 * Signal Atlas landing — the redesigned marketing surface. Proves the
 * fictional preview era is really gone (no fake companies, no screenshot
 * ecosystem, no "fictional data" labels), and that the new interactive
 * pieces (stage controls, Watch it work, career orbit) work with mouse AND
 * keyboard, with reduced motion, while the REAL upload control stays wired.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import LandingExperience from '@/components/landing/LandingExperience';
import { setReducedMotion } from '@/test/setup';

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

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <TooltipProvider>
        <LandingExperience />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

function atlasStage(): string | null {
  return document.querySelector('[data-atlas-stage]')?.getAttribute('data-atlas-stage') ?? null;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  api.guestSession.mockResolvedValue({ data: { exists: false }, status: 200 });
});

describe('Signal Atlas landing', () => {
  test('the fictional preview is gone: no fake companies, no fictional-data labels, no screenshot ecosystem', () => {
    const { container } = renderLanding();

    for (const banned of [
      /Lumenary/i,
      /Harborview/i,
      /Cobalt Grid/i,
      /fictional data/i,
      /Interactive preview/i,
    ]) {
      expect(screen.queryByText(banned)).not.toBeInTheDocument();
    }
    // No screenshot-driven product panels anywhere on the page.
    expect(container.querySelector('img[src*="/images/landing/"]')).toBeNull();
    expect(container.querySelector('picture')).toBeNull();
  });

  test('one h1, and the visible landing copy carries no em/en dashes', () => {
    const { container } = renderLanding();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/[–—]/);
  });

  test('stage controls move the atlas; keyboard works; Watch it work replays from Read', async () => {
    const user = userEvent.setup();
    renderLanding();

    // Scoped to the stage group — the orbit section has its own Tailor node.
    const stages = screen.getByRole('group', { name: 'Signal stages' });

    // Manual selection (autopilot is view-gated in jsdom, so the scene sits
    // on its initial stage until a control is used).
    await user.click(within(stages).getByRole('button', { name: 'Tailor' }));
    expect(atlasStage()).toBe('tailor');
    expect(within(stages).getByRole('button', { name: 'Tailor' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Keyboard: the controls are native buttons — Enter activates.
    const match = within(stages).getByRole('button', { name: 'Match' });
    match.focus();
    expect(match).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(atlasStage()).toBe('match');

    // Watch it work restarts the full sequence from Read.
    await user.click(screen.getByRole('button', { name: 'Watch it work' }));
    expect(atlasStage()).toBe('read');
  });

  test('play/pause control toggles and stays keyboard reachable', async () => {
    const user = userEvent.setup();
    renderLanding();
    const pause = screen.getByRole('button', { name: /Pause the animation/i });
    await user.click(pause);
    expect(screen.getByRole('button', { name: /Play the animation/i })).toBeInTheDocument();
  });

  test('career orbit: selecting a mode transforms the central scene (click and focus)', async () => {
    const user = userEvent.setup();
    renderLanding();

    await user.click(screen.getByRole('button', { name: 'Track' }));
    expect(document.querySelector('[data-orbit-mode]')).toHaveAttribute(
      'data-orbit-mode',
      'track',
    );
    expect(
      screen.getByText('Applications flow across stages you control.'),
    ).toBeInTheDocument();

    // Focus alone also transforms the scene (keyboard exploration).
    fireEvent.focus(screen.getByRole('button', { name: 'Plan' }));
    expect(document.querySelector('[data-orbit-mode]')).toHaveAttribute(
      'data-orbit-mode',
      'plan',
    );
  });

  test('reduced motion: the atlas parks on the resolved composition and every control still works', async () => {
    setReducedMotion(true);
    const user = userEvent.setup();
    renderLanding();

    // Parked on the fully-resolved final composition — nothing plays.
    expect(atlasStage()).toBe('tailor');

    // Stage controls still swap static compositions.
    await user.click(screen.getByRole('button', { name: 'Read' }));
    expect(atlasStage()).toBe('read');

    // The orbit still renders and switches.
    await user.click(screen.getByRole('button', { name: 'Learn' }));
    expect(document.querySelector('[data-orbit-mode]')).toHaveAttribute(
      'data-orbit-mode',
      'learn',
    );
  });

  test('the REAL upload control lives inside the atlas and stays wired', async () => {
    api.guestOnboard.mockResolvedValue({
      data: { guest_id: 'g-new', job_id: 'parse-job-1', device_token: 'dev-1' },
      status: 202,
    });
    api.guestJobPoll.mockImplementation(() => new Promise(() => {}));

    renderLanding();
    const dropButton = await screen.findByRole('button', {
      name: /Upload my resume to find matches/i,
    });
    expect(dropButton.tagName).toBe('BUTTON');

    const input = (await screen.findByLabelText(/^Resume file/)) as HTMLInputElement;
    expect(input.type).toBe('file');
  });
});
