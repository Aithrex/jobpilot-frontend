import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { VisionMission } from './VisionMission';
import { HowItWorks } from './HowItWorks';
import { Proof } from './Proof';
import { CloseCTA } from './CloseCTA';
import { LandingFooter } from './LandingFooter';

/**
 * Aspirely's public landing — an "instrument, not a brochure". Five calm,
 * high-comprehension zones (Hero · Vision & Mission · How it works · Proof ·
 * Close) built around one signature motif — Signal Resolve — and one electric
 * accent. Semantic tokens only, correct in both themes and mobile-first to
 * 360px, fully legible under prefers-reduced-motion.
 */
export default function LandingExperience() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <Hero />
        <VisionMission />
        <HowItWorks />
        <Proof />
        <CloseCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
