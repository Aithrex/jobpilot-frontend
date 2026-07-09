import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { TrustStrip } from './TrustStrip';
import { FeatureJourney } from './FeatureJourney';
import { OptClockSection } from './OptClockSection';
import { IntegritySection } from './IntegritySection';
import { SocialProof } from './SocialProof';
import { PricingTeaser } from './PricingTeaser';
import { FinalCTA } from './FinalCTA';
import { LandingFooter } from './LandingFooter';
import { Container, Eyebrow, Reveal } from './_shared';
import StatCounters from './demos/StatCounters';

/**
 * Aspirely's public marketing landing (Compass §7) — a confident, calm,
 * editorial, animated showcase of the whole product for job seekers on the visa
 * clock. Names the real pain, then hands over a plan. Semantic tokens only;
 * designed for both themes and mobile-first to 360px; every animated demo is
 * self-contained (framer-motion + inline SVG/CSS), lazy-mounted below the fold,
 * paused off-screen, and fully static under prefers-reduced-motion.
 */
export default function LandingExperience() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <Hero />
        <TrustStrip />

        {/* animated promise metrics */}
        <section className="py-8 sm:py-12">
          <Container>
            <Reveal className="mb-6 text-center">
              <Eyebrow>By the numbers</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <StatCounters />
            </Reveal>
          </Container>
        </section>

        <FeatureJourney />
        <OptClockSection />
        <IntegritySection />
        <SocialProof />
        <PricingTeaser />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
