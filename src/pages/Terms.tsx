// The Aspirely Terms of Service, served at /terms. Linked from every footer,
// the signup clickwrap (which sends TERMS_VERSION) and the terms update notice.
//
// Deliberately absent: an arbitration clause and a class action waiver. Both
// are decisions for the owner and counsel, not for code.

import {
  LegalDocument,
  LegalLink,
  LegalList,
  LegalSection,
  MailLink,
} from '@/components/legal/LegalDocument';
import {
  BRAND_NAME,
  COMPANY_LEGAL_NAME,
  COMPANY_POSTAL_ADDRESS,
  CONTACT_EMAIL,
  GOVERNING_LAW_STATE,
  LAST_UPDATED,
  LEGAL_ROUTES,
  MINIMUM_AGE,
  TERMS_VERSION,
} from '@/lib/legal';

const TOC = [
  { id: 'agreement', title: 'Agreement' },
  { id: 'eligibility', title: 'Eligibility' },
  { id: 'account', title: 'Your account' },
  { id: 'service', title: 'What the service does' },
  { id: 'ai-content', title: 'AI generated content' },
  { id: 'assisted-applying', title: 'Assisted applying' },
  { id: 'acceptable-use', title: 'Acceptable use' },
  { id: 'your-content', title: 'Your content' },
  { id: 'plans', title: 'Plans, subscriptions and renewal' },
  { id: 'third-parties', title: 'Third party services' },
  { id: 'ownership', title: 'Our service and open source' },
  { id: 'termination', title: 'Termination' },
  { id: 'disclaimers', title: 'Disclaimers' },
  { id: 'liability', title: 'Limitation of liability' },
  { id: 'governing-law', title: 'Governing law' },
  { id: 'changes', title: 'Changes to these Terms' },
  { id: 'contact', title: 'Contact' },
] as const;

