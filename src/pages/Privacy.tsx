// The Aspirely Privacy Policy, served at /privacy and linked from every
// footer, the signup clickwrap and the terms update notice. The extension's
// own notice lives at /applypilot/privacy.
//
// Every factual claim here was checked against the code that does it. The
// sources are named beside each claim in comments so the next edit can keep
// the policy true.

import {
  ExternalLink,
  LegalCallout,
  LegalDocument,
  LegalLink,
  LegalList,
  LegalSection,
  LegalSubheading,
  MailLink,
} from '@/components/legal/LegalDocument';
import {
  BRAND_NAME,
  COMPANY_LEGAL_NAME,
  COMPANY_POSTAL_ADDRESS,
  GOOGLE_PERMISSIONS_URL,
  GOOGLE_USER_DATA_POLICY_URL,
  LAST_UPDATED,
  LEGAL_ROUTES,
  MINIMUM_AGE,
  PRIVACY_EMAIL,
  SECURITY_EMAIL,
  VERTEX_DATA_GOVERNANCE_URL,
} from '@/lib/legal';

const TOC = [
  { id: 'notice-at-collection', title: 'Notice at collection' },
  { id: 'information-we-collect', title: 'Information we collect' },
  { id: 'sensitive-information', title: 'Sensitive personal information' },
  { id: 'how-we-use', title: 'How we use information' },
  { id: 'ai-processing', title: 'How AI is used' },
  { id: 'google-user-data', title: 'Google user data and Limited Use' },
  { id: 'service-providers', title: 'Service providers and other disclosures' },
  { id: 'no-sale-or-sharing', title: 'No sale or sharing' },
  { id: 'cookies', title: 'Cookies and browser storage' },
  { id: 'global-privacy-control', title: 'Global Privacy Control' },
  { id: 'your-rights', title: 'Your privacy rights' },
  { id: 'exercise-rights', title: 'How to exercise your rights' },
  { id: 'appeals', title: 'Appeals' },
  { id: 'children', title: 'Children' },
  { id: 'security', title: 'Security' },
  { id: 'data-location', title: 'Where data is processed' },
  { id: 'changes', title: 'Changes to this policy' },
  { id: 'contact', title: 'Contact us' },
] as const;

interface CategoryRow {
  category: string;
  examples: string;
  sources: string;
  purposes: string;
  retention: string;
  sensitive?: boolean;
}

