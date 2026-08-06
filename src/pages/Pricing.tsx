import { PublicPageShell } from '@/components/landing/PublicPageShell';
import { PricingSection } from '@/components/landing/PricingSection';
import { BeforeYouBegin } from '@/components/landing/BeforeYouBegin';
import { TrustClose } from '@/components/landing/TrustClose';

/**
 * `/pricing` - a real route, not only the on-page band.
 *
 * The anchor alone cannot do this job: `LandingExperience` unmounts every
 * marketing section the moment a guest upload starts, so `#pricing` stops
 * existing at exactly the moment a guest who just uploaded a resume wants to
 * know what this costs. A route survives that, is linkable from support
 * replies and the footer, and gives the nav one target that behaves the same
 * from every page.
 *
 * It costs almost nothing: every component here is already imported by the
 * eager landing, so this lazy chunk is the page file and nothing else.
 */
export default function Pricing() {
  return (
    <PublicPageShell>
      <PricingSection variant="full" headingLevel="h1" />
      <BeforeYouBegin />
      <TrustClose fallbackHref="/register" fallbackLabel="Create free account" />
    </PublicPageShell>
  );
}
