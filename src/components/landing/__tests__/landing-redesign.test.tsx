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
import { ThemeProvider } from '@/components/theme-provider';
import LandingExperience from '@/components/landing/LandingExperience';
import { LandingNav } from '@/components/landing/LandingNav';
import { RouteLoadingFallback } from '@/App';
import { setReducedMotion } from '@/test/setup';
import {
  AUTO_APPLY,
  CAPABILITIES,
  DOCK_CAPABILITIES,
  STATUS_LABEL,
  WHATSAPP,
} from '@/lib/capabilities';
import { PLAN_LABEL, PLAN_ORDER } from '@/lib/entitlements';

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

const { authState } = vi.hoisted(() => ({
  authState: { isAuthenticated: false, isLoading: false },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/guest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/guest')>();
  return { ...actual, getFingerprintHash: vi.fn(async () => 'fp-test') };
});

const api = apiService as unknown as Record<string, Mock>;

function renderLanding() {
  return render(
    // ThemeProvider is part of the real tree (App.tsx wraps everything in it)
    // and the landing now reads the resolved theme to pick its surface, so
    // rendering without it would exercise a page whose theme control is a
    // no-op. localStorage is cleared per test, so every run starts at
    // "system", which this suite's matchMedia reports as light.
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <TooltipProvider>
          <LandingExperience />
        </TooltipProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

/** The editorial transformation stage (Resume / Understood / Matched / Tailored). */
const signalPanel = () => screen.getByRole('tabpanel', { name: /Resume transformation stage/i });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setReducedMotion(false);
  authState.isAuthenticated = false;
  authState.isLoading = false;
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

    // The nav carries no upload CTA - the page's upload actions live in the
    // hero and the closing section, so the bar does not repeat them.
    // 1 - the hero's secondary CTA.
    await user.click(screen.getByRole('button', { name: /^Find my matches$/i }));
    // 2 - the drop surface under the CTAs. Same picker as the secondary CTA.
    await user.click(
      await screen.findByRole('button', { name: /Drop your resume to see your matches/i }),
    );
    // 3 - the closing CTA (used to be an <a href="#try"> too).
    await user.click(await screen.findByRole('button', { name: /^Upload your resume$/i }));

    expect(clickSpy).toHaveBeenCalledTimes(3);
    // And none of them is an anchor that merely scrolls to the hero.
    expect(document.querySelectorAll('a[href="#try"]')).toHaveLength(0);
  });

  test('the header exposes the public IA and one account action, and never an upload control', () => {
    renderLanding();
    const banner = screen.getByRole('banner');

    // This test used to assert the OPPOSITE - that the bar carried no sign-in
    // and exactly one button - on the reasoning that both CTAs already sat in
    // the hero and repeating them was noise. That was right for the page it
    // was written against: a single-purpose guest-upload page whose only
    // meaningful action was upload.
    //
    // It is wrong for this one. The public site now has five destinations and
    // two sub-routes; a visitor can land mid-page or arrive on /pricing, and
    // under the old rule such a visitor had no path to sign in at all. And
    // "pricing must be discoverable before account creation" cannot be
    // satisfied by a header that does not navigate to pricing.
    expect(within(banner).getByRole('link', { name: /How it works/i })).toBeInTheDocument();
    expect(within(banner).getByRole('link', { name: /^Pricing$/i })).toHaveAttribute(
      'href',
      '/pricing',
    );
    // Was "Trust and FAQ", pointing at two sections that answered the same
    // questions twice. One section, one label; the ROUTE is unchanged, because
    // renaming a public URL to match a heading costs readers, not us.
    expect(within(banner).getByRole('link', { name: /Before you begin/i })).toHaveAttribute(
      'href',
      '/trust',
    );
    expect(within(banner).getByRole('link', { name: /^Sign in$/i })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(within(banner).getByRole('link', { name: /^Create free account$/i })).toHaveAttribute(
      'href',
      '/register',
    );

    // What SURVIVES from the old rule, and is the part that was actually
    // load-bearing: the bar is not a fourth upload trigger. The CTA test above
    // counts exactly three, and a nav upload control would break that contract
    // from a distance.
    expect(within(banner).queryByRole('button', { name: /upload|resume|find my matches/i })).toBeNull();
    expect(within(banner).queryByRole('link', { name: /upload|resume/i })).toBeNull();

    // Chrome is still chrome: the theme setting plus the mobile disclosure.
    const controls = within(banner).getAllByRole('button');
    expect(controls).toHaveLength(2);
    expect(controls.map((c) => c.getAttribute('aria-label'))).toEqual(
      expect.arrayContaining([expect.stringMatching(/theme/i), expect.stringMatching(/menu/i)]),
    );

    // It still carries the wordmark home link.
    expect(within(banner).getByRole('link', { name: /Aspirely home/i })).toBeInTheDocument();
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

  test('the hero has no decorative film or poster', () => {
    const { container } = renderLanding();
    const hero = document.getElementById('try') as HTMLElement;

    expect(hero.querySelector('video')).toBeNull();
    expect(hero.querySelector('img[src*="poster"], img[src*="hero"]')).toBeNull();

    const cta = within(hero).getByRole('link', { name: /^Create free account$/i });
    expect(cta).toBeInTheDocument();
    void container;
  });

});

describe('honesty of the pre-upload composition', () => {
  test('no fabricated company, job title, or match score is rendered', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

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

  test('the hero preview is a product window, not a film or a screenshot', () => {
    renderLanding();
    const hero = document.getElementById('try') as HTMLElement;
    expect(hero.querySelector('video')).toBeNull();
    expect(hero.querySelector('img[src*="poster"], img[src*="hero"]')).toBeNull();
    expect(within(hero).getByText('Career Workspace')).toBeInTheDocument();
    expect(within(hero).getByText(/placeholders, not real results/i)).toBeInTheDocument();
  });

});

describe('product demo accessibility', () => {
  test('the idle hero preview is named and operable, not a silent decoration', () => {
    renderLanding();
    const hero = document.getElementById('try') as HTMLElement;
    expect(hero.querySelector('video, img[src*="poster"]')).toBeNull();
    expect(
      within(hero).getByRole('tablist', { name: /Illustrative workflow steps/i }),
    ).toBeInTheDocument();
    expect(within(hero).getByRole('tab', { name: /^Read$/i })).toBeInTheDocument();
  });

});

describe('capability status', () => {
  test('Available-now and Coming-next are distinct sections', async () => {
    renderLanding();

    const availableHeading = await screen.findByRole('heading', {
      name: /From resume to tracked, in one pass\./i,
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

  test('Auto Apply carries its registry status, and never reads as Available', async () => {
    renderLanding();
    const heading = await screen.findByRole('heading', { name: 'Auto Apply' });
    const card = heading.closest('div')?.parentElement as HTMLElement;

    // This used to assert the literal string 'Coming soon'. That froze a
    // snapshot of the registry rather than testing it: Auto Apply moved to
    // 'beta' and the card correctly started rendering 'Beta', so the test
    // failed while the code was right. The point of the test is that a
    // roadmap capability must never read as shipped - assert THAT, against
    // whatever the registry currently says.
    expect(within(card).getByText(STATUS_LABEL[AUTO_APPLY.status])).toBeInTheDocument();
    expect(within(card).queryByText(STATUS_LABEL.available)).not.toBeInTheDocument();
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

  test('statuses with different readiness are stated differently', async () => {
    renderLanding();
    await screen.findByRole('heading', { name: 'Auto Apply' });

    // SMS and push are materially less built than Auto Apply / WhatsApp, so
    // they must never be presented as the same kind of unfinished.
    //
    // The weaker status is carried by the row's own heading rather than by a
    // badge on each name: "Also planned: SMS alerts, Web and mobile push" says
    // it once, where a per-item chip said it three times in four words. What
    // matters is that the statement is present, is the PLANNED one, and comes
    // from the registry - not which element carries it.
    const planned = screen.getByText(new RegExp(`Also ${STATUS_LABEL.planned}:`, 'i'));
    const row = planned.parentElement as HTMLElement;

    expect(within(row).getByText('SMS alerts')).toBeInTheDocument();
    expect(within(row).getByText('Web and mobile push')).toBeInTheDocument();
    // ...and nothing in that row borrows the stronger promise.
    expect(within(row).queryByText(STATUS_LABEL['coming-soon'])).toBeNull();
    expect(STATUS_LABEL.planned).toBe('Planned');
    expect(STATUS_LABEL['coming-soon']).toBe('Coming soon');
  });

  test('every rendered status string comes from the registry', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

    const allowed = new Set(Object.values(STATUS_LABEL));
    // Any badge-like status word on the page must be one the registry defines.
    for (const cap of CAPABILITIES) {
      expect(allowed.has(STATUS_LABEL[cap.status])).toBe(true);
    }
    // And the dock reflects registry order/state rather than hardcoded copy.
    // The filter here used to be `!isLive(c.status)`, which encoded an
    // assumption that nothing in the dock was live. Auto Apply is 'beta',
    // which IS live, so the filter silently dropped it and the assertion
    // failed on a correct dock. What the dock promises is that it lists the
    // not-yet-shipped capabilities in registry order and labels each from the
    // registry - so assert the contents and the labels, not the liveness.
    expect(DOCK_CAPABILITIES.map((c) => c.id)).toEqual(['auto-apply', 'whatsapp']);
    for (const cap of DOCK_CAPABILITIES) {
      expect(screen.getAllByText(STATUS_LABEL[cap.status]).length).toBeGreaterThan(0);
    }
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
  test('with motion off the hero still paints copy and CTAs, with no film', async () => {
    setReducedMotion(true);
    renderLanding();
    const hero = document.getElementById('try') as HTMLElement;

    // The promise and both actions paint immediately.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/run your job search/i);
    expect(within(hero).getByRole('link', { name: /^Create free account$/i })).toBeInTheDocument();
    expect(within(hero).getByRole('button', { name: /^Find my matches$/i })).toBeInTheDocument();

    // No <video> and no poster: the hero is copy and CTAs on the canvas.
    expect(hero.querySelector('video')).toBeNull();
    expect(hero.querySelector('img[src*="poster"], img[src*="hero"]')).toBeNull();
  });

});

describe('route loading fallback', () => {
  // It used to take a `pinnedDark` flag, because AuthShell forced dark on both
  // themes and an unpinned fallback made /login flash light before going dark.
  // Auth follows the global theme now, so pinning would cause the INVERSE
  // flash for a light-mode user. Neutral on every route is the fix.
  test('stays theme-neutral so it never flashes against the page it precedes', () => {
    const { container } = render(<RouteLoadingFallback />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('dark');
    expect(root.className).not.toContain('bg-background');
    expect(root.style.colorScheme).toBe('');
  });
});

// ── 7b. One surface per page, chosen by the theme ────────────────

describe('surface language', () => {
  test('ONE surface owns the page, and it is the bright public canvas', async () => {
    const { container } = renderLanding();
    await screen.findByRole('heading', { level: 1 });

    // The page used to be obsidian at the top and bottom with a pearl band
    // bolted through the middle, which meant the theme toggle changed nothing
    // and scrolling went dark, light, dark.
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('surface-lumen');
    expect(root.className).not.toContain('surface-nocturne');
    expect(root.className).not.toContain('surface-obsidian');
    expect(root.style.colorScheme).toBe('light');

    // Every marketing section inherits it - none re-declares a surface, and
    // there is no band boundary left inside the page.
    for (const name of [/From matched to applied\./i, /Real openings\./i]) {
      const section = screen.getByRole('heading', { name }).closest('section') as HTMLElement;
      expect(section.className).not.toContain('surface-nocturne');
      expect(section.className).not.toContain('surface-lumen');
    }
  });

  test('an OS preference for dark does NOT hand a stranger a dark marketing page', async () => {
    // THE REGRESSION THIS EXISTS FOR. The public shells read
    // `useResolvedTheme()`, which folds `theme: 'system'` - what every
    // first-time visitor has - into light or dark from the operating system.
    // So a visitor whose laptop is set to dark chrome was served a near-black
    // plum landing page, with the hero film's readability wash painted in that
    // same near-black: the dark panel down the left of the hero and the
    // fade-to-black at its foot were one token resolving dark, not a design.
    //
    // Preferring dark application chrome is not a request for a dark marketing
    // page, and `/` is the one route where the first frame is the whole
    // impression. Only an explicit press of the theme control may darken it.
    const real = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => {
        const mql = real(query);
        if (!query.includes('prefers-color-scheme')) return mql;
        return { ...mql, matches: query.includes('dark') } as MediaQueryList;
      },
    });

    try {
      const { container } = renderLanding();
      await screen.findByRole('heading', { level: 1 });
      const root = container.firstElementChild as HTMLElement;

      expect(root.className).toContain('surface-lumen');
      expect(root.className).not.toContain('dark');
      expect(root.style.colorScheme).toBe('light');
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: real,
      });
    }
  });

  test('the illustrations follow the theme instead of pinning themselves dark', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

    // Both product windows were briefly held at obsidian regardless of theme,
    // which left a light page carrying black slabs. Neither may re-declare a
    // surface, and nothing inside them may be drawn with a literal white or
    // black - those are the two ways an illustration stops inverting.
    const frame = document.querySelector('.shadow-float') as HTMLElement;
    expect(frame.closest('.surface-obsidian')).toBeNull();
    expect(signalPanel().className).not.toContain('surface-obsidian');

    for (const root of [frame, signalPanel()]) {
      const literals = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) => {
        const c = typeof el.className === 'string' ? el.className : '';
        return /(^|\s)(bg|border|text)-(white|black)(\/|\s|$)/.test(c);
      });
      expect(literals.map((el) => el.className)).toEqual([]);
    }
  });

  test('the theme control flips the whole page', async () => {
    const user = userEvent.setup();
    const { container } = renderLanding();
    await screen.findByRole('heading', { level: 1 });
    const root = container.firstElementChild as HTMLElement;

    // The shared three-state control cycles light → dark → system → light, and
    // its label names both the state you are in and the one a press moves you
    // to. Every run starts at "system" (localStorage is cleared), so the first
    // press lands on the EXPLICIT light choice - which this suite's matchMedia
    // already resolved to, hence no visible change - and the second reaches
    // dark. That second press is the one that must repaint the whole page.
    await user.click(screen.getByRole('button', { name: /theme: system/i }));
    expect(root.className).toContain('surface-lumen');

    await user.click(screen.getByRole('button', { name: /theme: light/i }));

    expect(screen.getByRole('button', { name: /theme: dark/i })).toBeInTheDocument();
    // Charcoal, never the plum-black obsidian: pressing the toggle on the
    // public page lands in the same dark world the product uses rather than in
    // a third one.
    expect(root.className).toContain('surface-nocturne');
    expect(root.className).toContain('dark');
    expect(root.className).not.toContain('surface-lumen');
    expect(root.style.colorScheme).toBe('dark');
  });
});

// ── 7c. The transformation sequence ──────────────────────────────

describe('resume transformation sequence', () => {
  test('the six stages are real, keyboard-operable tabs', async () => {
    const user = userEvent.setup();
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Resume transformation stages/i,
    });
    const tabs = within(tablist).getAllByRole('tab');

    // Resume, Understood, Matched, Tailored, Tracked, Updates - the full flow.
    expect(tabs.map((t) => t.textContent?.split(/(?=[A-Z])/)[0])).toHaveLength(6);
    expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);

    tabs[0].focus();
    await user.keyboard('{End}');
    expect(tabs[5]).toHaveFocus();
    expect(tabs[5]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Home}');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    // The Tailored stage (index 3) carries the rewrite AND the guarantee.
    await user.click(tabs[3]);
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    expect(await within(signalPanel()).findByText('IntegrityGuard')).toBeInTheDocument();
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

  test('reduced motion lands on the headline stage fully resolved, no scrolling required', async () => {
    const user = userEvent.setup();
    setReducedMotion(true);
    renderLanding();
    const tablist = await screen.findByRole('tablist', {
      name: /Resume transformation stages/i,
    });
    const tabs = within(tablist).getAllByRole('tab');

    // The sequence auto-advances for everyone else; a reduced-motion visitor
    // must never have to wait or scroll to be shown the shipped product. It
    // resolves to the first stage (Resume) with its content already painted.
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(within(signalPanel()).getByText('Experience')).toBeInTheDocument();

    // And the integrity guarantee is a few clicks away, never hidden.
    await user.click(tabs[3]);
    expect(await within(signalPanel()).findByText('IntegrityGuard')).toBeInTheDocument();
  });
});

// ── 7d. The roadmap must never outweigh the shipped product ──────

describe('roadmap weight', () => {
  test('Coming next is structurally lighter than what actually ships', async () => {
    renderLanding();
    const shipped = (
      await screen.findByRole('heading', { name: /From resume to tracked, in one pass\./i })
    ).closest('section') as HTMLElement;
    const roadmap = screen
      .getByRole('heading', { name: /From matched to applied\./i })
      .closest('section') as HTMLElement;

    // jsdom does no layout, so this proxies section weight with rendered node
    // count. The roadmap section was once the TALLEST thing on the page -
    // bigger than the hero, for two features that do not work. How much page a
    // feature occupies is itself a claim about how real it is.
    //
    // Decorative subtrees are excluded from BOTH sides. Every section on this
    // page draws redacted structure out of many tiny aria-hidden bars, and a
    // raw node count therefore measures how detailed a section's illustration
    // is rather than how much it claims: the roadmap's two 110px preview cards
    // out-count the entire shipped stepper on nodes alone. Counting only nodes
    // that carry meaning to a reader compares the thing the rule is about.
    const substance = (el: HTMLElement) =>
      Array.from(el.querySelectorAll<HTMLElement>('*')).filter(
        (n) => !n.closest('[aria-hidden="true"]'),
      ).length;

    expect(substance(roadmap)).toBeLessThan(substance(shipped));
  });
});

// ── 7e. Copy rule ────────────────────────────────────────────────

describe('copy rules', () => {
  test('no user-visible string uses a long dash, curly quote or accented letter', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

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
    await screen.findByRole('heading', { level: 1 });
    const root = container.firstElementChild as HTMLElement;
    // jsdom performs no layout, so this asserts the guard is in place rather
    // than measuring real overflow (that is covered by browser verification).
    expect(root.className).toContain('overflow-x-clip');
  });

});

// ── 12. The public IA, the daily-agent preview, pricing and trust ────
//
// These cover the sections added when the landing stopped being a
// single-purpose guest-upload page. Note that the honesty assertions in
// section 3 sweep the WHOLE document, so they already cover these sections
// too: a fabricated company or a match percentage in the briefing preview
// fails there rather than needing its own test here.

describe('public IA', () => {
  test('the marketing movements render in the required reading order', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

    const ids = [
      'try',
      'how-it-works',
      'how',
      'pricing',
      'proof',
      // `trust` and `faq` merged into one decision section here.
      'before-you-begin',
      'coming-next',
      'get-started',
    ];
    const nodes = ids.map((id) => {
      const el = document.getElementById(id);
      expect(el, `#${id} is missing`).toBeTruthy();
      return el as HTMLElement;
    });
    for (let i = 1; i < nodes.length; i += 1) {
      const rel = nodes[i - 1].compareDocumentPosition(nodes[i]);
      expect(
        rel & Node.DOCUMENT_POSITION_FOLLOWING,
        `${ids[i]} should follow ${ids[i - 1]}`,
      ).toBeTruthy();
    }
  });

  test('exactly one h1, and it is the hero', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(/run your job search with clarity/i);
  });

  test('every new marketing section is labelled by its own heading', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });
    for (const id of ['how-it-works', 'pricing', 'before-you-begin']) {
      const section = document.getElementById(id) as HTMLElement;
      const labelledBy = section.getAttribute('aria-labelledby');
      expect(labelledBy, `#${id} has no aria-labelledby`).toBeTruthy();
      expect(document.getElementById(labelledBy as string)).toBeTruthy();
    }
  });
});