// Retention sources: account_service.CASCADE_COLLECTIONS (deletion),
// infra/compose/README.md "Backups" (30 day file backups, 8 day database
// snapshots, 14 day disk backups), guest_service.run_retention_cleanup
// (retention_days default 30, platform_config_service), tech_feed_feedback
// DEFAULT_TTL_DAYS = 180, account_service (billing_incidents retained).
const CATEGORIES: readonly CategoryRow[] = [
  {
    category: 'Identifiers and account details',
    examples:
      'Name, email address, password (stored only as a one-way hash), the account ID from a sign-in provider you choose, IP address.',
    sources: 'You; the sign-in provider you choose; your browser.',
    purposes: 'Create and secure your account, sign you in, contact you about your account, prevent abuse.',
    retention: 'While your account is open.',
  },
  {
    category: 'Professional and employment information',
    examples:
      'Resumes you upload, work history, education, skills, projects and links, target roles, locations, pay floor, the tailored resumes, cover letters and application answers you create.',
    sources: 'You; GitHub or LinkedIn if you connect them; content Aspirely generates from what you provide.',
    purposes: 'Match you with jobs, tailor and score resumes, draft application material, fill applications you approve.',
    retention: 'While your account is open, or until you delete the item.',
  },
  {
    category: 'Job search activity',
    examples:
      'Saved jobs, applications you track and their status, reminders, interview practice, and feedback such as "not interested".',
    sources: 'You; Aspirely, as you use it.',
    purposes: 'Run your tracker, reminders and daily briefing, and rank jobs for you.',
    retention: 'While your account is open. "Not interested" feedback expires after 180 days.',
  },
  {
    category: 'Inferences',
    examples: 'Match scores, fit assessments and skill gaps computed from your resume and preferences.',
    sources: 'Aspirely, from the information above.',
    purposes: 'Rank and explain job matches for you. Never sold, never used for advertising.',
    retention: 'While your account is open.',
  },
  {
    category: 'Job search email',
    examples:
      'If you connect Gmail: the sender, subject, date and an excerpt of job application emails, and the status Aspirely derives. Mail employers send to your Aspirely application address.',
    sources: 'Your Gmail account, with your permission; employers who write to your application address.',
    purposes: 'Update your application status and show your application inbox.',
    retention: 'While your account is open, or until you delete the message. Disconnecting Gmail stops new reads.',
    sensitive: true,
  },
  {
    category: 'Immigration and work authorization',
    examples:
      'Your work authorization answer and, if you use the Visa Timeline, visa status, key visa dates and country of birth.',
    sources: 'You, only if you choose to provide it.',
    purposes: 'Match you with employers that sponsor, and build your visa timeline and deadline reminders.',
    retention: 'Until you change it, withdraw consent (which erases it), or delete your account.',
    sensitive: true,
  },
  {
    category: 'Employer site logins',
    examples: 'Usernames and passwords for employer career sites, saved by you or created for you for assisted applying.',
    sources: 'You; Aspirely, when it creates an employer site account you asked for.',
    purposes: 'Sign in to employer sites to submit applications you approved.',
    retention: 'Until you delete them or delete your account.',
    sensitive: true,
  },
  {
    category: 'Voluntary self identification',
    examples:
      'Only if you choose to save them: answers to employer questions about gender, race or ethnicity, veteran status or disability. The default is to decline.',
    sources: 'You.',
    purposes: 'Answer those optional questions on applications you approve, exactly as you set them.',
    retention: 'Until you delete them or delete your account.',
    sensitive: true,
  },
  {
    category: 'Usage, device and diagnostic data',
    examples:
      'Pages viewed, features used, clicks, load times, errors, browser and device type, approximate location derived from IP address, plan usage counts.',
    sources: 'Your browser, through our servers and Datadog.',
    purposes: 'Keep the service reliable and secure, measure performance, enforce plan limits.',
    retention: 'Server logs rotate automatically. Plan usage counts are kept while your account is open.',
  },
  {
    category: 'Payment information',
    examples:
      'When paid plans open: your plan, billing status and a customer reference from Stripe. We never receive your full card number. Paid plans are not on sale today.',
    sources: 'You, through Stripe.',
    purposes: 'Process payments and manage your subscription.',
    retention: 'As long as tax and accounting law requires, which can extend past account deletion.',
  },
  {
    category: 'Communications',
    examples: 'Messages you send us, feedback and support requests.',
    sources: 'You.',
    purposes: 'Respond to you and improve the service.',
    retention: 'While your account is open, or as long as needed to resolve your request.',
  },
  {
    category: 'Guest uploads (no account)',
    examples: 'A resume uploaded and the matches and tailored resume created before you sign up.',
    sources: 'You.',
    purposes: 'Show you results before you create an account.',
    retention: 'Deleted about 30 days after your last visit if you do not create an account.',
  },
];

