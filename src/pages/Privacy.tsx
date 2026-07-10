// General privacy policy for the Aspirely platform (aspirely.me). Served at
// /privacy and linked from the site footer. The extension-specific policy
// lives separately at /applypilot/privacy.

import { Link } from 'react-router-dom';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-control bg-primary font-bold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Aspirely — Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: July 10, 2026</p>
          </div>
        </div>

        <p className="mt-6 leading-relaxed text-muted-foreground">
          Aspirely ("we", "us", the "service") is an AI career platform that helps you build and
          tailor your résumé, discover jobs, and manage your applications. This policy explains what
          data we collect, how we use it, who we share it with, and the choices you have. We keep the
          service focused on your goals — we do not sell your data.
        </p>

        <Section title="Information we collect">
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Account information</strong> — your email address and an encrypted (hashed) password, or the profile details returned by a sign-in provider you choose to use (see "Connected accounts").</li>
            <li><strong>Career content you provide</strong> — résumés, work history, education, projects, skills, links, and the answers you enter for job applications.</li>
            <li><strong>Usage data</strong> — the jobs you save, tailoring and scoring you request, and basic technical logs (e.g. approximate location derived from IP, for security and rate-limiting).</li>
          </ul>
        </Section>

        <Section title="How we use your information">
          <ul className="list-disc space-y-1 pl-6">
            <li>To provide the core features — parsing and tailoring your résumé, scoring it against a job, and generating application answers.</li>
            <li>To authenticate you and keep your account secure.</li>
            <li>To enforce plan limits and prevent abuse.</li>
            <li>To improve the reliability and quality of the service.</li>
          </ul>
          <p>We do <strong>not</strong> use your résumé content to train third-party foundation models, and our AI is instructed never to fabricate facts about you.</p>
        </Section>

        <Section title="Connected accounts (optional integrations)">
          <p>
            You may optionally connect third-party accounts. Each connection is initiated by you, is
            limited to the narrowest scope needed, and can be disconnected at any time. Access tokens
            are <strong>encrypted at rest</strong>.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Sign in with Google</strong> — if you sign in with Google, we receive your name, email address, and profile basics (via OpenID Connect) solely to create and authenticate your account. We do not access any other Google data.</li>
            <li><strong>Connect GitHub</strong> — with your authorization, we read your public profile and public repositories to help enrich your résumé and portfolio. We do not modify your repositories.</li>
            <li><strong>Connect LinkedIn</strong> — with your authorization, we read your basic profile and, only when you explicitly ask, publish a post on your behalf (the <code>w_member_social</code> permission). We never post without an action you take.</li>
            <li><strong>Gmail (read-only)</strong> — where offered and enabled, and only with your consent, we read job-application-related emails to surface application updates. We request read-only access and never send email as you.</li>
          </ul>
          <p>Disconnecting an integration removes our stored access tokens for it.</p>
        </Section>

        <Section title="Google user data & Limited Use">
          <p>
            When you connect Gmail, Aspirely requests <strong>read-only</strong> access
            (<code>gmail.readonly</code>) for the sole purpose of detecting job-application-related
            emails and surfacing application status updates to you inside the app.
          </p>
          <p>
            Aspirely's use and transfer to any other app of information received from Google APIs
            will adhere to the{' '}
            <a
              className="text-primary hover:underline"
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Specifically, Aspirely does not:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>transfer or sell your Gmail data to third parties for advertising, resale, or any unrelated purpose;</li>
            <li>use your Gmail data for advertising;</li>
            <li>allow humans to read your Gmail data, except with your explicit consent for specific messages, to comply with applicable law, for security purposes (e.g. investigating abuse), or where the data has been aggregated and anonymized;</li>
            <li>use your Gmail data to train generalized or third-party AI/ML models.</li>
          </ul>
          <p>You can disconnect Gmail at any time, which deletes our stored Google tokens for your account.</p>
        </Section>

        <Section title="How your information is shared">
          <p>We share data only with the service providers that make Aspirely work, under confidentiality obligations:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><strong>Cloud hosting &amp; storage</strong> (Amazon Web Services) — to run the application and store your files and data.</li>
            <li><strong>AI processing</strong> (Anthropic Claude on Amazon Bedrock) — the specific text you submit for tailoring, scoring, or answer-generation is processed to produce your result and is not used to train the model.</li>
          </ul>
          <p>We do not sell your personal information, and we do not share it for advertising.</p>
        </Section>

        <Section title="Data retention & security">
          <p>
            We retain your account and career content while your account is active. Passwords are
            hashed, integration tokens are encrypted at rest, and data is transmitted over encrypted
            connections. You can delete your data by deleting your account (see below).
          </p>
        </Section>

        <Section title="Your choices & rights">
          <ul className="list-disc space-y-1 pl-6">
            <li>Access, correct, or export the career content you have provided.</li>
            <li>Disconnect any connected account at any time from your settings.</li>
            <li>Request deletion of your account and associated data by contacting us.</li>
          </ul>
        </Section>

        <Section title="Children">
          <p>Aspirely is not intended for children under 16, and we do not knowingly collect their data.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>We may update this policy as the service evolves. Material changes will be reflected by the "Last updated" date above.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or requests about this policy or your data:{' '}
            <a className="text-primary hover:underline" href="mailto:harshith@aithrex.tech">harshith@aithrex.tech</a>.
          </p>
          <p>
            See also our{' '}
            <Link className="text-primary hover:underline" to="/applypilot/privacy">ApplyPilot extension privacy policy</Link>.
          </p>
        </Section>
      </div>
    </div>
  );
}
