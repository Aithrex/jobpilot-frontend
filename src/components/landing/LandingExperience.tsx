import { lazy, type CSSProperties } from 'react';
import { ShieldCheck, Smartphone, Sparkles, Target } from 'lucide-react';
import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { PitchSection } from './pitch/PitchSection';
import { VisionMission } from './VisionMission';
import { FeatureSection } from './FeatureSection';
import { FeatureConstellation } from './FeatureConstellation';
import { IntegrityBand } from './IntegrityBand';
import { Pricing } from './Pricing';
import { CloseCTA } from './CloseCTA';
import { LandingFooter } from './LandingFooter';

/**
 * Aspirely's public landing — a LIGHT, professional, product-first job
 * platform page. The opening SHOWS the product working (the hero's live
 * matching-jobs panel), then the animated feature demos carry the rest:
 *
 *   Hero (light, with the live jobs panel) · Pitch · Vision & Mission
 *   1 · Sponsorship intelligence   2 · One-tap apply, from WhatsApp
 *   3 · Become the candidate       4 · The growth loop (+ Track)
 *   Constellation (the full breadth) · Integrity · Pricing · Close
 *
 * Every demo composes the shared motion kit (demos/_kit.tsx): one timing/easing
 * language, in-view-gated with a single ambient loop, code-split + lazy so
 * nothing heavy runs off-screen, static-but-excellent under reduced motion,
 * zero layout shift, semantic tokens only (indigo = the one accent).
 */

// Code-split each demo; FeatureSection wraps them in LazyMount + Suspense so
// they only download and animate near the viewport.
const SponsorshipDemo = lazy(() => import('./demos/SponsorshipDemo'));
const WhatsAppApplyDemo = lazy(() => import('./demos/WhatsAppApplyDemo'));
const TailorDemo = lazy(() => import('./demos/TailorDemo'));
const GrowthLoopDemo = lazy(() => import('./demos/GrowthLoopDemo'));
const TrackStrip = lazy(() => import('./demos/GrowthLoopDemo').then((m) => ({ default: m.TrackStrip })));

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
  '--muted-foreground': 'var(--slate-500-hsl)',
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
    <div className="min-h-screen bg-background text-foreground" style={LIGHT_SURFACE}>
      <LandingNav />
      <main>
        {/* The light, product-first opening: minimal copy + the live
            matching-jobs panel as the centerpiece. */}
        <Hero />

        {/* The 60-second pitch cinema — the hero's "See how it works" CTA
            anchors to #pitch. Statically imported so its poster renders
            immediately near the fold; the heavy scenes are code-split inside
            (PitchScenes). */}
        <PitchSection />

        <VisionMission />

        {/* 1 · Sponsorship intelligence */}
        <FeatureSection
          id="sponsorship"
          index="01"
          pain="Your OPT clock runs while you apply blind"
          eyebrow="Sponsorship intelligence"
          eyebrowIcon={ShieldCheck}
          title={
            <>
              Never waste an application on a company that won&apos;t{' '}
              <span className="text-primary">sponsor you</span>.
            </>
          }
          subtitle="Honest H-1B facts on every role before you spend one application."
          demo={<SponsorshipDemo />}
          reserve={404}
          caption={{
            feature: 'Sponsorship intelligence',
            promise: 'know who actually sponsors before you spend a single application.',
          }}
        />

        {/* 2 · One-tap apply, from WhatsApp */}
        <FeatureSection
          id="one-tap-apply"
          index="02"
          pain="Mass applying gets you flagged and ignored"
          eyebrow="One-tap apply"
          eyebrowIcon={Smartphone}
          title={
            <>
              Wake up to matched jobs. Approve with <span className="text-primary">one tap</span>.
            </>
          }
          subtitle="Five vetted roles on WhatsApp each morning. You approve every apply."
          demo={<WhatsAppApplyDemo />}
          reserve={488}
          flip
          caption={{
            feature: 'One-tap apply, even from WhatsApp',
            promise: 'approve on your phone, finish in your own browser. Nothing runs at volume.',
          }}
        />

        {/* 3 · Become the candidate they pick */}
        <FeatureSection
          id="tailoring"
          index="03"
          pain="Recruiters give your resume six seconds"
          eyebrow="Resume tailoring"
          eyebrowIcon={Target}
          title={
            <>
              Become the candidate they <span className="text-primary">pick</span>.
            </>
          }
          subtitle="Authored to the JD, built to survive the six second scan."
          demo={<TailorDemo />}
          reserve={512}
          caption={{
            feature: 'Become the candidate they pick',
            promise: 'authored to the role, built to survive the 6-second scan.',
          }}
        />

        {/* 4 · The growth loop — the signature differentiator (prominent) + Track */}
        <FeatureSection
          id="growth-loop"
          index="04"
          pain="Everyone else has your exact resume"
          eyebrow="The growth loop"
          eyebrowIcon={Sparkles}
          title={
            <>
              Aspirely <span className="text-primary">compounds</span> your edge.
            </>
          }
          subtitle="Learn, ship verified proof, post, repeat. Your edge compounds."
          demo={<GrowthLoopDemo />}
          reserve={440}
          prominent
          caption={{
            feature: 'The growth loop',
            promise: 'a compounding, GitHub-verified edge that keeps opening doors.',
          }}
        >
          <TrackStrip />
        </FeatureSection>

        {/* The full breadth — supporting features as a constellation of nodes */}
        <FeatureConstellation />

        <IntegrityBand />
        <Pricing />
        <CloseCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
