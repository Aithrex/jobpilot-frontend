import { type CSSProperties } from 'react';
import { LandingNav } from './LandingNav';
import { LandingHero } from './LandingHero';
import { HowItWorks } from './HowItWorks';
import { Capabilities } from './Capabilities';
import { TrustSection } from './TrustSection';
import { FinalCta } from './FinalCta';
import { LandingFooter } from './LandingFooter';

/**
 * Aspirely's public landing: "Signal, not noise". Six sections, conversion
 * first, honest everywhere:
 *
 *   1 Floating glass nav (the only blur on the page)
 *   2 Hero with the REAL product action: the guest dropzone (or the
 *     create-account door when the guest flag is off)
 *   3 How it works (#how-it-works): an interactive animated pipeline on one
 *     fixed-height stage (zero CLS when steps advance)
 *   4 Three capabilities, each led by a looping in-view-gated infographic
 *   5 Trust and privacy (#trust): one data-lifecycle diagram + captions
 *   6 Final CTA + compact footer
 *
 * No pitch player, no vision/mission, no pricing, no WebGL. Motion is
 * transform/opacity (plus SVG path draws) on the shared kit in _shared.tsx
 * and fully static under prefers-reduced-motion; every animated stage
 * reserves its height inline. Every section uses semantic tokens only; the
 * page is light-pinned via LIGHT_SURFACE below.
 */

/**
 * The landing's LIGHT surface — one deliberate professional look in BOTH app
 * themes (the mirror image of the old forced-dark mechanism). The theme
 * provider puts `dark`/`light` on <html>, so when an app user prefers dark,
 * the `.dark` custom properties would cascade into this subtree. These inline
 * overrides pin every semantic token back to its light value (via the
 * theme-independent primitives in src/index.css), locking the landing to
 * light. No landing component uses `dark:` Tailwind variants, so pinning the
 * tokens is sufficient.
 */
const LIGHT_SURFACE = {
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
        <LandingHero />
        <HowItWorks />
        <Capabilities />
        <TrustSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
