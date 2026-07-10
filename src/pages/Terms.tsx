// Terms of Service for the Aspirely platform (aspirely.me). Served at /terms
// and linked from the site footer. Required as a ToS URL for Google OAuth
// verification and general platform use.

import { Link } from 'react-router-dom';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-control bg-primary font-bold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aspirely — Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: July 10, 2026</p>
          </div>
        </div>

        <p className="mt-6 leading-relaxed text-muted-foreground">
          These Terms of Service ("Terms") govern your access to and use of Aspirely (the "service"),
          an AI career platform operated by Aithrex. By creating an account or using the service, you
          agree to these Terms. If you do not agree, do not use the service.
        </p>

        <Section title="Eligibility & accounts">
          <p>
            You must be at least 16 years old to use Aspirely. You are responsible for the accuracy of
            the information in your account and for keeping your credentials secure. You are responsible
            for all activity under your account.
          </p>
        </Section>

        <Section title="What the service does">
          <p>
            Aspirely helps you build and tailor résumés, discover jobs, and manage applications, using
            AI to draft and score content based on the information you provide. You may optionally
            connect third-party accounts (such as Google, GitHub, or LinkedIn) to enhance these
            features; each connection is governed by the respective provider's terms.
          </p>
        </Section>

        <Section title="AI-generated content & your responsibility">
          <p>
            The service uses AI to generate suggestions, drafts, and scores. AI output may contain
            errors and is provided for your assistance only. <strong>You are solely responsible for
            reviewing, editing, and verifying any content before you submit it</strong> — including on
            job applications and to third parties. Aspirely is not responsible for hiring outcomes.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>submit false, misleading, or unlawful information, or impersonate others;</li>
            <li>attempt to disrupt, reverse-engineer, or gain unauthorized access to the service;</li>
            <li>use the service to violate any law or the rights of others, or to send spam;</li>
            <li>scrape, resell, or misuse the service or another user's data.</li>
          </ul>
        </Section>

        <Section title="Your content">
          <p>
            You retain ownership of the content you provide (résumés, profile data, application
            answers). You grant Aspirely a limited license to process that content solely to operate
            and provide the service to you, as described in our{' '}
            <Link className="text-primary hover:underline" to="/privacy">Privacy Policy</Link>.
          </p>
        </Section>

        <Section title="Plans & billing">
          <p>
            Some features may require a paid plan. Pricing and plan limits are shown in the app. Where
            billing applies, charges are described at the point of purchase; you are responsible for
            applicable fees for the plan you select.
          </p>
        </Section>

        <Section title="Third-party services">
          <p>
            The service integrates with third-party providers (e.g. Google, GitHub, LinkedIn, and cloud
            and AI infrastructure). Your use of those integrations is also subject to those providers'
            terms and policies. Aspirely is not responsible for third-party services.
          </p>
        </Section>

        <Section title="Disclaimers & limitation of liability">
          <p>
            The service is provided "as is" and "as available", without warranties of any kind, whether
            express or implied. To the maximum extent permitted by law, Aithrex will not be liable for
            any indirect, incidental, or consequential damages, or for any lost profits, data, or
            opportunities arising from your use of the service.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using the service and delete your account at any time. We may suspend or
            terminate access if you violate these Terms or to protect the service and its users.
          </p>
        </Section>

        <Section title="Changes to these Terms">
          <p>
            We may update these Terms as the service evolves. Material changes will be reflected by the
            "Last updated" date above; continued use after changes means you accept the updated Terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms:{' '}
            <a className="text-primary hover:underline" href="mailto:harshith@aithrex.tech">harshith@aithrex.tech</a>.
          </p>
        </Section>
      </div>
    </div>
  );
}