export default function Terms() {
  const lawState = GOVERNING_LAW_STATE ?? `the state in which ${COMPANY_LEGAL_NAME} is organized`;
  return (
    <LegalDocument
      eyebrow="Legal"
      title={`${BRAND_NAME} Terms of Service`}
      lastUpdated={LAST_UPDATED}
      lede={
        <p>
          These Terms of Service (the &quot;Terms&quot;) govern your use of {BRAND_NAME} (the &quot;service&quot;), an
          AI career platform operated by {COMPANY_LEGAL_NAME} (&quot;we&quot;, &quot;us&quot;). Please read them with
          our <LegalLink to={LEGAL_ROUTES.privacy}>Privacy Policy</LegalLink>, which explains how we handle your
          personal information.
        </p>
      }
      toc={TOC}
    >
      <LegalSection id="agreement" title="Agreement">
        <p>
          You accept these Terms when you check the agreement box and create an account, when you continue with a
          sign in provider such as Google, or when you accept an updated version in the app. If you do not agree,
          do not use the service. This is version {TERMS_VERSION} of the Terms.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="Eligibility">
        <p>
          You must be at least {MINIMUM_AGE} years old and able to form a binding contract to use {BRAND_NAME}. By
          creating an account you confirm that you are. The service is not directed to children, and we close
          accounts we learn belong to someone under {MINIMUM_AGE}.
        </p>
      </LegalSection>

      <LegalSection id="account" title="Your account">
        <LegalList>
          <li>Give accurate information and keep it current.</li>
          <li>Keep your sign in details secure. You are responsible for activity under your account.</li>
          <li>An account is for one person. Do not share it or create accounts for others without their permission.</li>
          <li>Tell us promptly at <MailLink address={CONTACT_EMAIL} /> if you believe your account was used without your permission.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="service" title="What the service does">
        <p>
          {BRAND_NAME} helps you tailor resumes, find and track jobs, prepare for interviews and manage
          applications. It uses AI to draft and score content based on the information you provide. Features change
          over time, and some may be offered as previews that are clearly labeled as such.
        </p>
      </LegalSection>

      <LegalSection id="ai-content" title="AI generated content">
        <LegalList>
          <li>
            <strong>Everything AI produces is a draft.</strong> Resumes, cover letters, application answers, scores
            and suggestions can contain mistakes. You must review and edit them, and you are responsible for anything
            you submit to an employer or anyone else.
          </li>
          <li>
            <strong>{BRAND_NAME} never fabricates experience.</strong> The service is built to work only from facts
            you provided and to leave out claims it cannot support. If you see a statement that is not true about
            you, remove it before you use the document.
          </li>
          <li>
            <strong>No outcome is guaranteed.</strong> We do not promise interviews, offers, sponsorship or any
            other result. Match scores and fit assessments are estimates to help you decide, not predictions.
          </li>
          <li>
            <strong>Not professional advice.</strong> Information about visas, sponsorship or employers is general
            information drawn from public sources. It is not legal, immigration or career advice.
          </li>
          <li>Some features are conversations with an AI system, not with a person.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="assisted-applying" title="Assisted applying">
        <p>
          If you turn on assisted applying, you authorize {BRAND_NAME} to fill out and submit applications on your
          behalf in the mode you choose, using the information in your account. You can change the mode or turn it
          off at any time in Settings. You remain responsible for the accuracy of what is submitted and for following
          each employer&apos;s terms. Where you ask us to, we may create an account for you on an employer&apos;s career
          site and store its login securely so we can submit for you.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
        <p>You agree not to:</p>
        <LegalList>
          <li>submit false or misleading information, or impersonate anyone;</li>
          <li>use the service to break the law, infringe anyone&apos;s rights, or send spam;</li>
          <li>attempt to disrupt the service, probe it for vulnerabilities without following our security policy, or access it without authorization;</li>
          <li>copy, scrape, resell or reverse engineer the service, or access other users&apos; data;</li>
          <li>use automated means to create accounts or to overload the service.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="your-content" title="Your content">
        <p>
          You keep ownership of the content you provide, including resumes, profile data and application answers, and
          of the documents you create with the service. You give us a limited license to host, process and transmit
          that content only to operate and provide the service to you, as described in the Privacy Policy. We do not
          use your content to train AI models.
        </p>
        <p>
          If you send us feedback or ideas, we may use them without any obligation to you.
        </p>
      </LegalSection>

      <LegalSection id="plans" title="Plans, subscriptions and renewal">
        <LegalList>
          <li>The Free plan costs nothing and does not require a payment card.</li>
          <li>
            Paid plans are not on sale yet. When they open, the price, billing interval and what is included will be
            shown clearly before you buy, and these terms will apply.
          </li>
          <li>
            A paid plan renews automatically at the end of each billing period, at the price shown when you
            subscribed, until you cancel. We will tell you in advance about any price change, and you can cancel
            before it takes effect.
          </li>
          <li>
            You can cancel online at any time in Settings, under Billing. Cancellation stops the next renewal, and
            you keep access to paid features through the end of the period you already paid for.
          </li>
          <li>Payments are processed by Stripe. Any refund terms will be shown at the point of purchase, and we follow refund rules that apply where you live.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="third-parties" title="Third party services">
        <p>
          The service works with other services, such as Google, GitHub, LinkedIn and employer hiring systems. Your use
          of them is governed by their own terms and policies, and we are not responsible for them. We do not control
          job postings, which come from employers and public sources and may be inaccurate or out of date.
        </p>
      </LegalSection>

      <LegalSection id="ownership" title="Our service and open source">
        <p>
          We own the service, including its software, design and brand. These Terms do not give you any right to use
          the {BRAND_NAME} name or logo. The service includes open source software, which is licensed under its own
          terms, listed on our <LegalLink to={LEGAL_ROUTES.licenses}>open source licenses</LegalLink> page.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Termination">
        <p>
          You can stop using the service at any time and delete your account in Settings, under Profile. We may
          suspend or close an account that breaks these Terms or puts the service or other users at risk, and we will
          tell you why unless the law or a security concern prevents it. Sections that by their nature should
          survive, such as ownership, disclaimers and limitation of liability, survive termination.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="Disclaimers">
        <p>
          The service is provided &quot;as is&quot; and &quot;as available&quot;. To the fullest extent the law allows, we
          disclaim all warranties, express or implied, including warranties of merchantability, fitness for a
          particular purpose and non infringement. We do not warrant that the service will be uninterrupted or error
          free, or that AI output or job information will be accurate.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of liability">
        <p>
          To the fullest extent the law allows, {COMPANY_LEGAL_NAME} will not be liable for any indirect, incidental,
          special, consequential or punitive damages, or for lost profits, data or opportunities, arising from your
          use of the service. Nothing in these Terms limits liability that cannot be limited by law.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="Governing law">
        <p>
          These Terms are governed by the laws of {lawState} and applicable United States federal law, without regard
          to conflict of law rules. Nothing in these Terms takes away rights you have under the consumer protection
          laws of the state where you live.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to these Terms">
        <p>
          We may update these Terms as the service changes. When we do, we update the date and version at the top,
          and for material changes we tell you in the app or by email and ask you to review and accept the new
          version. Changes do not apply to a dispute that arose before them.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about these Terms: <MailLink address={CONTACT_EMAIL} />.
        </p>
        <p>
          {COMPANY_LEGAL_NAME}
          {COMPANY_POSTAL_ADDRESS ? `, ${COMPANY_POSTAL_ADDRESS}` : ''}
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