describe('the workday loop', () => {
  const section = () => document.getElementById('how-it-works') as HTMLElement;

  test('one section now carries the whole product story, in order', () => {
    renderLanding();
    const headings = within(section())
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);

    // This used to be two sections three apart - "How it works" (three
    // numbered steps) and "A day with Aspirely" (three chapters of a day) -
    // telling the same loop twice in two visual languages. They are one
    // walkthrough now, and it keeps the `how-it-works` id so the header link
    // and the scroll-spy need no change.
    expect(headings).toEqual([
      'Start with the work only you can do.',
      'It finds the signal and prepares the work.',
      'You stay in control of every important move.',
      // The fourth is the coda: applying is half a job search, and the
      // section would under-sell the platform without it.
      'And the next day starts stronger.',
    ]);
  });

  test('each chapter is anchored to a point in the day, without inventing a schedule', () => {
    renderLanding();
    const text = section().textContent ?? '';
    expect(text).toContain('Set direction');
    expect(text).toContain('While you are away / Aspirely works');
    expect(text).toContain('When you return / Your judgment');

    // The labels are RELATIVE on purpose. An earlier draft opened with
    // "09:00 / Set direction", which reads as a promise that Aspirely runs on a
    // clock - a schedule the product does not guarantee and no endpoint backs.
    // "While you are away" and "When you return" say the same thing about
    // sequence while claiming nothing about timing.
    expect(text).not.toMatch(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/i);
  });

  test('the merged-away section is gone, and nothing links to it', () => {
    renderLanding();
    expect(document.getElementById('daily-briefing')).toBeNull();
    expect(document.querySelectorAll('a[href="#daily-briefing"]')).toHaveLength(0);
    // The old copy went with it rather than being duplicated into the merge.
    expect(document.body.textContent).not.toMatch(/three steps, then it runs/i);
    expect(document.body.textContent).not.toMatch(/a day with aspirely/i);
  });

  test('it is labelled as an example, and the approval control is inert', () => {
    renderLanding();
    expect(
      within(section()).getByText(/an example of the aspirely workflow/i),
    ).toBeInTheDocument();

    // A picture of a control, not a control. A real button here would be a
    // dead control on a marketing page, which this suite refuses elsewhere.
    expect(within(section()).queryByRole('button', { name: /approve/i })).toBeNull();
    expect(within(section()).queryByRole('link', { name: /approve/i })).toBeNull();
  });

  test('the preview frames fabricate no data', () => {
    renderLanding();
    const text = section().textContent ?? '';
    // The frames carry OUR ui labels over bar-and-pill placeholders. What they
    // must never carry is a value that looks like a real match, count or
    // outcome. (The document-wide company/score sweep in section 3 covers the
    // rest.)
    expect(text).not.toMatch(/\d+\s*%/);
    expect(text).not.toMatch(/\b\d+\s+(new\s+)?(roles|matches|jobs|applications)\b/i);
    expect(text).not.toMatch(/guarantee|guaranteed|hired/i);
  });

  test('it states plainly that nothing is submitted without permission', () => {
    renderLanding();
    expect(section().textContent).toMatch(/nothing is submitted without your permission/i);
  });

  test('the story does not stop at applying - it closes the loop', () => {
    renderLanding();
    const text = section().textContent ?? '';

    // Without this beat the section reads as a better auto-apply. Aspirely
    // also carries interview prep, the skill gaps applications reveal, and a
    // weekly read - all shipped surfaces under /app/grow.
    expect(text).toMatch(/and the next day starts stronger/i);
    expect(text).toMatch(/interview preparation/i);
    expect(text).toMatch(/gaps your applications reveal/i);
    expect(text).toMatch(/weekly read/i);

    // And it still claims nothing about outcomes.
    expect(text).not.toMatch(/hired|guarantee|success rate|faster than/i);
  });

  test('the approval state carries the Auto Apply registry status', () => {
    renderLanding();
    expect(within(section()).getByText(STATUS_LABEL[AUTO_APPLY.status])).toBeInTheDocument();
  });
});

