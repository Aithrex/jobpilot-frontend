import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Accessibility as AccessibilityIcon,
  BadgeCheck,
  Bot,
  FileCode2,
  Lock,
  MailCheck,
  MailX,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';

import { PublicPageShell } from '@/components/landing/PublicPageShell';
import { BeforeYouBegin } from '@/components/landing/BeforeYouBegin';
import { TrustClose } from '@/components/landing/TrustClose';
import { LEGAL_LINK_CLASS } from '@/components/legal/LegalDocument';
import { BRAND_NAME, LAST_UPDATED, LEGAL_ROUTES, MINIMUM_AGE, SECURITY_EMAIL } from '@/lib/legal';

/**
 * `/trust`: the public Trust Center.
 *
 * Every card states something the product ENFORCES today and links to the
 * page or file that says so in full. Nothing here is a certification, an
 * audit result, a count or a promise about outcomes, and the last card says
 * plainly which of those we do not have.
 *
 * The decision FAQ (`BeforeYouBegin`) follows as a section, so every inbound
 * link to "Before you begin" still lands on its answers.
 */

interface TrustItem {
  title: string;
  icon: typeof ShieldCheck;
  body: ReactNode;
  /** : a plain anchor (in-page hash or a static file), not a route. */
  link: { label: string; to: string; external?: boolean };
}

const ITEMS: readonly TrustItem[] = [
  {
    title: 'We do not sell or share your data',
    icon: ShieldCheck,
    body: 'No sale, no sharing for advertising, no advertising cookies or pixels. Browsers that send Global Privacy Control do not load our performance monitoring at all.',
    link: { label: 'No sale or sharing', to: `${LEGAL_ROUTES.privacy}#no-sale-or-sharing` },
  },
  {
    title: 'Your data, your controls',
    icon: SlidersHorizontal,
    body: 'Download everything in your account as JSON, choose which email you get, withdraw consent and delete your account, all from Settings.',
    link: { label: 'Your Privacy Choices', to: LEGAL_ROUTES.choices },
  },
  {
    title: 'Sensitive data needs your consent',
    icon: UserCheck,
    body: 'Immigration status is optional, comes with a notice where you enter it, and is used only to match you with employers that sponsor. Withdrawing consent erases it.',
    link: { label: 'Sensitive information', to: `${LEGAL_ROUTES.privacy}#sensitive-information` },
  },
  {
    title: 'AI that works from your facts',
    icon: Bot,
    body: `${BRAND_NAME} uses Google Vertex AI in the United States. Contact details are masked before text is sent, your content is not used to train models, and generated resumes are checked against your own. Every draft is yours to review.`,
    link: { label: 'How AI is used', to: `${LEGAL_ROUTES.privacy}#ai-processing` },
  },
  {
    title: 'Gmail is read only and Limited Use',
    icon: MailCheck,
    body: 'Connecting Gmail is optional. Access is read only, used only to update your application status, never for advertising, and you can disconnect at any time.',
    link: { label: 'Google user data', to: `${LEGAL_ROUTES.privacy}#google-user-data` },
  },
  {
    title: 'Security fundamentals',
    icon: Lock,
    body: 'Passwords are bcrypt hashed. Saved employer logins, connected account tokens and backups are encrypted. Our servers accept no direct connections from the internet.',
    link: { label: 'Report a vulnerability', to: '#vulnerability-disclosure', external: true },
  },
  {
    title: 'Unsubscribe without signing in',
    icon: MailX,
    body: 'Digest and promotional email carries an unsubscribe link that works without an account login. Opening the link never unsubscribes you by accident; one press does.',
    link: { label: 'Manage email', to: LEGAL_ROUTES.choices },
  },
  {
    title: 'Accessible by design',
    icon: AccessibilityIcon,
    body: 'We build to WCAG 2.2 Level AA, run automated axe-core checks in our test suite, and publish the limitations we know about.',
    link: { label: 'Accessibility statement', to: LEGAL_ROUTES.accessibility },
  },
  {
    title: `For adults, ${MINIMUM_AGE} and older`,
    icon: BadgeCheck,
    body: `You confirm you are at least ${MINIMUM_AGE} when you sign up. ${BRAND_NAME} is not directed to children.`,
    link: { label: 'Eligibility', to: `${LEGAL_ROUTES.terms}#eligibility` },
  },
  {
    title: 'Open source, credited',
    icon: FileCode2,
    body: 'Every open source package and font we ship is listed with its license.',
    link: { label: 'Open source licenses', to: LEGAL_ROUTES.licenses },
  },
];

function TrustCard({ item }: { item: TrustItem }) {
  const Icon = item.icon;
  return (
    <li className="flex h-full flex-col rounded-xl border border-border bg-card p-5 text-card-foreground">
      <Icon aria-hidden className="h-5 w-5 text-primary" />
      <h3 className="mt-3 font-display text-base font-bold text-foreground">{item.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
      <p className="mt-4 text-sm">
        {item.link.external ? (
          <a href={item.link.to} className={LEGAL_LINK_CLASS}>
            {item.link.label}
          </a>
        ) : (
          <Link to={item.link.to} className={LEGAL_LINK_CLASS}>
            {item.link.label}
          </Link>
        )}
      </p>
    </li>
  );
}

export default function Trust() {
  return (
    <PublicPageShell>
      <section aria-labelledby="trust-heading" className="mx-auto w-full max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trust Center</p>
        <h1
          id="trust-heading"
          className="mt-3 max-w-3xl text-balance font-display text-3xl font-extrabold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl"
        >
          What {BRAND_NAME} does with your data, and what it never does.
        </h1>
        <p className="mt-4 max-w-3xl text-pretty text-base leading-relaxed text-foreground">
          Each point below is how the product works today, with a link to the full detail. Last updated:{' '}
          {LAST_UPDATED}.
        </p>

        <h2 className="sr-only">What {BRAND_NAME} enforces today</h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <TrustCard key={item.title} item={item} />
          ))}
        </ul>

        <div className="mt-10 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="font-display text-base font-bold text-foreground">What we do not claim</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {BRAND_NAME} has not completed an independent security audit or a certification such as SOC 2 or ISO
            27001, and we do not guarantee interviews, offers or any other result. If that changes, it will be stated
            here first.
          </p>
        </div>

        <div
          id="vulnerability-disclosure"
          className="mt-6 scroll-mt-20 rounded-xl border border-border bg-card p-5 text-card-foreground"
        >
          <h2 className="font-display text-base font-bold text-foreground">Reporting a vulnerability</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            Email <a className={LEGAL_LINK_CLASS} href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a> with the
            steps to reproduce what you found. Please test only against your own account, do not access or change
            other people&apos;s data, do not degrade the service, and give us a reasonable chance to fix the issue
            before you disclose it. We will acknowledge your report and keep you updated. Our contact details are
            also published in <a className={LEGAL_LINK_CLASS} href="/.well-known/security.txt">security.txt</a>.
          </p>
        </div>
      </section>

      <BeforeYouBegin />
      <TrustClose fallbackHref="/register" fallbackLabel="Create free account" />
    </PublicPageShell>
  );
}
