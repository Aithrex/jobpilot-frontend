import { PublicPageShell } from '@/components/landing/PublicPageShell';
import { BeforeYouBegin } from '@/components/landing/BeforeYouBegin';
import { TrustClose } from '@/components/landing/TrustClose';

/**
 * `/trust` - the decision section as its own page.
 *
 * Same reasoning as `/pricing`: a visitor deciding whether to hand over a
 * resume needs these answers to survive the guest flow taking over `/`, and
 * needs to be able to link someone to them.
 *
 * It used to render three components - the six trust answers in full, then the
 * seven-item FAQ, then the close - which was the duplication the merge
 * removed. The route KEEPS its `/trust` path even though nothing on it is
 * labelled "Trust" any more: every existing inbound link, footer entry and
 * support reply points here, and renaming a public URL to match a heading is a
 * cost paid by readers rather than by us.
 */
export default function Trust() {
  return (
    <PublicPageShell>
      <BeforeYouBegin headingLevel="h1" />
      <TrustClose fallbackHref="/register" fallbackLabel="Create free account" />
    </PublicPageShell>
  );
}
