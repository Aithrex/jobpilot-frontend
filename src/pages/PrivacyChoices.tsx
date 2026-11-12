// /privacy/choices: "Your Privacy Choices". Public, so the no sale or sharing
// answer and the GPC status are readable without an account; signed-in
// people also get the live controls shared with Settings.

import { Link, useLocation } from 'react-router-dom';

import {
  LegalDocument,
  LegalLink,
  LegalSection,
  MailLink,
} from '@/components/legal/LegalDocument';
import { GpcStatus } from '@/components/privacy/GpcStatus';
import { PrivacyControls } from '@/components/privacy/PrivacyControls';
import { usePrivacy } from '@/components/privacy/usePrivacy';
import { useAuth } from '@/contexts/AuthContext';
import { BRAND_NAME, LAST_UPDATED, LEGAL_ROUTES, PRIVACY_EMAIL } from '@/lib/legal';

function SignedInChoices() {
  const { state } = usePrivacy();
  return (
    <>
      <LegalSection id="gpc" title="Global Privacy Control">
        <GpcStatus server={state?.gpc ?? null} />
      </LegalSection>
      <LegalSection id="your-controls" title="Your controls">
        <div className="rounded-xl border border-border bg-card p-5 text-card-foreground">
          <PrivacyControls />
        </div>
        <p>
          To delete your account and everything in it, go to{' '}
          <LegalLink to={LEGAL_ROUTES.settingsDelete}>Delete your account</LegalLink> in Settings.
        </p>
      </LegalSection>
    </>
  );
}

function SignedOutChoices() {
  const location = useLocation();
  return (
    <>
      <LegalSection id="gpc" title="Global Privacy Control">
        <GpcStatus />
      </LegalSection>
      <LegalSection id="your-controls" title="Your controls">
        <p>
          Sign in to download your data, manage immigration status consent, choose which email you get, or delete
          your account.
        </p>
        <p>
          <Link
            to="/login"
            state={{ from: location }}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Sign in to manage your choices
          </Link>
        </p>
        <p>
          No account, or cannot sign in? Email <MailLink address={PRIVACY_EMAIL} /> and we will handle your request.
        </p>
      </LegalSection>
    </>
  );
}

export default function PrivacyChoices() {
  const { isAuthenticated, isLoading } = useAuth();
  const signedIn = !isLoading && isAuthenticated;

  return (
    <LegalDocument
      eyebrow="Privacy"
      title="Your Privacy Choices"
      lastUpdated={LAST_UPDATED}
      lede={
        <p>
          {BRAND_NAME} does not sell or share your personal information, and it does not use it for targeted
          advertising. There is nothing to opt out of, and that is true whether or not you have an account.
        </p>
      }
    >
      <LegalSection id="sale-and-sharing" title="Sale and sharing">
        <p>
          We have not sold or shared personal information, as the California Consumer Privacy Act defines those
          terms, and we do not run advertising cookies or pixels. Details are in our{' '}
          <LegalLink to={`${LEGAL_ROUTES.privacy}#no-sale-or-sharing`}>Privacy Policy</LegalLink>.
        </p>
      </LegalSection>

      {signedIn ? <SignedInChoices /> : <SignedOutChoices />}

      <LegalSection id="requests" title="Other requests">
        <p>
          To ask what we hold about you, correct it, or appeal a decision, email <MailLink address={PRIVACY_EMAIL} />.
          The <LegalLink to={`${LEGAL_ROUTES.privacy}#exercise-rights`}>Privacy Policy</LegalLink> explains how we
          verify and answer requests, including requests from an authorized agent.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
