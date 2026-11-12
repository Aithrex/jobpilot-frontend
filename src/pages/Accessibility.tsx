// /accessibility: the accessibility statement. Linked from every footer and
// the Trust Center. Known limitations are stated plainly; each one is real
// and should be removed only when it is fixed.

import {
  LegalDocument,
  LegalLink,
  LegalList,
  LegalSection,
  MailLink,
} from '@/components/legal/LegalDocument';
import {
  ACCESSIBILITY_EMAIL,
  ACCESSIBILITY_RESPONSE_BUSINESS_DAYS,
  BRAND_NAME,
  LAST_UPDATED,
  LEGAL_ROUTES,
} from '@/lib/legal';

export default function Accessibility() {
  return (
    <LegalDocument
      eyebrow="Accessibility"
      title="Accessibility statement"
      lastUpdated={LAST_UPDATED}
      lede={
        <p>
          We want everyone to be able to use {BRAND_NAME} to find and apply for work, including people who use a
          screen reader, a keyboard, magnification, voice control or other assistive technology.
        </p>
      }
    >
      <LegalSection id="standard" title="Our target">
        <p>
          We design and test {BRAND_NAME} against the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA,
          published by the W3C. We are working toward full conformance and have not yet completed an independent
          audit.
        </p>
      </LegalSection>

      <LegalSection id="what-we-do" title="What we do">
        <LegalList>
          <li>Pages are built to work with a keyboard and show a visible focus indicator. Our public pages and the app start with a skip link to the main content.</li>
          <li>Pages use real headings, landmarks, labels and buttons, so assistive technology can describe them.</li>
          <li>We avoid using color as the only way to show information, and our text colors are chosen to meet WCAG contrast ratios in light and dark themes.</li>
          <li>Automated accessibility checks with the open source axe-core engine run in our test suite on the legal and privacy pages and on the signup form.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="known-limitations" title="Known limitations">
        <p>These are the gaps we know about and are working on:</p>
        <LegalList>
          <li>The score trend chart in interview insights shows data visually without a text alternative. The charts on the Today page include one.</li>
          <li>The sign in and sign up pages do not yet have a skip link.</li>
          <li>Resume PDFs we generate are not tagged PDFs. If you use a screen reader to review your resume, download the Word (DOCX) version instead.</li>
          <li>Decorative animation on public pages carries no information, but it can be distracting. When your device asks for reduced motion, it is reduced or stopped.</li>
          <li>Job postings and employer application sites are provided by employers. We cannot fix accessibility problems in their content or on their sites.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="report" title="Report a problem or ask for help">
        <p>
          If something on {BRAND_NAME} is hard to use with your setup, tell us at{' '}
          <MailLink address={ACCESSIBILITY_EMAIL} />. It helps to include the page address, what you were trying to
          do, and the browser and assistive technology you use. If you cannot complete a task, we will help you
          complete it another way.
        </p>
        <p>
          A person will reply within {ACCESSIBILITY_RESPONSE_BUSINESS_DAYS} business days, tell you what we will do,
          and follow up when it is fixed.
        </p>
      </LegalSection>

      <LegalSection id="related" title="Related">
        <p>
          See the <LegalLink to={LEGAL_ROUTES.trust}>Trust Center</LegalLink> for how we handle privacy, security and
          AI.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