function CategoriesTable() {
  return (
    <div
      role="region"
      aria-labelledby="categories-caption"
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <table className="w-full min-w-[56rem] border-collapse text-left text-sm leading-relaxed">
        <caption id="categories-caption" className="sr-only">
          Categories of personal information, with their sources, purposes and retention
        </caption>
        <thead className="bg-muted/60 text-foreground">
          <tr>
            {['Category', 'What it includes', 'Where it comes from', 'Why we use it', 'How long we keep it'].map(
              (h) => (
                <th key={h} scope="col" className="border-b border-border px-4 py-3 font-semibold">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="align-top text-foreground">
          {CATEGORIES.map((row) => (
            <tr key={row.category} className="border-b border-border last:border-b-0">
              <th scope="row" className="px-4 py-3 font-semibold">
                {row.category}
                {row.sensitive && (
                  <span className="mt-1 block text-xs font-medium text-muted-foreground">Sensitive</span>
                )}
              </th>
              <td className="px-4 py-3">{row.examples}</td>
              <td className="px-4 py-3">{row.sources}</td>
              <td className="px-4 py-3">{row.purposes}</td>
              <td className="px-4 py-3">{row.retention}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Privacy() {
  return (
    <LegalDocument
      eyebrow="Legal"
      title={`${BRAND_NAME} Privacy Policy`}
      lastUpdated={LAST_UPDATED}
      lede={
        <p>
          {BRAND_NAME} is an AI career platform operated by {COMPANY_LEGAL_NAME}. It helps you tailor your resume,
          find jobs and manage your applications. This policy explains what personal information we collect, why,
          who processes it for us, how long we keep it, and the choices and rights you have. We do not sell or share
          your personal information.
        </p>
      }
      toc={TOC}
    >
      <div id="notice-at-collection" className="scroll-mt-20">
        <LegalCallout title="Notice at collection">
          <p>
            We collect the categories of personal information in the table below, including the sensitive
            categories marked there, for the purposes listed beside each one. We keep each category for the period
            shown. We do not sell or share personal information, and we do not use it for targeted advertising.
          </p>
          <p>
            You can see and change your choices on{' '}
            <LegalLink to={LEGAL_ROUTES.choices}>Your Privacy Choices</LegalLink>.
          </p>
        </LegalCallout>
      </div>

      <LegalSection id="information-we-collect" title="Information we collect">
        <p>
          The table lists each category of personal information, where it comes from, why we use it and how long we
          keep it. When you delete your account, we erase your data from our live systems. Copies in our encrypted
          backups expire within 30 days.
        </p>
        <CategoriesTable />
        <p>
          We collect only what the features you use need. Most fields are optional, and leaving one blank never
          blocks you from using {BRAND_NAME}.
        </p>
      </LegalSection>

      <LegalSection id="sensitive-information" title="Sensitive personal information">
        <p>Some of what you can give us is sensitive personal information under state privacy laws:</p>
        <LegalList>
          <li>
            <strong>Immigration and work authorization status</strong>, which you can provide to be matched with
            employers that sponsor. We ask for your consent when you provide it, and you can withdraw consent at
            any time in Settings. Withdrawing consent erases the stored values and stops their use in matching.
            &quot;Prefer not to say&quot; is always an option.
          </li>
          <li>
            <strong>Employer site usernames and passwords</strong>, stored encrypted and used only to sign in to the
            employer sites you applied to through {BRAND_NAME}.
          </li>
          <li>
            <strong>The contents of job search email</strong>, read from Gmail only if you connect it, and mail sent
            to your {BRAND_NAME} application address.
          </li>
          <li>
            <strong>Voluntary self identification answers</strong> (gender, race or ethnicity, veteran status,
            disability), only if you choose to save them for employer forms.
          </li>
        </LegalList>
        <p>
          We use and disclose sensitive personal information only to provide the features you ask for. We do not use
          it to infer characteristics about you, we do not sell or share it, and we do not use it for advertising.
          Because our use is already limited to providing the service, the right to limit the use of sensitive
          personal information is in effect for every account by default.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="How we use information">
        <LegalList>
          <li>To provide the service: parse and tailor your resume, match and rank jobs, track applications, and draft and submit application material you approve.</li>
          <li>To run your account: sign in, security, plan limits and support.</li>
          <li>To send the email you choose to receive, and the account and security email your account needs.</li>
          <li>To keep the service reliable and secure, and to detect and prevent fraud and abuse.</li>
          <li>To comply with the law and enforce our <LegalLink to={LEGAL_ROUTES.terms}>Terms of Service</LegalLink>.</li>
        </LegalList>
        <p>
          {BRAND_NAME} ranks and filters job postings for you. It does not make hiring decisions, and it never
          decides for you whether you may apply for a job. Assisted applying runs only in the mode you choose.
        </p>
      </LegalSection>

      <LegalSection id="ai-processing" title="How AI is used">
        <p>
          {BRAND_NAME} uses Google Vertex AI, in Google Cloud&apos;s United States location, to
          parse resumes, analyze job descriptions, tailor resumes, draft cover letters and application answers,
          power the career copilot, and classify job search email. The text needed for each request is sent to
          Google to produce the result. The career copilot and other chat features are conversations with an AI
          system, not with a person.
        </p>
        <p>
          Before text is sent, {BRAND_NAME} replaces email addresses, phone numbers, profile links and numbers shaped
          like a Social Security number with placeholders, and restores them in the result. Your name and work
          history are sent, because the result depends on them. A scanned resume with no text layer is sent as an
          image.
        </p>
        <p>
          {BRAND_NAME} does not use your content to train AI models. Google states in its{' '}
          <ExternalLink href={VERTEX_DATA_GOVERNANCE_URL}>Vertex AI data governance documentation</ExternalLink>{' '}
          that it will not use customer data to train or fine tune any AI or ML models without the customer&apos;s
          prior permission or instruction. The same page says Google may cache data for up to 24 hours to reduce
          latency, and may log prompts to detect abuse of its policies.
        </p>
        <p>
          AI output is a draft. {BRAND_NAME} is built never to add experience you did not provide, and it checks
          generated resumes against your own resume, but you should review everything before you use it.
        </p>
      </LegalSection>

      <LegalSection id="google-user-data" title="Google user data and Limited Use">
        <p>
          <strong>Sign in with Google</strong> gives us your name, email address and basic profile (the OpenID
          Connect scopes <code>openid email profile</code>) to create and sign in to your account.
        </p>
        <p>
          <strong>Connecting Gmail</strong> is optional. It requests read only access (<code>gmail.readonly</code>)
          for one purpose: finding job application emails and updating the status of your applications inside{' '}
          {BRAND_NAME}. We never send email as you. Job application emails may be processed by Google Vertex AI,
          as described above, only to determine that status for you.
        </p>
        <p>
          {BRAND_NAME}&apos;s use and transfer to any other app of information received from Google APIs will adhere
          to the <ExternalLink href={GOOGLE_USER_DATA_POLICY_URL}>Google API Services User Data Policy</ExternalLink>,
          including the Limited Use requirements. In particular, {BRAND_NAME}:
        </p>
        <LegalList>
          <li>uses Gmail data only to provide and improve the application tracking features you see in the app;</li>
          <li>does not transfer Gmail data to others except as needed to provide those features, to comply with law, for security, or as part of a merger or acquisition with notice to you;</li>
          <li>does not use Gmail data for advertising, and does not sell it;</li>
          <li>does not let people read your Gmail data unless you ask us to for specific messages, it is needed for security or to comply with law, or the data is aggregated and anonymized;</li>
          <li>does not use Gmail data to train generalized AI or machine learning models.</li>
        </LegalList>
        <p>
          You can disconnect Gmail in Settings at any time, which deletes our stored Google tokens. You can also
          remove {BRAND_NAME}&apos;s access from your{' '}
          <ExternalLink href={GOOGLE_PERMISSIONS_URL}>Google Account permissions</ExternalLink>.
        </p>
      </LegalSection>

      <LegalSection id="service-providers" title="Service providers and other disclosures">
        <p>
          These companies process personal information on our behalf, and their terms with us limit their use of it to
          providing their service to us:
        </p>
        <LegalList>
          <li><strong>Oracle Cloud Infrastructure</strong>: hosting, file storage and encrypted backups, in the United States.</li>
          <li><strong>MongoDB Atlas</strong>: database hosting.</li>
          <li><strong>Cloudflare</strong>: network delivery, HTTPS, security, and receiving mail sent to your {BRAND_NAME} application address.</li>
          <li><strong>Google Cloud (Vertex AI)</strong>: AI processing, as described above.</li>
          <li><strong>ZeptoMail by Zoho</strong>: sending account, notification and forwarded application email.</li>
          <li><strong>Datadog</strong>: website performance and error monitoring.</li>
          <li><strong>Stripe</strong>: payment processing, when paid plans open.</li>
        </LegalList>
        <p>We also disclose personal information in these cases:</p>
        <LegalList>
          <li>
            <strong>At your direction.</strong> When you apply to a job through {BRAND_NAME}, we send your application
            to that employer or its hiring system. When you connect Google, GitHub or LinkedIn, we exchange data with
            that service as you authorized, and when you ask us to publish a LinkedIn post, we publish it.
          </li>
          <li><strong>For legal reasons</strong>, when required by law or to protect the rights, safety and security of our users, the public or {BRAND_NAME}.</li>
          <li><strong>In a business transfer</strong>, such as a merger or acquisition, subject to this policy.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="no-sale-or-sharing" title="No sale or sharing">
        <p>
          We do not sell personal information, and we do not share it for cross context behavioral advertising, as
          those terms are defined in the California Consumer Privacy Act. We have not done either in the past 12
          months. We do not use personal information for targeted advertising, we do not run advertising cookies or
          pixels, and we do not disclose personal information to third parties for their own marketing. Because we do
          not sell or share, there is nothing to opt out of, and we do not knowingly sell or share the personal
          information of anyone under 16.
        </p>
        <p>We do not offer financial incentives in exchange for personal information.</p>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and browser storage">
        <LegalList>
          <li>Your sign in token is kept in your browser&apos;s local storage so you stay signed in.</li>
          <li>If you try {BRAND_NAME} before signing up, a secure, HTTP only cookie keeps your guest session.</li>
          <li>Settings such as your theme are kept in local storage.</li>
          <li>Datadog sets a first party cookie to group page views into a session for performance monitoring. Session replay is turned off and form input is masked.</li>
        </LegalList>
        <p>
          Browsers do not share one standard for &quot;Do Not Track&quot;, so we do not change behavior based on it.
          We do honor Global Privacy Control, below.
        </p>
      </LegalSection>

      <LegalSection id="global-privacy-control" title="Global Privacy Control">
        <p>
          We treat a Global Privacy Control (GPC) signal as a valid request to opt out of the sale and sharing of
          your personal information. We already do neither, and we go further: when your browser sends GPC,{' '}
          {BRAND_NAME} does not load Datadog performance monitoring in that browser. When you are signed in, we also
          record that we received the signal on your account. You can check whether your browser is sending it on{' '}
          <LegalLink to={LEGAL_ROUTES.choices}>Your Privacy Choices</LegalLink>.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your privacy rights">
        <p>
          Residents of California, Virginia, Colorado, Connecticut, Texas and other states with consumer privacy laws
          have rights over their personal information. We offer the same rights to every {BRAND_NAME} user, wherever
          you live:
        </p>
        <LegalList>
          <li><strong>Know and access</strong> the personal information we hold about you, and how we collect, use and disclose it.</li>
          <li><strong>Delete</strong> your personal information.</li>
          <li><strong>Correct</strong> inaccurate personal information.</li>
          <li><strong>Portability</strong>: get a copy of your data in a portable, machine readable format.</li>
          <li><strong>Opt out</strong> of the sale or sharing of personal information, targeted advertising and profiling for decisions with legal or similarly significant effects. We do none of these.</li>
          <li><strong>Limit</strong> the use of sensitive personal information to what is needed to provide the service. That limit is already in place.</li>
          <li><strong>Withdraw consent</strong> for sensitive personal information, such as immigration status, at any time.</li>
          <li><strong>Non discrimination</strong>: we will not deny you service, charge a different price or give you a different quality of service because you exercised a right.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="exercise-rights" title="How to exercise your rights">
        <LegalList>
          <li>
            <strong>In the app.</strong> In Settings, under Profile, you can download all of your data, withdraw
            immigration status consent, choose which email you receive and delete your account. You can correct most
            information directly where you entered it.
          </li>
          <li>
            <strong>By email.</strong> Write to <MailLink address={PRIVACY_EMAIL} /> from the address on your
            account. Because {BRAND_NAME} is an online service and we have a direct relationship with you, email is
            our designated method for requests that are not available in the app.
          </li>
        </LegalList>
        <p>
          We verify a request by matching it to your signed in account or to the email address on your account, and
          we may ask for more information when we cannot. We confirm receipt within 10 business days and respond
          within 45 days. If we need more time, up to another 45 days, we will tell you why.
        </p>
        <LegalSubheading>Authorized agents</LegalSubheading>
        <p>
          You can use an authorized agent to make a request for you. We will ask the agent for your signed
          permission, and we may ask you to verify your identity with us directly, unless the agent provides a valid
          power of attorney.
        </p>
      </LegalSection>

      <LegalSection id="appeals" title="Appeals">
        <p>
          If we decline your request in whole or in part, you can appeal. Reply to our decision, or email{' '}
          <MailLink address={PRIVACY_EMAIL} /> with the subject line &quot;Privacy appeal&quot;. We will tell you the result and our reasons in writing
          within 45 days, or sooner where your state&apos;s law requires. If we deny your appeal, we will tell you how to
          contact your state&apos;s Attorney General, as the laws of Virginia, Colorado, Connecticut, Texas and similar
          states provide.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          {BRAND_NAME} is for people {MINIMUM_AGE} and older, and you must confirm your age to create an account. The
          service is not directed to children under 13, and we do not knowingly collect personal information from
          anyone under {MINIMUM_AGE}. If you believe someone under {MINIMUM_AGE} has given us personal information,
          email <MailLink address={PRIVACY_EMAIL} /> and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <LegalList>
          <li>Passwords are stored as bcrypt hashes, never in readable form.</li>
          <li>Saved employer site passwords and connected account tokens are encrypted.</li>
          <li>Traffic between your browser and {BRAND_NAME} is encrypted with HTTPS.</li>
          <li>Our servers accept no direct connections from the internet. Traffic reaches them only through Cloudflare.</li>
          <li>Backups are encrypted before they leave our servers.</li>
        </LegalList>
        <p>
          No system is perfectly secure. If we learn of a breach that affects your personal information, we will
          notify you as the law requires. To report a vulnerability, email <MailLink address={SECURITY_EMAIL} /> or
          see our <ExternalLink href="/.well-known/security.txt">security.txt</ExternalLink>.
        </p>
      </LegalSection>

      <LegalSection id="data-location" title="Where data is processed">
        <p>
          {BRAND_NAME} runs on servers in the United States, and AI processing uses Google Cloud&apos;s United States
          location. Some service providers may process data in other countries, under their own safeguards and our
          contracts with them.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          When we change this policy, we update the date at the top. If a change is material, we will tell you in
          the app or by email before it takes effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact us">
        <p>
          Privacy questions and requests: <MailLink address={PRIVACY_EMAIL} />.
        </p>
        <p>
          {COMPANY_LEGAL_NAME}
          {COMPANY_POSTAL_ADDRESS ? `, ${COMPANY_POSTAL_ADDRESS}` : ''}
        </p>
        <p>
          See also the <LegalLink to={LEGAL_ROUTES.terms}>Terms of Service</LegalLink>, the{' '}
          <LegalLink to={LEGAL_ROUTES.trust}>Trust Center</LegalLink> and the{' '}
          <LegalLink to="/applypilot/privacy">ApplyPilot extension privacy notice</LegalLink>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
