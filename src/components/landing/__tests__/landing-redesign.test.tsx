/**
 * The public home page - its honesty and interaction contract.
 *
 * The page was rebuilt on 2026-11-15 as a sales page that shows rather than
 * tells: a four-step product tour a visitor can drive, five feature scenes to
 * operate, a sponsorship switch, the roadmap. The composition changed; the
 * rules these tests exist to hold did not. Each one stops a regression that would be
 * a lie or a usability failure on a public page:
 *  - an upload CTA quietly becoming a two-click upload again,
 *  - a product scene growing a real company name, an outcome claim or a score
 *    written as a percentage,
 *  - sample data shown without saying it is sample data,
 *  - a roadmap capability drifting into looking available,
 *  - a "coming soon" control that appears to do something and doesn't,
 *  - status labels being hand-typed into a component instead of read from the
 *    one registry,
 *  - a price being printed before one has been decided.
 *
 * The API layer is mocked at the `apiService` boundary, matching the existing
 * guest-landing-flow suite.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
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
import { TOUR_LABEL } from '@/components/landing/tour/ProductTour';
import { SAMPLE_TAG } from '@/components/landing/_shared';
import {
  RESUME_LINES,
  SAMPLE_NOTE,
  SAMPLE_ROLES,
  TAILOR_PLAN,
  tailoredOrder,
} from '@/components/landing/sample';
import { fitBand } from '@/components/job-search/fitBands';
import {
  AUTO_APPLY,
  CAPABILITIES,
  NO_WAITLIST_CTA,
  ROADMAP_FEATURED,
  ROADMAP_SECONDARY,
  STATUS_LABEL,
  WHATSAPP,
  isLive,
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

const byId = (id: string) => document.getElementById(id) as HTMLElement;
const hero = () => byId('try');

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setReducedMotion(false);
  authState.isAuthenticated = false;
  authState.isLoading = false;
  api.guestSession.mockResolvedValue({ data: { exists: false }, status: 200 });
});

// ── 1. Upload is ONE click from every upload CTA ─────────────────

describe('primary CTA', () => {
  test('EVERY upload CTA opens the SAME single file input on that click', async () => {
    const user = userEvent.setup();
    renderLanding();

    // Exactly one file input on the whole page.
    const inputs = document.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);
    const input = inputs[0] as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

    // The upload has ONE name wherever it is a button: the hero, the
    // sponsorship chapter and the close.
    const triggers = screen.getAllByRole('button', { name: /^Find my matches$/i });
    expect(triggers).toHaveLength(3);
    for (const trigger of triggers) await user.click(trigger);
    // Plus the drop surface under the tour. Same picker.
    await user.click(
      await screen.findByRole('button', { name: /Drop your resume to see your matches/i }),
    );

    expect(clickSpy).toHaveBeenCalledTimes(4);
    // And none of them is an anchor that merely scrolls to the hero.
    expect(document.querySelectorAll('a[href="#try"]')).toHaveLength(0);
  });

  test('the header exposes the public IA and one account action, and never an upload control', () => {
    renderLanding();
    const banner = screen.getByRole('banner');

    expect(within(banner).getByRole('link', { name: /^Features$/i })).toHaveAttribute(
      'href',
      '#features',
    );
    expect(within(banner).getByRole('link', { name: /^Sponsorship$/i })).toHaveAttribute(
      'href',
      '#sponsorship',
    );
    // Pricing and the FAQ are routes, not anchors: the marketing sections
    // unmount the moment a guest upload starts, and an anchor to a section
    // that no longer exists silently does nothing.
    expect(within(banner).getByRole('link', { name: /^Pricing$/i })).toHaveAttribute(
      'href',
      '/pricing',
    );
    // Labelled FAQ (it was "Before you begin", the section's own heading). The
    // ROUTE is unchanged, because renaming a public URL costs readers, not us.
    expect(within(banner).getByRole('link', { name: /^FAQ$/i })).toHaveAttribute('href', '/trust');
    expect(within(banner).getByRole('link', { name: /^Sign in$/i })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(within(banner).getByRole('link', { name: /^Create free account$/i })).toHaveAttribute(
      'href',
      '/register',
    );

    // The bar is not a fourth upload trigger. The CTA test above counts
    // exactly three, and a nav upload control would break that contract from a
    // distance.
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

    await user.click(within(hero()).getByRole('button', { name: /^Find my matches$/i }));

    // The CTA itself opened the dialog. It did not scroll to, or focus, a
    // different uploader and wait for a second activation.
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  test('the hero has no film and no raster image; its picture is the labelled product tour', () => {
    renderLanding();

    // No video, no image to wait for, no WebGL: the picture of the product is
    // the product's own markup, with one accessible name for the whole scene.
    expect(hero().querySelector('video')).toBeNull();
    expect(hero().querySelectorAll('img')).toHaveLength(0);
    expect(hero().querySelector('canvas')).toBeNull();
    expect(within(hero()).getByRole('group', { name: TOUR_LABEL })).toBeInTheDocument();
    // It plays through its steps for longer than 5s, so a pause control must
    // exist (WCAG 2.2.2).
    expect(within(hero()).getByRole('button', { name: /pause animation/i })).toBeInTheDocument();

    expect(within(hero()).getByRole('link', { name: /^Create free account$/i })).toBeInTheDocument();
  });
});

// ── 2. Sample data is honest about being sample data ─────────────

describe('honesty of the product scenes', () => {
  test('no real company, no outcome claim, and no score written as a percentage', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

    const text = document.body.textContent ?? '';

    // Real-company names that would imply partnerships we do not have.
    for (const brand of ['Stripe', 'Google', 'Meta', 'Amazon', 'Netflix', 'Acme', 'TechCorp']) {
      expect(text).not.toContain(brand);
    }
    // Any "NN% match"-shaped claim. The product reports a band and a score,
    // never a percentage of anything.
    expect(text).not.toMatch(/\d{1,3}\s*%\s*(match|fit)/i);
    expect(text).not.toMatch(/\d+\s*%/);
    // Placeholder job titles from the old demo vocabulary.
    expect(text).not.toMatch(/Senior (Frontend|Backend|Software) Engineer at/i);
    // No outcome is promised anywhere on the page.
    expect(text).not.toMatch(/guarantee|guaranteed|get hired|hired faster|success rate|faster than/i);
    expect(text).not.toMatch(/\b\d+x\b/i);
    // And no count of people, because there is no audited one to print.
    expect(text).not.toMatch(/trusted by|\b\d[\d,.]*\s*(k|m|million|thousand)?\+?\s*(users|job seekers|members)\b/i);
  });

  test('every scene that uses sample data says so in words', () => {
    renderLanding();

    // The tour: in its accessible name AND in visible text beside it.
    expect(within(hero()).getByRole('group', { name: /Sample data, not real results/i })).toBeInTheDocument();
    expect(hero().textContent).toContain(SAMPLE_NOTE);
    // The other scenes reuse the same roles, and
    // say so too, with a tag rather than a repeated sentence.
    for (const id of ['noise', 'features', 'sponsorship']) {
      expect(byId(id).textContent, `#${id}`).toContain(SAMPLE_TAG);
    }
  });

  test("the sample scores sit in the product's own bands, with the product's own words", () => {
    // A sample that showed "Strong match" beside a 60 would teach visitors a
    // scale the product does not use. The bands come from the scoring engine
    // via `fitBands.ts`; the sample may not drift from them.
    for (const role of SAMPLE_ROLES) {
      expect(fitBand(role.score).label, `${role.title} (${role.score})`).toBe(role.band);
    }
  });

  test('every sample role states a gap as well as a fit', () => {
    // The product says what is missing as plainly as what matches. A sample
    // board of nothing but perfect fits would misdescribe it.
    for (const role of SAMPLE_ROLES) {
      expect(role.gap.length).toBeGreaterThan(0);
      expect(role.asks.some((a) => !a.met), `${role.title} shows no gap`).toBe(true);
    }
  });
});

// ── 3. The product tour is a real, operable control ──────────────

describe('product tour', () => {
  const tour = () => within(hero()).getByRole('group', { name: TOUR_LABEL });
  const steps = () => within(tour()).getByRole('tablist', { name: /Tour steps/i });
  const openStep = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
    await user.click(within(steps()).getByRole('tab', { name }));
  };

  test('the four steps are real tabs with one tab stop, in the product order', async () => {
    const user = userEvent.setup();
    renderLanding();

    const tabs = within(steps()).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent?.split(' ')[0])).toEqual(['1Read', '2Match', '3Tailor', '4Track']);
    // Roving tabindex: exactly one step is in the tab order.
    expect(tabs.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);
    // It opens on the outcome, the matches, not on the input.
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');

    tabs[1].focus();
    await user.keyboard('{ArrowRight}');
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveFocus();
  });

  test('the matches are a real vertical tablist, and the reading follows the role', async () => {
    const user = userEvent.setup();
    renderLanding();
    await openStep(user, /^Match/);

    const list = await within(tour()).findByRole('tablist', { name: /Sample roles/i });
    expect(list).toHaveAttribute('aria-orientation', 'vertical');
    const roles = within(list).getAllByRole('tab');
    expect(roles).toHaveLength(SAMPLE_ROLES.length);
    expect(roles.filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);

    roles[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(roles[1]).toHaveAttribute('aria-selected', 'true');
    expect(roles[1]).toHaveFocus();
    // The reading cross-fades, so the new role's band arrives a beat later.
    const reading = document.getElementById(roles[1].getAttribute('aria-controls') as string) as HTMLElement;
    expect(reading).toHaveAttribute('aria-labelledby', roles[1].id);
    expect(await within(reading).findByText(SAMPLE_ROLES[1].band)).toBeInTheDocument();
  });

  test('every button inside the tour does something: the role you pick carries through', async () => {
    const user = userEvent.setup();
    renderLanding();
    await openStep(user, /^Match/);

    // Pick the second role, save it, then tailor for it.
    const list = await within(tour()).findByRole('tablist', { name: /Sample roles/i });
    await user.click(within(list).getAllByRole('tab')[1]);
    // The reading cross-fades between roles; wait for the new one before
    // pressing anything in it.
    await within(tour()).findByText(`${SAMPLE_ROLES[1].title} at ${SAMPLE_ROLES[1].company}`);
    const save = await within(tour()).findByRole('button', { name: /^Save$/ });
    await user.click(save);
    expect(await within(tour()).findByRole('button', { name: /^Saved$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(tour()).getByRole('button', { name: /Tailor resume/ }));
    expect(within(steps()).getByRole('tab', { name: /^Tailor/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // The tailoring step is about THAT role, not a fixed one.
    await user.click(await within(tour()).findByRole('button', { name: /^Tailored$/ }));
    expect(tour().textContent).toContain(
      `Tailored for ${SAMPLE_ROLES[1].title}, ${SAMPLE_ROLES[1].company}`,
    );

    await user.click(within(tour()).getByRole('button', { name: /Mark as applied/ }));
    expect(within(steps()).getByRole('tab', { name: /^Track/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // The tour does not dead-end: its last step offers the real thing, through
    // the page's one file picker.
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    await user.click(await within(tour()).findByRole('button', { name: /Try it with my resume/i }));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Nothing in the tour touches the network.
    expect(api.guestOnboard).not.toHaveBeenCalled();
    expect(api.guestMatches).not.toHaveBeenCalled();
    expect(api.guestTailor).not.toHaveBeenCalled();
  });

  test('once a visitor takes the tour it never moves by itself again', async () => {
    const user = userEvent.setup();
    renderLanding();

    expect(within(hero()).getByRole('button', { name: /pause animation/i })).toBeInTheDocument();
    await openStep(user, /^Tailor/);

    // With nothing left to pause, the pause control goes too.
    expect(within(hero()).queryByRole('button', { name: /pause animation|play animation/i })).toBeNull();
    expect(within(steps()).getByRole('tab', { name: /^Tailor/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('tailoring adds no fact: the same lines, word for word, in a different order', async () => {
    const user = userEvent.setup();
    renderLanding();
    await openStep(user, /^Tailor/);

    const group = await within(tour()).findByRole('group', { name: /resume version/i });
    const original = within(group).getByRole('button', { name: /^Original$/ });
    const tailored = within(group).getByRole('button', { name: /^Tailored$/ });
    const lines = () =>
      Array.from(tour().querySelectorAll('.pub-sheet li')).map((li) => li.textContent ?? '');

    expect(original).toHaveAttribute('aria-pressed', 'true');
    const before = lines();
    expect(before).toHaveLength(RESUME_LINES.length);

    await user.click(tailored);
    expect(tailored).toHaveAttribute('aria-pressed', 'true');
    const after = lines();

    // THE RULE THE PRODUCT IS BUILT ON, held structurally. If this demo ever
    // grows a new number or a stronger verb, it is demonstrating the one
    // thing Aspirely refuses to do.
    expect(after).not.toEqual(before);
    expect([...after].sort()).toEqual([...before].sort());
    expect(tour().textContent).toMatch(/No fact was added\./);

    await user.click(original);
    expect(lines()).toEqual(before);
  });

  test('the tailoring plan for EVERY sample role only reorders and marks', () => {
    // The plan has no field for new wording at all; this pins that the data
    // cannot smuggle any in.
    const ids = RESUME_LINES.map((l) => l.id);
    const phrases = RESUME_LINES.flatMap((l) =>
      l.text.filter((seg) => typeof seg !== 'string').map((seg) => (seg as { mark: string }).mark),
    );
    for (const role of SAMPLE_ROLES) {
      const plan = TAILOR_PLAN[role.id];
      expect(plan, `${role.id} has no tailoring plan`).toBeTruthy();
      expect(Object.keys(plan).sort()).toEqual(['lead', 'marks']);
      const order = tailoredOrder(role.id);
      expect([...order].sort()).toEqual([...ids].sort());
      expect(order, `${role.id} is not reordered`).not.toEqual(ids);
      for (const mark of plan.marks) expect(phrases).toContain(mark);
    }
  });
});

// ── 4. Capability status comes from the registry ─────────────────

describe('capability status', () => {
  test('what ships and what is coming are distinct sections', () => {
    renderLanding();
    const shipped = byId('features');
    const roadmap = byId('coming-next');
    expect(shipped).toBeTruthy();
    expect(roadmap).toBeTruthy();
    expect(shipped).not.toBe(roadmap);
    expect(shipped.contains(roadmap)).toBe(false);

    // Nothing in the shipped story carries a roadmap status.
    const text = shipped.textContent ?? '';
    for (const label of [STATUS_LABEL['coming-soon'], STATUS_LABEL.planned, STATUS_LABEL.beta]) {
      expect(text).not.toContain(label);
    }
  });

  test('nothing on the roadmap is live, and nothing live is on the roadmap', () => {
    // The registry rule: a capability is live only if a normal user can reach
    // it in the default shell. The roadmap section says "not available yet"
    // in its own heading, so listing a live capability there would be wrong
    // in the other direction.
    for (const cap of [...ROADMAP_FEATURED, ...ROADMAP_SECONDARY]) {
      expect(isLive(cap.status), `${cap.name} is live but listed as roadmap`).toBe(false);
    }
  });

  test('every featured roadmap entry renders with its registry status, never as Available', () => {
    renderLanding();
    for (const cap of ROADMAP_FEATURED) {
      const heading = screen.getByRole('heading', { name: cap.name });
      const entry = heading.closest('li') as HTMLElement;
      expect(within(entry).getByText(STATUS_LABEL[cap.status])).toBeInTheDocument();
      expect(within(entry).queryByText(STATUS_LABEL.available)).not.toBeInTheDocument();
      expect(entry.textContent).toContain(cap.blurb);
    }
    // Auto Apply in particular: its UI was removed from the default shell on
    // 2026-11-12, so it may not read as usable.
    expect(isLive(AUTO_APPLY.status)).toBe(false);
  });

  test('WhatsApp is labelled Coming soon, and described as alerts + approvals (not "messages")', () => {
    renderLanding();
    const heading = screen.getByRole('heading', { name: /WhatsApp alerts and approvals/i });
    const entry = heading.closest('li') as HTMLElement;

    expect(within(entry).getByText('Coming soon')).toBeInTheDocument();
    expect(WHATSAPP.status).toBe('coming-soon');

    // Guardrails that keep this from reading as recruiter spam.
    const text = entry.textContent ?? '';
    expect(text).toMatch(/opt-in/i);
    expect(text).toMatch(/never recruiter outreach/i);
    // No implication of a Meta/WhatsApp endorsement.
    expect(text).not.toMatch(/official|partner|endorsed|verified by/i);
  });

  test('statuses with different readiness are stated differently', () => {
    renderLanding();

    // SMS and push are materially less built than the featured entries, so
    // they must never be presented as the same kind of unfinished. The weaker
    // status is carried once by the row's own label, and comes from the
    // registry.
    const planned = screen.getByText(new RegExp(`Also ${STATUS_LABEL.planned}:`, 'i'));
    const row = planned.parentElement as HTMLElement;

    expect(within(row).getByText('SMS alerts')).toBeInTheDocument();
    expect(within(row).getByText('Web and mobile push')).toBeInTheDocument();
    // ...and nothing in that row borrows the stronger promise.
    expect(within(row).queryByText(STATUS_LABEL['coming-soon'])).toBeNull();
    expect(STATUS_LABEL.planned).toBe('Planned');
    expect(STATUS_LABEL['coming-soon']).toBe('Coming soon');
  });

  test('every status string in the registry is one the label table defines', () => {
    const allowed = new Set(Object.values(STATUS_LABEL));
    for (const cap of CAPABILITIES) {
      expect(allowed.has(STATUS_LABEL[cap.status])).toBe(true);
    }
  });
});

// ── 5. The roadmap offers nothing that looks operable ────────────

describe('future-feature controls', () => {
  const roadmap = () => byId('coming-next');

  test('the roadmap offers nothing that operates a feature', () => {
    renderLanding();
    // A picture of an interface that does not exist, or a button that does
    // nothing, is how a roadmap starts to read as a feature list. The only
    // interactive thing here is a native disclosure that unfolds the detail.
    expect(roadmap().querySelectorAll('button, a, input')).toHaveLength(0);
    expect(roadmap().querySelectorAll('details')).toHaveLength(ROADMAP_FEATURED.length);
    expect(roadmap().querySelectorAll('details[open]')).toHaveLength(0);
    expect(api.guestOnboard).not.toHaveBeenCalled();
    expect(api.guestMatches).not.toHaveBeenCalled();
    expect(api.guestTailor).not.toHaveBeenCalled();
    expect(api.guestClaim).not.toHaveBeenCalled();
  });

  test('no waitlist is offered or confirmed - the only action is a free account', () => {
    renderLanding();
    const text = document.body.textContent ?? '';
    // There is no waitlist table in the backend, so nothing may say this.
    expect(text).not.toMatch(/join (the )?waitlist/i);
    expect(text).not.toMatch(/you're on the list|added to the waitlist|we'll be in touch/i);
    expect(roadmap().textContent).toContain(NO_WAITLIST_CTA);
  });

  test('roadmap items do not use a padlock (they are not paid features)', () => {
    renderLanding();
    // A lock reads "pay to unlock". None of these are purchasable - and the
    // upgrade endpoint is a stub, so a lock would be doubly misleading.
    expect(document.querySelector('.lucide-lock-keyhole')).toBeNull();
    expect(document.querySelector('.lucide-lock')).toBeNull();
  });

  test('the roadmap is structurally lighter than what actually ships', () => {
    renderLanding();
    // jsdom does no layout, so this proxies section weight with rendered node
    // count, excluding decorative subtrees. How much page a feature occupies
    // is itself a claim about how real it is.
    const substance = (el: HTMLElement) =>
      Array.from(el.querySelectorAll<HTMLElement>('*')).filter(
        (n) => !n.closest('[aria-hidden="true"]'),
      ).length;
    // Measured against the hero, where the product is actually shown working.
    expect(substance(roadmap())).toBeLessThan(substance(hero()));
  });
});

// ── 6. Reduced motion ────────────────────────────────────────────

describe('reduced motion', () => {
  test('with motion off the hero paints copy, both actions and a still tour', () => {
    setReducedMotion(true);
    renderLanding();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/wake up to jobs/i);
    expect(within(hero()).getByRole('link', { name: /^Create free account$/i })).toBeInTheDocument();
    expect(within(hero()).getByRole('button', { name: /^Find my matches$/i })).toBeInTheDocument();

    // The tour never moves by itself, so there is nothing to pause.
    expect(document.querySelector('[data-product-tour]')).toHaveAttribute(
      'data-product-tour',
      'still',
    );
    expect(within(hero()).queryByRole('button', { name: /pause animation/i })).toBeNull();
    // It is still fully operable.
    expect(within(hero()).getByRole('tablist', { name: /Tour steps/i })).toBeInTheDocument();
  });

  test('with motion off every scene opens already resolved, with nothing waiting on a timer', async () => {
    setReducedMotion(true);
    const user = userEvent.setup();
    renderLanding();
    const steps = within(hero()).getByRole('tablist', { name: /Tour steps/i });

    // Tailoring: already on the tailored version.
    await user.click(within(steps).getByRole('tab', { name: /^Tailor/ }));
    expect(within(hero()).getByRole('button', { name: /^Tailored$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(hero().textContent).toMatch(/No fact was added\./);

    // The pipeline: the reply has already arrived, and there is no replay.
    await user.click(within(steps).getByRole('tab', { name: /^Track/ }));
    expect(hero().textContent).toMatch(/Interview invitation from /);
    expect(within(hero()).queryByRole('button', { name: /replay/i })).toBeNull();

    // Sponsorship: the board is already sorted by evidence.
    expect(
      within(byId('sponsorship')).getByRole('switch', { name: /I need sponsorship/i }),
    ).toHaveAttribute('aria-checked', 'true');
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

// ── 7. One surface per page, chosen by the theme ─────────────────

describe('surface language', () => {
  test('ONE surface owns the page, and with a light preference it is the bright canvas', async () => {
    const { container } = renderLanding();
    await screen.findByRole('heading', { level: 1 });

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('surface-lumen');
    expect(root.className).not.toContain('surface-nocturne');
    expect(root.className).not.toContain('surface-obsidian');
    expect(root.style.colorScheme).toBe('light');

    // Sections are told apart by the band, never by re-declaring a surface:
    // a nested surface is how a page ends up dark, light, dark as you scroll.
    for (const section of Array.from(document.querySelectorAll('section'))) {
      expect(section.className).not.toMatch(/surface-(lumen|nocturne|obsidian|editorial|studio)/);
    }
    expect(root.querySelectorAll('[class*="surface-"]')).toHaveLength(0);
  });

  test('the public page follows the visitor: an OS preference for dark gets the dark surface', async () => {
    // Owner decision 2026-11-11: the resolved theme (system preference, or an
    // explicit choice) decides.
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

      expect(root.className).toContain('surface-nocturne');
      expect(root.className).toContain('dark');
      expect(root.className).not.toContain('surface-lumen');
      expect(root.style.colorScheme).toBe('dark');
      // And the tour sits inside that dark surface, so its tokens resolve dark.
      const tour = document.querySelector('[data-product-tour]') as HTMLElement;
      expect(tour.closest('.surface-nocturne')).not.toBeNull();
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: real,
      });
    }
  });

  test('the product scenes follow the theme instead of pinning themselves light or dark', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

    // Nothing in a scene may be drawn with a literal white or black - that is
    // how an illustration stops inverting with the page around it.
    for (const root of [hero(), byId('noise'), byId('features'), byId('sponsorship')]) {
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

    // The shared three-state control cycles light, dark, system. Every run
    // starts at "system" (localStorage is cleared), so the first press lands
    // on the EXPLICIT light choice and the second reaches dark.
    await user.click(screen.getByRole('button', { name: /theme: system/i }));
    expect(root.className).toContain('surface-lumen');

    await user.click(screen.getByRole('button', { name: /theme: light/i }));

    expect(screen.getByRole('button', { name: /theme: dark/i })).toBeInTheDocument();
    expect(root.className).toContain('surface-nocturne');
    expect(root.className).toContain('dark');
    expect(root.className).not.toContain('surface-lumen');
    expect(root.style.colorScheme).toBe('dark');
  });
});

// ── 8. Copy rule ─────────────────────────────────────────────────

describe('copy rules', () => {
  test('no user-visible string uses a long dash, curly quote or accented letter', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

    const text = document.body.textContent ?? '';
    // Escapes, not literals: written literally this character class is itself
    // a target of scripts/ascii-copy-sweep.mjs.
    expect(text).not.toMatch(/[–—‘’“”…]/);
    expect(text).not.toMatch(/[À-ɏ]/);
  });
});

// ── 9. Layout safety ─────────────────────────────────────────────

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

// ── 10. The public IA ────────────────────────────────────────────

describe('public IA', () => {
  test('the sections render in the order the argument is made', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });

    const ids = [
      'try',
      // The problem comes straight after the promise.
      'noise',
      // Then the first buyer's deciding question, before the feature detail.
      'sponsorship',
      'features',
      'pricing',
      'before-you-begin',
      // The roadmap sits AFTER everything that ships and after the price, so
      // nothing unshipped stands between a ready buyer and the offer.
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
    expect(h1s[0]).toHaveTextContent('Wake up to jobs worth applying to.');
    expect(hero().contains(h1s[0])).toBe(true);
  });

  test('every marketing section is labelled by its own heading', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });
    for (const id of [
      'noise',
      'features',
      'sponsorship',
      'coming-next',
      'pricing',
      'before-you-begin',
    ]) {
      const section = byId(id);
      const labelledBy = section.getAttribute('aria-labelledby');
      expect(labelledBy, `#${id} has no aria-labelledby`).toBeTruthy();
      expect(document.getElementById(labelledBy as string)).toBeTruthy();
    }
  });

  test('every header link that is an anchor points at a section that exists', () => {
    renderLanding();
    const banner = screen.getByRole('banner');
    const anchors = within(banner)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('#'));
    expect(anchors.length).toBeGreaterThan(0);
    for (const href of anchors) {
      expect(document.getElementById(href.slice(1)), `${href} has no target`).toBeTruthy();
    }
  });
});

// ── 11a. The problem: a wall of listings, cleared ────────────────

describe('the problem', () => {
  const section = () => byId('noise');

  test('it names the reasons listings are cleared, and the counts add up', () => {
    renderLanding();
    expect(
      within(section()).getByRole('heading', { name: /Most listings are not worth your evening\./ }),
    ).toBeInTheDocument();

    const reasons = within(section()).getAllByRole('listitem');
    expect(reasons.map((li) => li.textContent?.replace(/\d+$/, '').trim())).toEqual([
      'Reposts',
      'Over a month old',
      'Wrong level',
      'No sponsorship',
    ]);
    // 24 in, 5 left: the picture and the numbers cannot disagree.
    const cleared = reasons.reduce((n, li) => n + Number(li.textContent?.match(/\d+$/)?.[0]), 0);
    expect(section().textContent).toMatch(/24\s*listings/);
    expect(24 - cleared).toBe(SAMPLE_ROLES.length);
  });

  test('the button really runs it: the wall clears down to the sample roles', async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(within(section()).getByRole('button', { name: /Clear the noise/i }));
    expect(
      await within(section()).findByText(/worth applying to/i, {}, { timeout: 6000 }),
    ).toBeInTheDocument();
    expect(within(section()).getByRole('button', { name: /Bring the wall back/i })).toBeInTheDocument();
  });

  test('with motion off it opens already cleared, and the button still swaps the two states', async () => {
    setReducedMotion(true);
    const user = userEvent.setup();
    renderLanding();
    expect(section().textContent).toMatch(/5\s*worth applying to/);
    await user.click(within(section()).getByRole('button', { name: /Bring the wall back/i }));
    expect(section().textContent).toMatch(/24\s*listings/);
    await user.click(within(section()).getByRole('button', { name: /Clear the noise/i }));
    expect(section().textContent).toMatch(/5\s*worth applying to/);
  });

  test('the wall is a picture: nothing in it is exposed or operable', () => {
    renderLanding();
    const wall = section().querySelector('[aria-hidden="true"].relative') as HTMLElement;
    expect(wall).toBeTruthy();
    expect(wall.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
  });
});

// ── 11b. Features: a deck of five cards to handle ────────────────

describe('features', () => {
  const section = () => byId('features');
  const tabs = () => within(within(section()).getByRole('tablist', { name: /^Features$/ })).getAllByRole('tab');
  const card = () => within(section()).getByRole('tabpanel');
  const open = async (user: ReturnType<typeof userEvent.setup>, title: RegExp) => {
    const tab = tabs().find((t) => title.test(t.textContent ?? '')) as HTMLElement;
    await user.click(tab);
  };

  test('five features, as real tabs with one tab stop, in order', async () => {
    const user = userEvent.setup();
    renderLanding();
    const titles = [
      'It will not stretch the truth.',
      'One role, once.',
      'Practice on your own roles.',
      'See what keeps coming up.',
      'Your contact details stay with you.',
    ];
    expect(tabs()).toHaveLength(titles.length);
    tabs().forEach((t, i) => expect(t.textContent).toContain(titles[i]));
    expect(tabs().filter((t) => t.getAttribute('tabindex') === '0')).toHaveLength(1);

    tabs()[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(tabs()[1]).toHaveAttribute('aria-selected', 'true');
    expect(card()).toHaveAttribute('aria-labelledby', tabs()[1].id);

    // The load-bearing sentence, in the wording the trust pages use.
    await user.click(tabs()[0]);
    expect(section().textContent).toMatch(/Tailoring moves emphasis, never facts\./);
    // And it still claims nothing about outcomes.
    expect(section().textContent).not.toMatch(/hired|guarantee|success rate|faster than/i);
  });

  test('only the front card is exposed; the cards behind it are a picture of depth', () => {
    renderLanding();
    const all = Array.from(section().querySelectorAll<HTMLElement>('[data-feature-card]'));
    expect(all).toHaveLength(5);
    const behind = all.filter((c) => c.getAttribute('aria-hidden') === 'true');
    expect(behind).toHaveLength(4);
    for (const c of behind) expect(c.querySelectorAll('button, [role="slider"], [role="switch"]')).toHaveLength(0);
  });

  test('the arrows turn the deck in both directions and wrap', async () => {
    const user = userEvent.setup();
    renderLanding();
    await user.click(within(section()).getByRole('button', { name: /Previous feature/i }));
    expect(tabs()[4]).toHaveAttribute('aria-selected', 'true');
    await user.click(within(section()).getByRole('button', { name: /Next feature/i }));
    expect(tabs()[0]).toHaveAttribute('aria-selected', 'true');
  });

  test('the guard: a pushed title is shown, then held back to what the resume says', async () => {
    const user = userEvent.setup();
    renderLanding();
    const sheet = () => card().querySelector('[data-guard-sheet]') as HTMLElement;

    await user.click(within(card()).getByRole('button', { name: /Promote the title/i }));
    expect(sheet().textContent).toContain('Senior Analyst');
    expect(await within(card()).findByText(/Held back\./, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(sheet().textContent).toContain('Analyst Intern');
    expect(sheet().textContent).not.toContain('Senior Analyst');
  });

  test('the guard: the number is a real slider, and letting go returns it to the resume', () => {
    renderLanding();
    const slider = within(card()).getByRole('slider', { name: /Team size on the resume/i });
    expect(slider).toHaveAttribute('aria-valuenow', '12');
    expect(slider).toHaveAttribute('aria-valuemin', '12');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '20');
    expect(card().querySelector('[data-guard-sheet]')?.textContent).toContain('a team of 20');

    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '12');
    expect(card().querySelector('[data-guard-sheet]')?.textContent).toContain('a team of 12');
    expect(within(card()).getByText(/Held back\./)).toBeInTheDocument();
  });

  test('reposts fold into the employer listing, and can be shown again', async () => {
    const user = userEvent.setup();
    renderLanding();
    await open(user, /One role, once/);

    const fold = within(card()).getByRole('button', { name: /Fold the reposts/i });
    expect(fold).toHaveAttribute('aria-pressed', 'false');
    expect(within(card()).getAllByText(/Job board repost/)).toHaveLength(2);
    await user.click(fold);
    expect(within(card()).getByRole('button', { name: /Show the reposts/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(card().textContent).toMatch(/2 reposts folded into the original/);
    expect(card().textContent).toMatch(/Employer's careers page/);
  });

  test('an interview card turns over to show what it was built from', async () => {
    const user = userEvent.setup();
    renderLanding();
    await open(user, /Practice on your own roles/);

    const flip = within(card()).getByRole('button', { name: /what this question was built from/i });
    expect(flip).toHaveAttribute('aria-pressed', 'false');
    await user.click(flip);
    expect(within(card()).getByRole('button', { name: /Show the question/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The back quotes a line that is really in the sample resume.
    const lines = RESUME_LINES.map((l) =>
      l.text.map((seg) => (typeof seg === 'string' ? seg : seg.mark)).join(''),
    );
    expect(lines.some((line) => card().textContent?.includes(line))).toBe(true);
  });

  test('the skill gaps are counted from the sample roles, not typed', async () => {
    const user = userEvent.setup();
    renderLanding();
    await open(user, /See what keeps coming up/);
    const counts = new Map<string, number>();
    for (const role of SAMPLE_ROLES) {
      for (const ask of role.asks) if (!ask.met) counts.set(ask.label, (counts.get(ask.label) ?? 0) + 1);
    }
    const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const bar = within(card()).getByRole('button', { name: new RegExp(top) });
    expect(bar.textContent).toContain(`${n} of ${SAMPLE_ROLES.length} roles`);
  });

  test('the privacy card is a real switch between the resume and what the model is sent', async () => {
    const user = userEvent.setup();
    renderLanding();
    await open(user, /Your contact details stay with you/);
    const sw = within(card()).getByRole('switch', { name: /What the AI model is sent/i });
    const face = (name: string) => card().querySelector(`[data-face="${name}"]`) as HTMLElement;

    // Motion on and nothing scrolled: it arrives showing the resume.
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(face('sent')).toHaveAttribute('aria-hidden', 'true');
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(face('resume')).toHaveAttribute('aria-hidden', 'true');
    expect(face('sent')).toHaveAttribute('aria-hidden', 'false');
    // Three contact details masked; the work itself is never masked.
    expect(within(face('sent')).getAllByText('masked')).toHaveLength(3);
    expect(face('sent').textContent).toMatch(/Wrote SQL queries/);
    expect(face('sent').textContent).not.toMatch(/you@example\.com/);
  });
});

// ── 12. Sponsorship ──────────────────────────────────────────────

describe('sponsorship', () => {
  const section = () => byId('sponsorship');
  const order = () =>
    within(section())
      .getAllByRole('listitem')
      .map((li) => SAMPLE_ROLES.find((r) => li.textContent?.includes(r.company))?.id);

  test("it names the evidence, in the product's own chip wording", () => {
    renderLanding();
    const text = section().textContent ?? '';
    for (const chip of [
      'Sponsors H-1B',
      'Posting says no sponsorship',
      'E-Verify',
      'Accepts CPT',
      'No citizenship req',
      'Clearance required',
    ]) {
      expect(text).toContain(chip);
    }
    expect(text).toMatch(/public H-1B filings and the posting's own words/i);
  });

  test('one switch re-sorts the same roles: evidence first, a refusal last', async () => {
    const user = userEvent.setup();
    renderLanding();
    const sw = within(section()).getByRole('switch', { name: /I need sponsorship/i });

    // Off: by fit alone.
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(order()).toEqual([...SAMPLE_ROLES].sort((a, b) => b.score - a.score).map((r) => r.id));
    expect(section().textContent).toMatch(/Sponsorship off\./);

    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(section().textContent).toMatch(/Sponsorship on\./);
    const sorted = order();
    const kinds = sorted.map((id) => SAMPLE_ROLES.find((r) => r.id === id)?.visa.kind);
    expect(kinds[0]).toBe('sponsors');
    expect(kinds[kinds.length - 1]).toBe('refuses');
    // Nothing is removed: a refusal is flagged, not hidden.
    expect([...sorted].sort()).toEqual(SAMPLE_ROLES.map((r) => r.id).sort());
  });

  test('it reports evidence and never predicts a chance', () => {
    renderLanding();
    const text = section().textContent ?? '';
    // `lib/sponsorshipSignal.ts` drops every score and band for this reason.
    expect(text).toMatch(/Evidence, not odds\./);
    expect(text).toMatch(/It never predicts your chances\./);
    expect(text).not.toMatch(/\d+\s*%|likely to|likelihood|probab/i);
  });

  test('it does not shut out a reader with no visa need', () => {
    renderLanding();
    // Matches the product: the work-authorization question is optional and
    // nothing is filtered while it is blank.
    expect(section().textContent).toMatch(/No visa need\? Leave it off and nothing is filtered\./);
  });
});

// ── 14. Pricing ──────────────────────────────────────────────────

describe('pricing on the public page', () => {
  const section = () => byId('pricing');

  test('the home page shows the one plan a visitor can take, named from the contract', () => {
    renderLanding();
    const names = within(section())
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual([PLAN_LABEL.free]);
    // The paid tiers are one sentence, still named from the contract and
    // still in its order, and the full comparison is one link away.
    const paid = PLAN_ORDER.filter((id) => id !== 'free').map((id) => PLAN_LABEL[id]);
    expect(section().textContent).toContain(`${paid.join(' and ')} are not on sale yet.`);
    expect(
      within(section()).getByRole('link', { name: /See what each plan includes/i }),
    ).toHaveAttribute('href', '/pricing');
  });

  test('no price, currency symbol or per-month string renders anywhere on the page', async () => {
    renderLanding();
    await screen.findByRole('heading', { level: 1 });
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/[$€£₹]/);
    expect(text).not.toMatch(/\b\d+\.\d{2}\b/);
    expect(text).not.toMatch(/\/\s*mo\b/i);
  });

  test('the only pricing CTA is account creation, and nothing pretends to sell a paid tier', () => {
    renderLanding();
    const ctas = within(section())
      .getAllByRole('link')
      .filter((a) => /create free account/i.test(a.textContent ?? ''));
    expect(ctas).toHaveLength(1);
    expect(ctas[0]).toHaveAttribute('href', '/register');
    // A disabled "coming soon" button is exactly what the roadmap section
    // refuses to ship, so pricing may not grow one either.
    expect(section().querySelectorAll('button, input')).toHaveLength(0);
  });

  test('a limit on a capability that is not live carries that capability status', () => {
    renderLanding();
    // "Assisted applications 25 a month" read as something you could use
    // today while the roadmap called Auto Apply unfinished. The limit renders
    // the registry status of the capability it meters.
    const lines = Array.from(section().querySelectorAll('li')).filter((li) =>
      /assisted applications/i.test(li.textContent ?? ''),
    );
    expect(lines).toHaveLength(1);
    if (isLive(AUTO_APPLY.status)) {
      expect(lines[0].textContent).not.toContain(STATUS_LABEL['coming-soon']);
    } else {
      expect(lines[0].textContent).toContain(STATUS_LABEL[AUTO_APPLY.status]);
    }
  });
});

// ── 15. Before you begin (the FAQ) ───────────────────────────────

describe('fair questions', () => {
  const section = () => byId('before-you-begin');

  test('there is one questions section, not two saying the same thing', () => {
    renderLanding();
    expect(document.getElementById('trust')).toBeNull();
    expect(document.getElementById('faq')).toBeNull();
    expect(document.querySelectorAll('a[href="#trust"], a[href="#faq"]')).toHaveLength(0);
  });

  test('the home page asks six real objections, and the full set is one link away', () => {
    renderLanding();
    expect(within(section()).getByRole('heading', { name: /Fair questions\./i })).toBeInTheDocument();

    const questions = Array.from(section().querySelectorAll('summary')).map((el) =>
      (el.querySelector('h4')?.childNodes[0].textContent ?? '').trim(),
    );
    expect(questions).toEqual([
      'Can I start for free?',
      'Where does the sponsorship data come from?',
      'I am not a student. Is this for me?',
      'How is this different from a job board?',
      'Will Aspirely apply without my permission?',
      'What happens to my resume and data?',
    ]);
    // ALL CLOSED on arrival.
    expect(section().querySelectorAll('details[open]')).toHaveLength(0);
    expect(
      within(section()).getByRole('link', { name: /Every question, and how your data is handled/i }),
    ).toHaveAttribute('href', '/trust');
  });

  test('one primary action, a quiet sign-in, and the legal detail linked rather than restated', () => {
    renderLanding();
    const ctas = within(section())
      .getAllByRole('link')
      .filter((a) => /^create free account$/i.test(a.textContent ?? ''));
    expect(ctas).toHaveLength(1);
    expect(ctas[0]).toHaveAttribute('href', '/register');
    expect(within(section()).getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(within(section()).getByRole('link', { name: /privacy policy/i })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(within(section()).getByRole('link', { name: /^terms$/i })).toHaveAttribute(
      'href',
      '/terms',
    );
  });

  test('the load-bearing answers are intact', async () => {
    const user = userEvent.setup();
    renderLanding();
    const text = section().textContent ?? '';

    // The automation answer is the one a nervous visitor is actually here for,
    // and it carries the registry's status rather than a hand-typed one.
    expect(text).toMatch(/no setting at all until you choose one/i);
    expect(within(section()).getByText(STATUS_LABEL[AUTO_APPLY.status])).toBeInTheDocument();
    // Sponsorship: where the data comes from, and what it is not.
    expect(text).toMatch(/public H-1B filing records/);
    expect(text).toMatch(/It never predicts your chances\./);
    // Nobody is shut out for not being a student or not needing a visa.
    expect(text).toMatch(/in any field and at any level/);
    expect(text).toMatch(/leave that question blank and nothing is filtered/);

    // Opening one is a real disclosure, not a link somewhere else.
    const summary = within(section()).getByRole('heading', {
      name: /Can I start for free\?/i,
    }).parentElement as HTMLElement;
    await user.click(summary);
    expect((summary.closest('details') as HTMLDetailsElement).open).toBe(true);
  });
});

// ── 16. The hero ─────────────────────────────────────────────────

describe('hero composition', () => {
  test('the headline is the promise, and it is the only h1', () => {
    renderLanding();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Wake up to jobs worth applying to.');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  test('the supporting line says what the page as a whole has to prove', () => {
    renderLanding();
    const text = hero().textContent ?? '';
    // The three things no competing homepage leads with: where the jobs come
    // from, the visa evidence, and that tailoring invents nothing.
    expect(text).toMatch(/employers' own career pages/);
    expect(text).toMatch(/visa sponsorship evidence/);
    expect(text).toMatch(/without inventing a thing/);
  });

  test('the two hero actions are Create free account and Find my matches, and both are real', async () => {
    const user = userEvent.setup();
    renderLanding();

    const account = within(hero()).getByRole('link', { name: /^Create free account$/i });
    expect(account).toHaveAttribute('href', '/register');

    // The second action must START something, not scroll somewhere.
    const matches = within(hero()).getByRole('button', { name: /^Find my matches$/i });
    const input = (await screen.findByLabelText(/^Resume file/)) as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    await user.click(matches);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    expect(within(hero()).queryByText(/see how it works/i)).toBeNull();
  });

  test('the first thing the hero says is who it is for, without shutting anyone out', () => {
    renderLanding();
    const text = hero().textContent ?? '';
    expect(text).toMatch(/Built for the F-1 and OPT job search\./);
    expect(text).toMatch(/Works the same with no visa need\./);
    // And it comes before the headline, not after it.
    const h1 = screen.getByRole('heading', { level: 1 });
    const who = within(hero()).getByText(/Built for the F-1 and OPT job search\./);
    expect(who.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('the hero carries ONE trust line, and it sells the no-account upload', () => {
    renderLanding();
    expect(hero().textContent).toMatch(/Free to start\.\s*No account needed to see your matches\./);
    // One line, not a stack: the older reassurances are gone.
    expect(within(hero()).queryByText(/Nothing is submitted without your approval/i)).toBeNull();
    expect(within(hero()).queryByText(/Private upload/i)).toBeNull();
  });

  test('sign-in lives in the header, and the hero does not repeat it', () => {
    renderLanding();
    expect(within(hero()).queryByRole('link', { name: /^Sign in$/i })).toBeNull();
    expect(
      within(screen.getByRole('banner')).getByRole('link', { name: /^Sign in$/i }),
    ).toHaveAttribute('href', '/login');
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
    expect(within(banner).getByRole('link', { name: /^Features$/i })).not.toHaveAttribute(
      'aria-current',
    );
    expect(within(banner).getByRole('link', { name: /^FAQ$/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  test('on /trust, FAQ is marked current', () => {
    renderNav('/trust');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: /^FAQ$/i })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(banner).getByRole('link', { name: /^Pricing$/i })).not.toHaveAttribute(
      'aria-current',
    );
  });

  test('off the home page the section links go to the home page, not to a missing anchor', () => {
    renderNav('/pricing');
    const banner = screen.getByRole('banner');
    expect(within(banner).getByRole('link', { name: /^Features$/i })).toHaveAttribute(
      'href',
      '/#features',
    );
    expect(within(banner).getByRole('link', { name: /^Sponsorship$/i })).toHaveAttribute(
      'href',
      '/#sponsorship',
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
    expect(screen.queryByRole('button', { name: /try it with my resume/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /drop your resume/i })).toBeNull();
    expect(screen.queryByText(/already have an account/i)).toBeNull();
    // With no guest flow there is no file input to open either.
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(0);
  });

  test('the bar and the hero each carry one workspace action, not a stack of them', () => {
    renderLanding();
    const banner = screen.getByRole('banner');

    const navCta = within(banner).getByRole('link', { name: /^Open my workspace$/i });
    expect(navCta).toHaveAttribute('href', '/app/home');
    expect(within(banner).queryByRole('link', { name: /^Sign in$/i })).toBeNull();
    expect(within(banner).queryByRole('link', { name: /create free account/i })).toBeNull();

    const heroCtas = within(hero()).getAllByRole('link', { name: /^Open my workspace$/i });
    expect(heroCtas).toHaveLength(1);
    expect(heroCtas[0]).toHaveAttribute('href', '/app/home');
    expect(within(hero()).queryByText(/you're signed in/i)).toBeInTheDocument();
  });

  test('sponsorship, pricing, the FAQ, the close and the footer all continue the workspace, not signup', () => {
    renderLanding();

    for (const id of ['sponsorship', 'pricing', 'before-you-begin', 'get-started']) {
      const section = byId(id);
      expect(
        within(section).getByRole('link', { name: /^Open my workspace$/i }),
        `#${id}`,
      ).toHaveAttribute('href', '/app/home');
      expect(within(section).queryByRole('link', { name: /create free account/i })).toBeNull();
      expect(within(section).queryByRole('link', { name: /sign in/i })).toBeNull();
    }

    expect(
      within(byId('get-started')).getByRole('heading', { name: /your workspace is waiting/i }),
    ).toBeInTheDocument();

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: /^Workspace$/i })).toHaveAttribute(
      'href',
      '/app/home',
    );
    expect(within(footer).queryByRole('link', { name: /^Sign in$/i })).toBeNull();
  });
});
