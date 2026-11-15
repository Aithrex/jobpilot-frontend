import { lazy, Suspense, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestOnboardingEnabled, markGuestOnboardingUnavailable } from '@/lib/guest';
import { useGuestFlow } from '@/hooks/useGuestFlow';
import { useResumePicker } from '@/components/guest/useResumePicker';
import { usePublicSurface } from './_shared';
import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { Noise } from './Noise';
import { Features } from './Features';
import { Sponsorship } from './Sponsorship';
import { ComingNext } from './ComingNext';
import { PricingSection } from './PricingSection';
import { BeforeYouBegin } from './BeforeYouBegin';
import { TrustClose } from './TrustClose';
import { LandingFooter } from './LandingFooter';

/**
 * Development only: a palette picker for comparing accents on the real page.
 * `import.meta.env.DEV` is a build-time constant, so in a production build
 * this whole branch, and the chunk behind it, is removed.
 */
const PaletteLab =
  import.meta.env.DEV && import.meta.env.MODE !== 'test'
    ? lazy(() => import('./dev/PaletteLab'))
    : null;

/**
 * Aspirely's public home page. A sales page with one argument, made in the
 * order a reader needs it:
 *
 *  1 Hero (#try): who it is for, the promise, two real actions, and a
 *    four-step product tour that opens on the outcome (the matches). The
 *    real upload, parse, profile, up to 5 matches, one tailored resume flow
 *    runs right here on `/`.
 *  2 The problem (#noise): a wall of listings cleared down to the few worth
 *    an evening, one reason at a time.
 *  3 Sponsorship (#sponsorship): one switch that re-sorts the sample roles
 *    by visa evidence. The page's one dark chapter.
 *  4 Features (#features): a deck of five cards to handle.
 *  5 The offer (#pricing): the free plan, and one sentence about the rest.
 *  6 Fair questions (#before-you-begin): six real objections.
 *  7 Coming next (#coming-next): the roadmap, slim, labelled as not
 *    available.
 *  8 The close (#get-started).
 *
 * The order is a sales order (problem, the deciding objection, product,
 * price, objections, close), reviewed from a buyer's seat on 2026-11-15.
 *
 * SHOW, DO NOT TELL. The page is deliberately light on prose: a section gets
 * a heading and at most a sentence, and the product scene does the rest.
 *
 * ONE useGuestFlow controller AND the page's ONE resume picker live here. Every
 * upload trigger on the page (the hero button, the drop surface under the
 * tour, the closing button) calls the same `picker.open`, so any of them
 * opens the same OS file dialog on that click. None of them scrolls to a
 * second uploader, and the header carries none.
 *
 * There is never a second useGuestFlow on another route (/start redirects back
 * to /#try). The moment the flow leaves the idle hero, the marketing sections
 * collapse so the guest never scrolls through marketing while waiting; nav and
 * footer stay for recovery.
 *
 * SURFACE. ONE named surface owns the whole page, chosen by the visitor's
 * theme: `.surface-lumen` (light) or `.surface-nocturne` (dark). Each
 * re-points the entire semantic layer for its subtree, so every child resolves
 * `bg-card`, `text-muted-foreground` and `border-border` correctly without one
 * `dark:` variant. Sections are told apart by the tinted band and, once, the
 * brand band; neither re-declares a surface. `dark` rides along on the root in
 * the dark theme so shared primitives that DO ship `dark:` variants keep
 * behaving.
 */
export default function LandingExperience() {
  const surface = usePublicSurface();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [runtimeDisabled, setRuntimeDisabled] = useState(() => !isGuestOnboardingEnabled());

  const onUnavailable = useCallback(() => {
    // Backend says the feature is off (503) or the edge route isn't live
    // (404) - fall back to the account-first hero for this session.
    markGuestOnboardingUnavailable();
    setRuntimeDisabled(true);
  }, []);

  const guestEnabled = !authLoading && !isAuthenticated && !runtimeDisabled;
  const authed = !authLoading && isAuthenticated;
  const flow = useGuestFlow({ enabled: guestEnabled, onUnavailable });
  const flowActive = guestEnabled && flow.step !== 'hero';

  // The page's ONE resume picker. Its input is rendered once, below.
  const picker = useResumePicker({
    onFile: (file) => void flow.startUpload(file),
    disabled: !guestEnabled,
  });

  // A CTA may only open a file dialog when there is genuinely something to
  // upload into. Otherwise it becomes a link that says what it does.
  const onUpload = guestEnabled ? picker.open : undefined;
  const fallbackHref = authed ? '/app/home' : '/register';
  const fallbackLabel = authed ? 'Open my workspace' : 'Create free account';

  return (
    <div
      className={cn('min-h-screen overflow-x-clip', surface.className)}
      style={{ colorScheme: surface.colorScheme }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-panel"
      >
        Skip to content
      </a>
      {/* The page's single resume file input. The accessible name deliberately
          uses unaccented "Resume file:" - it matches the long-standing label
          contract the guest-flow tests assert on, and reads correctly in every
          screen reader. Absent entirely when guest upload is unavailable: an
          upload trigger that cannot upload is worse than no trigger. */}
      {guestEnabled && (
        <input
          {...picker.inputProps}
          aria-hidden={undefined}
          aria-label="Resume file: PDF or DOCX, up to 5 MB"
        />
      )}

      <LandingNav />
      <main id="main">
        <Hero
          flow={flow}
          guestEnabled={guestEnabled}
          authed={authed}
          flowActive={flowActive}
          picker={picker}
        />
        {/* Once real work starts, the workspace owns the page - no marketing
            between the guest and their results, and no roadmap content while
            they are waiting on something real. */}
        {!flowActive && (
          <>
            <Noise />
            {/* Sponsorship is second, not fifth: it is the first buyer's
                deciding question and the strongest thing the page shows. */}
            <Sponsorship onUpload={onUpload} />
            <Features />
            <PricingSection variant="summary" />
            <BeforeYouBegin variant="short" />
            {/* The roadmap sits AFTER everything that ships and after the
                price, so nothing unshipped stands between a ready buyer and
                the offer. */}
            <ComingNext />
            <TrustClose
              onUpload={onUpload}
              fallbackHref={fallbackHref}
              fallbackLabel={fallbackLabel}
            />
          </>
        )}
      </main>
      <LandingFooter />
      {PaletteLab && (
        <Suspense fallback={null}>
          <PaletteLab />
        </Suspense>
      )}
    </div>
  );
}
