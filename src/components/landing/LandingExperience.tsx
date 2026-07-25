import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isGuestOnboardingEnabled, markGuestOnboardingUnavailable } from '@/lib/guest';
import { useGuestFlow } from '@/hooks/useGuestFlow';
import { useResumePicker } from '@/components/guest/useResumePicker';
import { LandingNav } from './LandingNav';
import { WorkspaceHero } from './WorkspaceHero';
import { SignalPath } from './SignalPath';
import { ProofStrip } from './ProofStrip';
import { ComingNext } from './ComingNext';
import { TrustClose } from './TrustClose';
import { LandingFooter } from './LandingFooter';

/**
 * Aspirely's public landing - the Career Signal Atlas. Three movements on one
 * deep-ink canvas, conversion first, honest everywhere:
 *
 *  1 Floating glass nav (the only blur on the page)
 *  2 Full-viewport hero: the living atlas with the REAL upload control
 *  seated in its resume sheet; the real upload → parse → profile → up to
 *  5 matches → one tailored resume flow runs right here on `/`
 *  3 READ → MATCH → TAILOR as one drawn signal path (#how)
 *  4 Career operating system orbit (#workspace) - code-native, no shots
 *  5 Compact trust + final action (#trust) + footer
 *
 * ONE useGuestFlow controller AND the page's ONE resume picker live here. Every
 * upload trigger on the page (hero CTA, nav CTA, the window drop surface, the
 * closing CTA) calls the same `picker.open`, so any of them opens the same OS
 * file dialog on that click. None of them scrolls to a second uploader.
 *
 * There is never a second useGuestFlow on another route (/start redirects back
 * to /#try). The moment the flow leaves the idle hero,
 * the marketing sections collapse so the guest never scrolls through
 * marketing while waiting; nav and footer stay for recovery.
 *
 * SURFACE LANGUAGE (index.css). The page is built from TWO real named token
 * surfaces, never from one-off colour classes:
 *
 *  `.surface-obsidian` - the PRODUCT world. The hero, the workspace window,
 *  the closing action and the footer. This is the surface a signed-in user
 *  actually works on, so it never goes light.
 *  `.surface-editorial` - the warm pearl MARKETING world: the transformation
 *  sequence, the proof, the roadmap. Paper you read, not software you use.
 *
 * The contrast between them is the brand. Each class re-points the entire
 * semantic layer for its own subtree, so they nest freely (the pearl section
 * holds an obsidian product stage) and every child resolves `bg-card`,
 * `text-muted-foreground`, `border-border` correctly without one `dark:`
 * variant. `dark` stays on the root so shared primitives that DO ship dark
 * variants keep behaving inside the product world.
 */
export default function LandingExperience() {
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
  const fallbackHref = authed ? '/next/today' : '/register';
  const fallbackLabel = authed ? 'Open my workspace' : 'Create free account';

  return (
    <div
      className="dark surface-obsidian min-h-screen overflow-x-clip"
      style={{ colorScheme: 'dark' }}
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
        <WorkspaceHero
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
            {/* The editorial world. One wrapper, so the surface switch is a
  single declared boundary rather than three sections each
  remembering to opt in. */}
            <div className="surface-editorial relative">
              {/* The seam between the two worlds: a short fade out of obsidian
  plus one energy hairline, so the change of surface reads as
  intentional craft rather than a missing background. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-8"
                style={{
                  background:
                    'linear-gradient(to bottom, hsl(var(--obsidian-950-hsl) / 0.5), transparent)',
                }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(to right, transparent, hsl(var(--signal-on-dark-hsl) / 0.5), transparent)',
                }}
              />
              <SignalPath />
              <ProofStrip />
              <ComingNext />
            </div>
            <TrustClose
              onUpload={onUpload}
              fallbackHref={fallbackHref}
              fallbackLabel={fallbackLabel}
            />
          </>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