describe('pricing on the public page', () => {
  test('the three plan names come from the entitlements contract, in order', () => {
    renderLanding();
    const section = document.getElementById('pricing') as HTMLElement;
    const names = within(section)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual(PLAN_ORDER.map((id) => PLAN_LABEL[id]));
  });

  test('no price, currency symbol or per-month string renders anywhere on the page', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/[$\u20ac\u00a3\u20b9]/);
    expect(text).not.toMatch(/\b\d+\.\d{2}\b/);
    expect(text).not.toMatch(/\/\s*mo\b/i);
  });

  test('the only pricing CTA is account creation, and paid tiers carry no control at all', () => {
    renderLanding();
    const section = document.getElementById('pricing') as HTMLElement;
    const ctas = within(section)
      .getAllByRole('link')
      .filter((a) => /create free account/i.test(a.textContent ?? ''));
    expect(ctas).toHaveLength(1);
    expect(ctas[0]).toHaveAttribute('href', '/register');
    // A disabled "coming soon" button is exactly what the roadmap sections
    // refuse to ship, so pricing may not grow one either.
    expect(within(section).queryAllByRole('button')).toHaveLength(0);
    expect(within(section).getAllByText(/included when paid plans open/i)).toHaveLength(2);
  });
});

describe('before you begin', () => {
  const section = () => document.getElementById('before-you-begin') as HTMLElement;

  test('the two duplicated sections are gone, and nothing links to them', () => {
    renderLanding();

    // `#trust` (six open answers under "Before you sign up") and `#faq` (seven
    // disclosures) sat next to each other saying the same six things twice in
    // two visual languages: what this is, who it is for, that nothing submits
    // without permission, that the free plan exists, and that you can leave.
    // A reader who had just been told something does not trust it more for
    // being told it again one section later.
    expect(document.getElementById('trust')).toBeNull();
    expect(document.getElementById('faq')).toBeNull();
    expect(document.querySelectorAll('a[href="#trust"], a[href="#faq"]')).toHaveLength(0);

    // The old headings went with them rather than being carried into the merge.
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/the questions worth asking first/i);
    expect(text).not.toMatch(/common questions\./i);
    expect(text).not.toMatch(/read all six answers/i);
  });

  test('one section carries the decision: the offer, the control line, and one CTA', () => {
    renderLanding();

    expect(
      within(section()).getByRole('heading', {
        name: /Everything you need to know before you begin\./i,
      }),
    ).toBeInTheDocument();
    expect(section().textContent).toMatch(
      /You stay in control of your information, your applications, and every important decision\./i,
    );

    // ONE primary action, and a quiet sign-in beside it. A decision section
    // with two competing commands is asking the reader to decide twice.
    const ctas = within(section())
      .getAllByRole('link')
      .filter((a) => /^create free account$/i.test(a.textContent ?? ''));
    expect(ctas).toHaveLength(1);
    expect(ctas[0]).toHaveAttribute('href', '/register');
    expect(within(section()).getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );

    // The legal detail is linked, never restated in the answers.
    expect(within(section()).getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(within(section()).getByRole('link', { name: /^terms$/i })).toHaveAttribute(
      'href',
      '/terms',
    );
  });

  test('the answers are grouped, and every one is a native disclosure', () => {
    renderLanding();

    const groups = within(section())
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(groups).toEqual([
      'Who Aspirely is for',
      'What Aspirely helps with',
      'Control and automation',
      'Plans, privacy, and flexibility',
    ]);

    // Native <details>/<summary>: focusable, Enter/Space-operable and
    // state-exposing for free, with no Radix accordion in the eager chunk.
    const summaries = section().querySelectorAll('summary');
    expect(summaries).toHaveLength(12);
    summaries.forEach((el) => {
      expect(el.getAttribute('tabindex')).not.toBe('-1');
    });

    // ALL CLOSED on arrival. One pre-opened panel makes the other eleven read
    // as less important versions of it.
    expect(section().querySelectorAll('details[open]')).toHaveLength(0);
  });

  test('the load-bearing answers survived the merge intact', async () => {
    const user = userEvent.setup();
    renderLanding();

    // The automation answer is the one a nervous visitor is actually here for,
    // and it may never be softened into "you are in control" alone.
    expect(
      within(section()).getByRole('heading', { name: /Will Aspirely apply without my permission\?/i }),
    ).toBeInTheDocument();
    expect(section().textContent).toMatch(/no setting at all until you choose one/i);

    // ...and it still carries the registry's status rather than a hand-typed one.
    expect(within(section()).getByText(STATUS_LABEL[AUTO_APPLY.status])).toBeInTheDocument();

    // Opening one is a real disclosure, not a link somewhere else.
    const summary = within(section()).getByRole('heading', {
      name: /Can I start for free\?/i,
    }).parentElement as HTMLElement;
    await user.click(summary);
    expect((summary.closest('details') as HTMLDetailsElement).open).toBe(true);
  });
});

