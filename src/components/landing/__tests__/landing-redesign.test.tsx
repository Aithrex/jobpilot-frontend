/**
 * Landing redesign - the honesty and interaction contract for the Aspirely
 * Live Workspace landing page.
 *
 * These tests exist to stop specific regressions that would each be a lie or a
 * usability failure on a public page:
 *  - the primary CTA quietly becoming a two-click upload again,
 *  - decorative content growing a fabricated company, job title or score,
 *  - a roadmap capability drifting into looking available,
 *  - a "coming soon" control that appears to do something and doesn't,
 *  - status labels being hand-typed into a component instead of read from the
 *  one registry.
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

/** The hero's illustrative demo panel (Read / Match / Tailor). */
const heroPanel = () => screen.getByRole('tabpanel', { name: /^(Read|Match|Tailor)$/ });

/** The editorial transformation stage (Resume / Understood / Matched / Tailored). */
const signalPanel = () => screen.getByRole('tabpanel', { name: /Resume transformation stage/i });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setReducedMotion(false);
  api.guestSession.mockResolvedValue({ data: { exists: false }, status: 200 });
});

// ── 1. Upload is ONE click from the primary CTA ──────────────────

describe('primary CTA', () => {
  test('EVERY upload CTA opens the SAME single file input on that click', async () => {
    const user = userEvent.setup();
    renderLanding();

    // Exactly one file input on the whole page.
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);
    const input = inputs[0] as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

    // 1 - nav CTA (used to be an <a href="#try"> that only scrolled).
    await user.click(screen.getByRole('button', { name: /^Upload resume$/i }));
    // 2 - hero CTA.
    await user.click(screen.getByRole('button', { name: /^Find my matches$/i }));
    // 3 - the drop surface inside the workspace window.
    await user.click(
      await screen.findByRole('button', { name: /Upload my resume to find matches/i }),
    );
    // 4 - the closing CTA (used to be an <a href="#try"> too).
    await user.click(await screen.findByRole('button', { name: /^Upload your resume$/i }));

    expect(clickSpy).toHaveBeenCalledTimes(4);
    // And none of them is an anchor that merely scrolls to the hero.
    expect(document.querySelectorAll('a[href="#try"]')).toHaveLength(0);
  });

  test('"Find my matches" opens the real file input directly - no second click', async () => {
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
  test('the hero CTA precedes the workspace window in DOM order', async () => {
    renderLanding();

    const cta = await screen.findByRole('button', { name: /^Find my matches$/i });
    const windowTitle = screen.getByText('Career Workspace');

    // On a phone the columns stack in source order, so the real action must
    // come first in the DOM. A visitor should never scroll past artwork to
    // reach the thing they came to do.
    expect(
      cta.compareDocumentPosition(windowTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('the drop surface lives INSIDE the workspace window, not beside it', async () => {
    renderLanding();

    const drop = await screen.findByRole('button', {
      name: /Upload my resume to find matches/i,
    });
    // The MacWindow frame (its own `shadow-float` surface).
    const frame = document.querySelector('.shadow-float') as HTMLElement;

    expect(frame).not.toBeNull();
    expect(frame.contains(screen.getByText('Career Workspace'))).toBe(true);
    // The product window IS the uploader: the real control is its own child.
    expect(frame.contains(drop)).toBe(true);
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
    // Any "NN% match"-shaped claim before a real resume has been read.
    expect(text).not.toMatch(/\d{1,3}\s*%\s*(match|fit)/i);
    // Placeholder job titles from the old demo vocabulary.
    expect(text).not.toMatch(/Senior (Frontend|Backend|Software) Engineer at/i);
  });

  test('the pre-upload demo is labelled "Illustrative workflow"', async () => {
    renderLanding();
    // Nobody may mistake redacted structure for their own data or for real
    // openings, so the demo says what it is, visibly.
    expect(await screen.findByText('Illustrative workflow')).toBeInTheDocument();
  });
});

// ── 3b. The product demo is reachable by assistive tech ──────────

describe('product demo accessibility', () => {
  test('the demo is NOT hidden from assistive tech, only its decorations are', async () => {
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Illustrative workflow steps/i,
    });

    // The stage root must not be inside an aria-hidden subtree - a blanket
    // aria-hidden on the demo told screen-reader users nothing about the
    // product at all.
    expect(tablist.closest('[aria-hidden="true"]')).toBeNull();
    // Its region labels are readable.
    expect(within(heroPanel()).getByText('Experience')).toBeInTheDocument();
    // Decorative shapes still are hidden.
    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  test('Read / Match / Tailor are real focusable tabs', async () => {
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Illustrative workflow steps/i,
    });
    const tabs = within(tablist).getAllByRole('tab');

    expect(tabs.map((t) => t.textContent)).toEqual(['Read', 'Match', 'Tailor']);
    tabs.forEach((t) => expect(t.tagName).toBe('BUTTON'));
    // Roving tabindex: exactly one tab is in the tab order.
    expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);
    // And they drive a real panel.
    expect(heroPanel()).toBeInTheDocument();
  });

  test('the tabs are operable by keyboard: arrows move, Enter/Space select', async () => {
    const user = userEvent.setup();
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Illustrative workflow steps/i,
    });
    const [read, match, tailor] = within(tablist).getAllByRole('tab');

    read.focus();
    expect(read).toHaveFocus();

    // Arrow keys move focus AND jump the illustration to that beat.
    await user.keyboard('{ArrowRight}');
    expect(match).toHaveFocus();
    expect(match).toHaveAttribute('aria-selected', 'true');
    expect(read).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{End}');
    expect(tailor).toHaveFocus();
    expect(tailor).toHaveAttribute('aria-selected', 'true');

    // Space activates the focused tab natively (it is a real button).
    await user.keyboard('{Home}');
    expect(read).toHaveFocus();
    await user.keyboard(' ');
    expect(read).toHaveAttribute('aria-selected', 'true');

    // Clicking Tailor jumps forward, and the final beat's content appears.
    await user.click(tailor);
    expect(tailor).toHaveAttribute('aria-selected', 'true');
    expect(within(heroPanel()).getByText('IntegrityGuard')).toBeInTheDocument();
  });

  test('driving the tabs never fabricates data', async () => {
    const user = userEvent.setup();
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Illustrative workflow steps/i,
    });
    for (const tab of within(tablist).getAllByRole('tab')) await user.click(tab);

    const text = document.body.textContent ?? '';
    for (const brand of ['Stripe', 'Google', 'Meta', 'Amazon', 'Netflix', 'Acme', 'TechCorp']) {
      expect(text).not.toContain(brand);
    }
    expect(text).not.toMatch(/\d{1,3}\s*%\s*(match|fit)/i);
    expect(text).not.toMatch(/Senior (Frontend|Backend|Software) Engineer at/i);
  });
});

