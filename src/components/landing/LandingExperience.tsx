import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestOnboardingEnabled, markGuestOnboardingUnavailable } from '@/lib/guest';
import { useGuestFlow } from '@/hooks/useGuestFlow';
import { LandingNav } from './LandingNav';
import { AtlasHero } from './AtlasHero';
import { StoryPath } from './StoryPath';
import { CareerOrbit } from './CareerOrbit';
import { TrustClose } from './TrustClose';
import { LandingFooter } from './LandingFooter';

/**
 * Aspirely's public landing — the Career Signal Atlas. Three movements on one
 * deep-ink canvas, conversion first, honest everywhere:
 *
 *   1 Floating glass nav (the only blur on the page)
 *   2 Full-viewport hero: the living atlas with the REAL upload control
 *     seated in its resume sheet; the real upload → parse → profile → up to
 *     5 matches → one tailored resume flow runs right here on `/`
 *   3 READ → MATCH → TAILOR as one drawn signal path (#how)
 *   4 Career operating system orbit (#workspace) — code-native, no shots
 *   5 Compact trust + final action (#trust) + footer
 *
 * ONE useGuestFlow controller lives here (never a second on another route —
 * /start redirects back to /#try). The moment the flow leaves the idle hero,
 * the marketing sections collapse so the guest never scrolls through
 * marketing while waiting; nav and footer stay for recovery.
 *
 * The page is PINNED to the dark token set in both app themes — landing and
 * auth now share one deep-ink night world (one brand, not two). No landing
 * component uses `dark:` variants; the `.dark` class re-points the semantic
 * tokens for the whole subtree.
 */
export default function LandingExperience() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [runtimeDisabled, setRuntimeDisabled] = useState(() => !isGuestOnboardingEnabled());

  const onUnavailable = useCallback(() => {
    // Backend says the feature is off (503) or the edge route isn't live
    // (404) — fall back to the account-first hero for this session.
    markGuestOnboardingUnavailable();
    setRuntimeDisabled(true);
  }, []);

  const guestEnabled = !authLoading && !isAuthenticated && !runtimeDisabled;
  const flow = useGuestFlow({ enabled: guestEnabled, onUnavailable });
  const flowActive = guestEnabled && flow.step !== 'hero';

  return (
    <div
      className="dark min-h-screen overflow-x-clip bg-background text-foreground"
      style={{ colorScheme: 'dark' }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-panel"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        <AtlasHero
          flow={flow}
          guestEnabled={guestEnabled}
          authed={!authLoading && isAuthenticated}
          flowActive={flowActive}
        />
        {/* Once real work starts, the workspace owns the page — no marketing
            between the guest and their results. */}
        {!flowActive && (
          <>
            <StoryPath />
            <CareerOrbit />
            <TrustClose />
          </>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
