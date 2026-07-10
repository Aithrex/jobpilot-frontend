import { lazy } from 'react';
import { ShieldCheck, Smartphone, Sparkles, Target } from 'lucide-react';
import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { VisionMission } from './VisionMission';
import { FeatureSection } from './FeatureSection';
import { IntegrityBand } from './IntegrityBand';
import { Pricing } from './Pricing';
import { CloseCTA } from './CloseCTA';
import { LandingFooter } from './LandingFooter';

/**
 * Aspirely's public landing — an "instrument, not a brochure". The opening
 * SHOWS what Aspirely does through four purpose-built, animated feature demos,
 * each conveying that feature's vision for an F-1 student racing a visa clock:
 *
 *   Hero (Signal Resolve) · Vision & Mission
 *   1 · Sponsorship intelligence   2 · One-tap apply, from WhatsApp
 *   3 · Become the candidate       4 · The growth loop (+ Track)
 *   Integrity · Pricing · Close
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

export default function LandingExperience() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <Hero />
        <VisionMission />

        {/* 1 · Sponsorship intelligence */}
        <FeatureSection
          id="sponsorship"
          index="01"
          eyebrow="Sponsorship intelligence"
          eyebrowIcon={ShieldCheck}
          title={
            <>
              Never waste an application on a company that won&apos;t{' '}
              <span className="text-primary">sponsor you</span>.
            </>
          }
          subtitle="Every role carries honest H-1B facts — sponsor volume, approval rate, fiscal year — with a calm, clear state for the ones that don't. Because your OPT clock is already running."
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
          eyebrow="One-tap apply"
          eyebrowIcon={Smartphone}
          title={
            <>
              Wake up to matched jobs. Approve with <span className="text-primary">one tap</span>.
            </>
          }
          subtitle="A morning digest lands on WhatsApp — role, match, sponsorship. Tap approve, and Aspirely's extension autofills the application (your authored answers included) and submits it for you."
          demo={<WhatsAppApplyDemo />}
          reserve={488}
          flip
          caption={{
            feature: 'One-tap apply, even from WhatsApp',
            promise: 'approve on your phone; Aspirely applies and submits for you.',
          }}
        />

        {/* 3 · Become the candidate they pick */}
        <FeatureSection
          id="tailoring"
          index="03"
          eyebrow="Resume tailoring"
          eyebrowIcon={Target}
          title={
            <>
              Become the candidate they <span className="text-primary">pick</span>.
            </>
          }
          subtitle="Keywords from the JD lock into your resume and the ATS score climbs — then the recruiter's 6-second gaze shows exactly what earns the read. The strongest honest version of you, authored from your history."
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
          eyebrow="The growth loop"
          eyebrowIcon={Sparkles}
          title={
            <>
              Aspirely <span className="text-primary">compounds</span> your edge.
            </>
          }
          subtitle="Find what sets you apart, follow a 7-day plan, ship a GitHub-verified proof-of-work, then post it — impressions rise, and the next topic begins. Learn → verify → post → reach: the loop no one else runs. Your pipeline stays tracked the whole way."
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

        <IntegrityBand />
        <Pricing />
        <CloseCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
