import { Link } from 'react-router-dom';

import { LEGAL_ROUTES } from '@/lib/legal';
import { cn } from '@/lib/utils';

const LINK_CLASS =
  'font-medium text-foreground underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';

/**
 * The agreement line under "Continue with Google" (and any other sign-in
 * provider) on both sign-in and sign-up: a provider sign-in can create an
 * account, so the person sees the terms before they press it.
 */
export function OAuthAgreement({ className }: { className?: string }) {
  return (
    <p className={cn('text-center text-sm leading-relaxed text-muted-foreground', className)}>
      By continuing, you agree to the{' '}
      <Link to={LEGAL_ROUTES.terms} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        Terms of Service
        <span className="sr-only"> (opens in a new tab)</span>
      </Link>{' '}
      and acknowledge the{' '}
      <Link to={LEGAL_ROUTES.privacy} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
        Privacy Policy
        <span className="sr-only"> (opens in a new tab)</span>
      </Link>
      .
    </p>
  );
}

export default OAuthAgreement;
