import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { useResolvedTheme } from '@/components/theme-provider';
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
 * SURFACE LANGUAGE (index.css). The page is built from real named token
 * surfaces, never from one-off colour classes:
 *
 *  `.surface-editorial` - the warm pearl reading surface.
 *  `.surface-obsidian` - the deep product surface.
 *
 * ONE OF THEM OWNS THE WHOLE PAGE, chosen by the visitor's theme. The landing
 * used to hard-code obsidian for the hero and the close, with a pearl band
 * bolted through the middle for the marketing sections, so scrolling the page
 * went dark, light, dark - and the theme toggle changed nothing, because
 * neither surface was listening to it. A visitor who has told us they want a
 * light interface should not be handed a black hero, and a page that alternates
 * reads as three pages stapled together rather than one. The toggle in the nav
 * now drives the whole page.
 *
 * THAT INCLUDES THE PRODUCT WINDOWS. The hero's workspace and the
 * transformation stage were briefly held at obsidian in both themes, on the
 * theory that a picture of the product should stay dark the way a code block
 * does. It made a light page carry a black slab as its largest object, which
 * is the same inconsistency in a smaller box. They are drawn entirely from
 * semantic tokens now (`bg-card`, `border-border`, `bg-foreground/x`, never a
 * literal white or black), so they invert with everything else.
 *
 * Each surface class re-points the entire semantic layer for its own subtree,
 * so they nest freely and every child resolves `bg-card`,
 * `text-muted-foreground` and `border-border` correctly without one `dark:`
 * variant. `dark` rides along on the root in the dark theme so shared
 * primitives that DO ship `dark:` variants keep behaving.
 */
export default function LandingExperience() {
  const resolvedTheme = useResolvedTheme();
  const darkTheme = resolvedTheme === 'dark';
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
      className={cn(
        'min-h-screen overflow-x-clip',
        darkTheme ? 'dark surface-obsidian' : 'surface-editorial',
      )}
      style={{ colorScheme: resolvedTheme }}
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
            {/* No surface wrapper and no seam: these sections inherit the
  page's one surface. The wrapper used to switch them to pearl and
  needed a fade plus an energy hairline to make the jump look
  intentional - craft spent covering for a boundary that should
  not have been there. */}
            <SignalPath />
            <ProofStrip />
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
    </div>
  );
}
