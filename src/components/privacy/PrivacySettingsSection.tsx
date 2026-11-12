import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { LEGAL_ROUTES } from '@/lib/legal';
import { cn } from '@/lib/utils';
import { DeleteAccountCard } from './DeleteAccountCard';
import { GpcStatus } from './GpcStatus';
import { PrivacyControls } from './PrivacyControls';
import { usePrivacy } from './usePrivacy';

const LINK_CLASS = 'font-medium text-primary underline underline-offset-4 hover:text-primary-hover';

/**
 * Settings: "Privacy and data". Mounted once on the Profile settings page.
 *
 * Export, immigration status consent, email lists, the GPC status and
 * account deletion. Deep links: `#privacy` (this section) and
 * `#delete-account` (the deletion control).
 */
export function PrivacySettingsSection({ className }: { className?: string }) {
  const { hash } = useLocation();
  const { state } = usePrivacy();

  useEffect(() => {
    if (hash !== '#privacy' && hash !== '#delete-account') return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ block: 'start' });
    el.focus({ preventScroll: true });
  }, [hash]);

  return (
    <section
      id="privacy"
      tabIndex={-1}
      aria-labelledby="privacy-settings-heading"
      className={cn(
        'space-y-6 rounded-xl border border-border bg-card p-5 text-card-foreground outline-none sm:p-6',
        className,
      )}
    >
      <header className="space-y-1">
        <h2
          id="privacy-settings-heading"
          className="flex items-center gap-2 font-display text-title-sm text-foreground"
        >
          <ShieldCheck aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
          Privacy and data
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Aspirely does not sell or share your personal information. Read the{' '}
          <Link to={LEGAL_ROUTES.privacy} className={LINK_CLASS}>
            Privacy Policy
          </Link>{' '}
          or see{' '}
          <Link to={LEGAL_ROUTES.choices} className={LINK_CLASS}>
            Your Privacy Choices
          </Link>
          .
        </p>
      </header>

      <GpcStatus server={state?.gpc ?? null} />

      <PrivacyControls />

      <div id="delete-account" tabIndex={-1} className="border-t border-border pt-6 outline-none">
        <DeleteAccountCard />
      </div>
    </section>
  );
}

export default PrivacySettingsSection;