// ── 13. The redesigned hero: two real actions, and a real film ──────────

describe('hero composition', () => {
  const hero = () => document.getElementById('try') as HTMLElement;

  test('the headline is the promise, and it is the only h1', async () => {
    renderLanding();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Run your job search with clarity, consistency, and control.');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  test('the two hero actions are Create free account and Find my matches, and both are real', async () => {
    const user = userEvent.setup();
    renderLanding();

    const account = within(hero()).getByRole('link', { name: /^Create free account$/i });
    expect(account).toHaveAttribute('href', '/register');

    // The second action must START something, not scroll somewhere. The hero
    // briefly paired the account CTA with "See how it works", which spent the
    // second-most valuable control on the page moving the viewport.
    const matches = within(hero()).getByRole('button', { name: /^Find my matches$/i });
    const input = (await screen.findByLabelText(/^Resume file/)) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    await user.click(matches);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    expect(within(hero()).queryByText(/see how it works/i)).toBeNull();
  });

  test('the hero carries ONE trust line, not a stack of reassurances', () => {
    renderLanding();
    expect(
      within(hero()).getByText(/Free to start\. Nothing is submitted without your approval\./i),
    ).toBeInTheDocument();
    // The three separate micro-notes that used to sit under the CTAs are gone;
    // each one made the next one cheaper.
    expect(within(hero()).queryByText(/no account needed/i)).toBeNull();
    expect(within(hero()).queryByText(/Private upload/i)).toBeNull();
  });

  test('the existing-user path is present but does not compete with the CTAs', () => {
    renderLanding();
    const signIn = within(hero()).getByRole('link', { name: /^Sign in$/i });
    expect(signIn).toHaveAttribute('href', '/login');
    // It follows both primary actions in reading order rather than sitting
    // between them.
    const account = within(hero()).getByRole('link', { name: /^Create free account$/i });
    expect(account.compareDocumentPosition(signIn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('the idle hero shows the workspace preview with redacted structure, not invented results', () => {
    renderLanding();
    expect(screen.getByText('Career Workspace')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: /Illustrative workflow steps/i })).toBeInTheDocument();
    expect(screen.getByText(/Illustrative workflow/i)).toBeInTheDocument();
    // Still no fabricated outcomes inside that window.
    expect(document.body.textContent ?? '').not.toMatch(/\d{1,3}\s*%\s*(match|fit)/i);
  });
});

describe('hero product film', () => {
  test('the generated loop and poster are not mounted on the hero', () => {
    renderLanding();
    const hero = document.getElementById('try') as HTMLElement;
    expect(hero.querySelector('video')).toBeNull();
    expect(hero.querySelector('img[src*="aspirely-hero"]')).toBeNull();
  });
});

describe('public nav current page', () => {
  function renderNav(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <ThemeProvider>
          <LandingNav />
        </ThemeProvider>
      </MemoryRouter>,
    );
  }

  test('on /pricing, Pricing is marked current and the others are not', () => {
    renderNav('/pricing');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: /^Pricing$/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(banner).getByRole('link', { name: /How it works/i })).not.toHaveAttribute(
      'aria-current',
    );
    expect(within(banner).getByRole('link', { name: /Before you begin/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  test('on /trust, Before you begin is marked current', () => {
    renderNav('/trust');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: /Before you begin/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(banner).getByRole('link', { name: /^Pricing$/i })).not.toHaveAttribute(
      'aria-current',
    );
  });
});

describe('signed-in public chrome', () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
  });

  test('does not sell signup: no Sign in, Create free account, or Find my matches', () => {
    renderLanding();

    expect(screen.queryByRole('link', { name: /^Sign in$/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /create free account/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /find my matches/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /find my matches/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /upload your resume/i })).toBeNull();
    expect(screen.queryByText(/already have an account/i)).toBeNull();
    expect(screen.queryByText(/create a free account and set your direction/i)).toBeNull();
  });

  test('the bar and the hero each carry one workspace action, not a stack of them', () => {
    renderLanding();
    const banner = screen.getByRole('banner');
    const hero = document.getElementById('try') as HTMLElement;

    const navCta = within(banner).getByRole('link', { name: /^Open my workspace$/i });
    expect(navCta).toHaveAttribute('href', '/app/home');
    expect(within(banner).queryByRole('link', { name: /^Sign in$/i })).toBeNull();
    expect(within(banner).queryByRole('link', { name: /create free account/i })).toBeNull();

    const heroCtas = within(hero).getAllByRole('link', { name: /^Open my workspace$/i });
    expect(heroCtas).toHaveLength(1);
    expect(heroCtas[0]).toHaveAttribute('href', '/app/home');
    expect(within(hero).queryByText(/you're signed in/i)).toBeInTheDocument();
  });

  test('pricing, before you begin, the close, and the footer all continue the workspace, not signup', () => {
    renderLanding();

    const pricing = document.getElementById('pricing') as HTMLElement;
    const pricingCta = within(pricing).getByRole('link', { name: /^Open my workspace$/i });
    expect(pricingCta).toHaveAttribute('href', '/app/home');
    expect(within(pricing).queryByRole('link', { name: /create free account/i })).toBeNull();

    const before = document.getElementById('before-you-begin') as HTMLElement;
    expect(within(before).getByRole('link', { name: /^Open my workspace$/i })).toHaveAttribute(
      'href',
      '/app/home',
    );
    expect(within(before).queryByRole('link', { name: /sign in/i })).toBeNull();

    const close = document.getElementById('get-started') as HTMLElement;
    expect(within(close).getByRole('heading', { name: /your workspace is waiting/i })).toBeInTheDocument();
    expect(within(close).getByRole('link', { name: /^Open my workspace$/i })).toHaveAttribute(
      'href',
      '/app/home',
    );
    expect(within(close).queryByRole('link', { name: /^Sign in$/i })).toBeNull();

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: /^Workspace$/i })).toHaveAttribute(
      'href',
      '/app/home',
    );
    expect(within(footer).queryByRole('link', { name: /^Sign in$/i })).toBeNull();
  });
});

