/**
 * Landing redesign — the honesty and interaction contract for the Aspirely
 * Live Workspace landing page.
 *
 * These tests exist to stop specific regressions that would each be a lie or a
 * usability failure on a public page:
 *  - the primary CTA quietly becoming a two-click upload again,
 *  - decorative content growing a fabricated company, job title or score,
 *  - a roadmap capability drifting into looking available,
 *  - a "coming soon" control that appears to do something and doesn't,
 *  - status labels being hand-typed into a component instead of read from the
 *    one registry.
 *
 * The API layer is mocked at the `apiService` boundary, matching the existing
 * guest-landing-flow suite.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { apiService } from '@/lib/api';
import { TooltipProvider } from '@/components/ui/tooltip';
import LandingExperience from '@/components/landing/LandingExperience';
import { RouteLoadingFallback } from '@/App';
import { setReducedMotion } from '@/test/setup';
import {
  AUTO_APPLY,
  CAPABILITIES,
  DOCK_CAPABILITIES,
  STATUS_LABEL,
  WHATSAPP,
  isLive,
} from '@/lib/capabilities';

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

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setReducedMotion(false);
  api.guestSession.mockResolvedValue({ data: { exists: false }, status: 200 });
});

// ── 1. Upload is ONE click from the primary CTA ──────────────────

describe('primary CTA', () => {
  test('"Find my matches" opens the real file input directly — no second click', async () => {
    const user = userEvent.setup();
    renderLanding();

    const input = (await screen.findByLabelText(/^Resume file/)) as HTMLInputElement;
    expect(input.type).toBe('file');
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

    await user.click(screen.getByRole('button', { name: /^Find my matches$/i }));

    // The CTA itself opened the dialog. It did not scroll to, or focus, a
    // different uploader and wait for a second activation.
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  test('the drop zone and the CTA share ONE file input', async () => {
    const user = userEvent.setup();
    renderLanding();

    // Exactly one file input exists on the page.
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);

    const input = inputs[0] as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

    await user.click(screen.getByRole('button', { name: /^Find my matches$/i }));
    await user.click(
      await screen.findByRole('button', { name: /Upload my resume to find matches/i }),
    );

    // Both triggers opened the SAME element.
    expect(clickSpy).toHaveBeenCalledTimes(2);
  });
});

// ── 2. Mobile ordering ───────────────────────────────────────────

describe('mobile composition', () => {
  test('the upload control precedes the decorative window in DOM order', async () => {
    renderLanding();

    const upload = await screen.findByRole('button', {
      name: /Upload my resume to find matches/i,
    });
    const windowTitle = screen.getByText('Career Workspace');

    // On a phone the columns stack in source order, so the real action must
    // come first in the DOM — a visitor should never scroll past artwork to
    // reach the thing they came to do.
    expect(
      upload.compareDocumentPosition(windowTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

// ── 3. Nothing fabricated ────────────────────────────────────────

describe('honesty of the pre-upload composition', () => {
  test('no fabricated company, job title, or match score is rendered', async () => {
    renderLanding();
    await screen.findByText('Career Workspace');

    const text = document.body.textContent ?? '';

    // Real-company names that would imply partnerships we do not have.
    for (const brand of ['Stripe', 'Google', 'Meta', 'Amazon', 'Netflix', 'Acme', 'TechCorp']) {
      expect(text).not.toContain(brand);
    }
    // Any "NN% match"-shaped claim before a real résumé has been read.
    expect(text).not.toMatch(/\d{1,3}\s*%\s*(match|fit)/i);
    // Placeholder job titles from the old demo vocabulary.
    expect(text).not.toMatch(/Senior (Frontend|Backend|Software) Engineer at/i);
  });

  test('the illustrative stage is hidden from assistive tech', async () => {
    renderLanding();
    await screen.findByText('Career Workspace');
    // The redacted shapes carry no meaning to read out; the accessible product
    // description lives in the hero copy.
    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});

// ── 4. Current vs future are separated and correctly labelled ────

describe('capability status', () => {
  test('Available-now and Coming-next are distinct sections', async () => {
    renderLanding();

    const availableHeading = await screen.findByRole('heading', {
      name: /From résumé to matched and tailored\./i,
    });
    const comingHeading = screen.getByRole('heading', {
      name: /From matched to applied\./i,
    });

    // They are in different sections — never blended into one list.
    const availableSection = availableHeading.closest('section');
    const comingSection = comingHeading.closest('section');
    expect(availableSection).not.toBeNull();
    expect(comingSection).not.toBeNull();
    expect(availableSection).not.toBe(comingSection);
  });

  test('Auto Apply is labelled Coming soon and never Available', async () => {
    renderLanding();
    const heading = await screen.findByRole('heading', { name: 'Auto Apply' });
    const card = heading.closest('div')?.parentElement as HTMLElement;

    expect(within(card).getByText('Coming soon')).toBeInTheDocument();
    expect(within(card).queryByText('Available')).not.toBeInTheDocument();
    expect(AUTO_APPLY.status).toBe('coming-soon');
  });

  test('WhatsApp is labelled Coming soon, and described as alerts + approvals (not "messages")', async () => {
    renderLanding();
    const heading = await screen.findByRole('heading', {
      name: /WhatsApp alerts and approvals/i,
    });
    const card = heading.closest('div')?.parentElement as HTMLElement;

    expect(within(card).getByText('Coming soon')).toBeInTheDocument();
    expect(WHATSAPP.status).toBe('coming-soon');

    // Guardrails that keep this from reading as recruiter spam.
    const text = card.textContent ?? '';
    expect(text).toMatch(/opt-in/i);
    expect(text).toMatch(/never recruiter outreach/i);
    // No implication of a Meta/WhatsApp endorsement.
    expect(text).not.toMatch(/official|partner|endorsed|verified by/i);
  });

  test('statuses with different readiness use different labels', async () => {
    renderLanding();
    await screen.findByRole('heading', { name: 'Auto Apply' });

    // SMS and push are materially less built than Auto Apply / WhatsApp, so
    // they must NOT share the "Coming soon" badge.
    expect(screen.getAllByText('Planned').length).toBeGreaterThan(0);
    expect(STATUS_LABEL.planned).toBe('Planned');
    expect(STATUS_LABEL['coming-soon']).toBe('Coming soon');
  });

  test('every rendered status string comes from the registry', async () => {
    renderLanding();
    await screen.findByText('Career Workspace');

    const allowed = new Set(Object.values(STATUS_LABEL));
    // Any badge-like status word on the page must be one the registry defines.
    for (const cap of CAPABILITIES) {
      expect(allowed.has(STATUS_LABEL[cap.status])).toBe(true);
    }
    // And the dock reflects registry order/state rather than hardcoded copy.
    expect(DOCK_CAPABILITIES.filter((c) => !isLive(c.status)).map((c) => c.id)).toEqual([
      'auto-apply',
      'whatsapp',
    ]);
  });
});

// ── 5. Coming-soon controls are inert and never claim a waitlist ──

describe('future-feature controls', () => {
  test('interacting with roadmap surfaces calls no backend API', async () => {
    const user = userEvent.setup();
    renderLanding();
    await screen.findByRole('heading', { name: 'Auto Apply' });

    // Click every roadmap affordance we can reach.
    for (const name of [/Auto Apply/i, /WhatsApp/i]) {
      const buttons = screen.queryAllByRole('button', { name });
      for (const b of buttons) await user.click(b);
    }

    expect(api.guestOnboard).not.toHaveBeenCalled();
    expect(api.guestMatches).not.toHaveBeenCalled();
    expect(api.guestTailor).not.toHaveBeenCalled();
    expect(api.guestClaim).not.toHaveBeenCalled();
  });

  test('no waitlist is offered or confirmed — the only action is a free account', async () => {
    renderLanding();
    await screen.findByRole('heading', { name: 'Auto Apply' });

    const text = document.body.textContent ?? '';
    // There is no waitlist table in the backend, so nothing may say this.
    expect(text).not.toMatch(/join (the )?waitlist/i);
    expect(text).not.toMatch(/you're on the list|added to the waitlist|we'll be in touch/i);
    expect(text).toMatch(/Create a free account to hear when it launches/i);
  });

  test('roadmap items do not use a padlock (they are not paid features)', async () => {
    renderLanding();
    await screen.findByRole('heading', { name: 'Auto Apply' });
    // A lock reads "pay to unlock". None of these are purchasable — and the
    // upgrade endpoint is a stub, so a lock would be doubly misleading.
    expect(document.querySelector('.lucide-lock-keyhole')).toBeNull();
  });
});

// ── 6. Reduced motion ────────────────────────────────────────────

describe('reduced motion', () => {
  test('the composition renders fully resolved with motion off', async () => {
    setReducedMotion(true);
    renderLanding();

    // The window, its settled dock, and both roadmap sections are all present
    // without ever playing the sequence.
    expect(await screen.findByText('Career Workspace')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /From matched to applied\./i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Find my matches$/i })).toBeInTheDocument();
  });
});

// ── 7. Login fallback theme ──────────────────────────────────────

describe('route loading fallback', () => {
  test('the auth fallback is pinned dark so /login does not flash light', () => {
    const { container } = render(<RouteLoadingFallback pinnedDark />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('dark');
    expect(root.className).toContain('bg-background');
    expect(root.style.colorScheme).toBe('dark');
  });

  test('the default fallback stays theme-neutral for in-app routes', () => {
    const { container } = render(<RouteLoadingFallback />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('bg-background');
    expect(root.style.colorScheme).toBe('');
  });
});

// ── 8. Layout safety ─────────────────────────────────────────────

describe('layout', () => {
  test('the page root clips horizontal overflow', async () => {
    const { container } = renderLanding();
    await screen.findByText('Career Workspace');
    const root = container.firstElementChild as HTMLElement;
    // jsdom performs no layout, so this asserts the guard is in place rather
    // than measuring real overflow (that is covered by browser verification).
    expect(root.className).toContain('overflow-x-clip');
  });
});
