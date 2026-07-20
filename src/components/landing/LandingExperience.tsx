import { useCallback, useState, type CSSProperties } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestOnboardingEnabled, markGuestOnboardingUnavailable } from '@/lib/guest';
import { useGuestFlow } from '@/hooks/useGuestFlow';
import { LandingNav } from './LandingNav';
import { HeroWorkspace } from './HeroWorkspace';
import { HowItWorksStory } from './HowItWorksStory';
import { EcosystemPreview } from './EcosystemPreview';
import { TrustBand } from './TrustBand';
import { FinalCta } from './FinalCta';
import { LandingFooter } from './LandingFooter';

/**
 * Aspirely's public landing (v8): the product IS the page. Four sections,
 * conversion first, honest everywhere:
 *
 *   1 Floating glass nav (the only blur on the page)
 *   2 Hero + LIVE guest workspace (#try): the real upload control plus an
 *     interactive fictional preview; the real upload → parse → profile →
 *     up to 5 matches → one tailored resume flow runs right here on `/`
 *   3 How it works (#how): Upload -> Match -> Tailor as one short animated
 *     pipeline
 *   4 Workspace (#workspace): the five-tab ecosystem preview (real shots +
 *     live micro-demos, fictional data)
 *   5 Trust band (#trust) + final CTA + compact footer
 *
 * ONE useGuestFlow controller lives here (never a second on another route —
 * /start redirects back to /#try). The moment the flow leaves the idle hero,
 * the marketing sections below collapse so the guest never scrolls through
 * marketing while waiting; nav and footer stay for recovery.
 */

/**
 * The landing's LIGHT surface — one deliberate professional look in BOTH app
 * themes. The theme provider puts `dark`/`light` on <html>, so when an app
 * user prefers dark, the `.dark` custom properties would cascade into this
 * subtree. These inline overrides pin every semantic token back to its light
 * value (via the theme-independent primitives in src/index.css), locking the
 * landing to light. No landing component uses `dark:` Tailwind variants, so
 * pinning the tokens is sufficient.
 */
export const LIGHT_SURFACE = {
  '--background': 'var(--slate-50-hsl)',
  '--foreground': 'var(--slate-900-hsl)',
  '--card': 'var(--slate-0-hsl)',
  '--card-foreground': 'var(--slate-900-hsl)',
  '--popover': 'var(--slate-0-hsl)',
  '--popover-foreground': 'var(--slate-900-hsl)',
  '--primary': 'var(--indigo-primary-hsl)',
  '--primary-foreground': 'var(--slate-0-hsl)',
  '--secondary': 'var(--slate-100-hsl)',
  '--secondary-foreground': 'var(--slate-700-hsl)',
  '--muted': 'var(--slate-100-hsl)',
  // slate-600, not 500: 500 lands at 4.48:1 on slate-50 surfaces, a hair
  // under WCAG AA's 4.5:1 for the landing's body copy sizes.
  '--muted-foreground': 'var(--slate-600-hsl)',
  '--accent': 'var(--slate-100-hsl)',
  '--accent-foreground': 'var(--slate-700-hsl)',
  '--destructive': 'var(--danger-600-hsl)',
  '--destructive-foreground': 'var(--slate-0-hsl)',
  '--success': 'var(--success-600-hsl)',
  '--success-foreground': 'var(--slate-0-hsl)',
  '--warning': 'var(--warning-600-hsl)',
  '--warning-foreground': 'var(--slate-0-hsl)',
  '--info': 'var(--info-600-hsl)',
  '--info-foreground': 'var(--slate-0-hsl)',
  '--border': 'var(--slate-200-hsl)',
  '--input': 'var(--slate-300-hsl)',
  '--ring': 'var(--indigo-primary-hsl)',
  '--brand-from': 'var(--indigo-600-hsl)',
  '--brand-to': '199 89% 48%',
  '--shadow-soft': '0 1px 2px hsl(222 47% 11% / 0.05), 0 1px 3px hsl(222 47% 11% / 0.05)',
  '--shadow-panel': '0 1px 2px hsl(222 47% 11% / 0.04), 0 6px 16px -4px hsl(222 47% 11% / 0.10)',
  '--shadow-pop': '0 4px 12px -2px hsl(222 47% 11% / 0.08), 0 16px 32px -8px hsl(222 47% 11% / 0.12)',
  '--shadow-float': '0 8px 24px -6px hsl(222 47% 11% / 0.14), 0 28px 56px -12px hsl(222 47% 11% / 0.16)',
} as CSSProperties;

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
    <div className="min-h-screen overflow-x-clip bg-background text-foreground" style={LIGHT_SURFACE}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-panel"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        <HeroWorkspace
          flow={flow}
          guestEnabled={guestEnabled}
          authed={!authLoading && isAuthenticated}
          flowActive={flowActive}
        />
        {/* Once real work starts, the workspace owns the page — no marketing
            between the guest and their results. */}
        {!flowActive && (
          <>
            <HowItWorksStory />
            <EcosystemPreview />
            <TrustBand />
            <FinalCta />
          </>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