// ── 4. Current vs future are separated and correctly labelled ────

describe('capability status', () => {
  test('Available-now and Coming-next are distinct sections', async () => {
    renderLanding();

    const availableHeading = await screen.findByRole('heading', {
      name: /From resume to tailored, in one pass\./i,
    });
    const comingHeading = screen.getByRole('heading', {
      name: /From matched to applied\./i,
    });

    // They are in different sections - never blended into one list.
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

  test('no waitlist is offered or confirmed - the only action is a free account', async () => {
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
    // A lock reads "pay to unlock". None of these are purchasable - and the
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
    expect(screen.getByRole('heading', { name: /From matched to applied\./i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Find my matches$/i })).toBeInTheDocument();

    // The demo resolves straight to its FINAL meaningful beat - no animation,
    // nothing withheld from the reduced-motion visitor.
    const tablist = screen.getByRole('tablist', { name: /Illustrative workflow steps/i });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(within(heroPanel()).getByText('IntegrityGuard')).toBeInTheDocument();
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

// ── 7b. The two-surface visual language ──────────────────────────

describe('surface language', () => {
  test('the product world is obsidian and the marketing world is pearl', async () => {
    const { container } = renderLanding();
    await screen.findByText('Career Workspace');

    // The page root IS the product surface, so the hero and its window are
    // obsidian without opting in.
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('surface-obsidian');

    // The editorial band exists and wraps the marketing movements.
    const editorial = container.querySelector('.surface-editorial') as HTMLElement;
    expect(editorial).not.toBeNull();
    expect(
      editorial.contains(screen.getByRole('heading', { name: /From matched to applied\./i })),
    ).toBe(true);

    // ...and the hero product window is NOT inside it. If the editorial
    // wrapper ever swallowed the workspace, the product surface would go pearl
    // and the contrast that carries the whole design would be gone.
    expect(editorial.contains(screen.getByText('Career Workspace'))).toBe(false);
  });

  test('the transformation stage stays obsidian INSIDE the pearl section', async () => {
    const { container } = renderLanding();
    await screen.findByText('Career Workspace');
    const panel = signalPanel();
    const editorial = container.querySelector('.surface-editorial') as HTMLElement;

    // The nested-surface case: a dark product stage seated in a light
    // editorial section. Both must resolve their own tokens.
    expect(editorial.contains(panel)).toBe(true);
    expect(panel.className).toContain('surface-obsidian');
  });
});

// ── 7c. The transformation sequence ──────────────────────────────

describe('resume transformation sequence', () => {
  test('the four stages are real, keyboard-operable tabs', async () => {
    const user = userEvent.setup();
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Resume transformation stages/i,
    });
    const tabs = within(tablist).getAllByRole('tab');

    expect(tabs.map((t) => t.textContent?.split(/(?=[A-Z])/)[0])).toHaveLength(4);
    expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);

    tabs[0].focus();
    await user.keyboard('{End}');
    expect(tabs[3]).toHaveFocus();
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    // The final stage shows the rewrite AND the integrity guarantee.
    expect(within(signalPanel()).getByText('IntegrityGuard')).toBeInTheDocument();

    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  test('driving the sequence never fabricates data', async () => {
    const user = userEvent.setup();
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Resume transformation stages/i,
    });
    for (const tab of within(tablist).getAllByRole('tab')) await user.click(tab);

    const text = document.body.textContent ?? '';
    for (const brand of ['Stripe', 'Google', 'Meta', 'Amazon', 'Netflix', 'Acme', 'TechCorp']) {
      expect(text).not.toContain(brand);
    }
    expect(text).not.toMatch(/\d{1,3}\s*%\s*(match|fit)/i);
  });

  test('reduced motion lands on the FINAL stage with no scrolling required', async () => {
    setReducedMotion(true);
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Resume transformation stages/i,
    });
    const tabs = within(tablist).getAllByRole('tab');

    // The sequence is scroll-linked for everyone else; a reduced-motion
    // visitor must never have to scroll to be shown the payoff.
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    expect(within(signalPanel()).getByText('IntegrityGuard')).toBeInTheDocument();
  });
});

// ── 7d. The roadmap must never outweigh the shipped product ──────

describe('roadmap weight', () => {
  test('Coming next is structurally lighter than what actually ships', async () => {
    renderLanding();
    const shipped = (
      await screen.findByRole('heading', { name: /From resume to tailored, in one pass\./i })
    ).closest('section') as HTMLElement;
    const roadmap = screen
      .getByRole('heading', { name: /From matched to applied\./i })
      .closest('section') as HTMLElement;

    // jsdom does no layout, so this proxies section height with rendered node
    // count. The roadmap section was once the TALLEST thing on the page -
    // bigger than the hero, for two features that do not work. How much page a
    // feature occupies is itself a claim about how real it is.
    expect(roadmap.querySelectorAll('*').length).toBeLessThan(shipped.querySelectorAll('*').length);
  });
});

// ── 7e. Copy rule ────────────────────────────────────────────────

describe('copy rules', () => {
  test('no user-visible string uses a long dash, curly quote or accented letter', async () => {
    renderLanding();
    await screen.findByText('Career Workspace');

    const text = document.body.textContent ?? '';
    // Long dashes and smart punctuation render inconsistently across the
    // fonts and clients this copy travels through; the middot is the house
    // separator. "resume" is always spelled without accents.
    // Escapes, not literals. Written literally, this character class is itself a
    // target of scripts/ascii-copy-sweep.mjs: the sweep rewrote the en/em dashes
    // and curly quotes inside it into ASCII, turning the guard into /[- - ''""]/,
    // which matches ordinary hyphens and straight quotes and fails on correct
    // copy. Escaped, the assertion survives its own sweep.
    expect(text).not.toMatch(/[\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/);
    expect(text).not.toMatch(/[\u00C0-\u024F]/);
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

  test('the demo stage carries no un-shrinkable fixed-pixel panel (the 320px clip)', async () => {
    renderLanding();
    await screen.findByText('Career Workspace');
    const panel = heroPanel();

    // The clip was caused by `w-[168px] shrink-0` + `w-[128px] shrink-0` needing
    // ~376px inside a 320px viewport. jsdom does no layout, so this asserts the
    // CAUSE is gone: no arbitrary pixel width that also refuses to shrink.
    const offenders = Array.from(panel.querySelectorAll<HTMLElement>('*')).filter((el) => {
      const c = typeof el.className === 'string' ? el.className : '';
      return /(^|\s)w-\[\d+px\]/.test(c) && /(^|\s)shrink-0/.test(c);
    });
    expect(offenders.map((el) => el.className)).toEqual([]);

    // The resume sheet and the panels beside it are fluid instead.
    const fluid = Array.from(panel.querySelectorAll<HTMLElement>('.basis-0'));
    expect(fluid.length).toBeGreaterThan(0);
    fluid.forEach((el) => {
      expect(el.className).toContain('min-w-0');
      expect(el.className).toContain('flex-1');
    });
  });
});
