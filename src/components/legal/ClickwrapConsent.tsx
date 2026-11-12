import { Link } from 'react-router-dom';

import { Checkbox } from '@/components/ui/checkbox';
import { LEGAL_ROUTES, MINIMUM_AGE } from '@/lib/legal';
import { cn } from '@/lib/utils';

const LINK_CLASS =
  'font-medium text-primary underline underline-offset-2 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';

export interface ClickwrapConsentProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Shown under the checkbox and wired to it with aria-describedby. */
  error?: string;
  id?: string;
  className?: string;
}

/**
 * Signup clickwrap: one required checkbox for age and agreement. The links
 * open in a new tab so reading the documents never loses the half-filled
 * form. Structure only; colors come from tokens.
 */
export function ClickwrapConsent({
  checked,
  onCheckedChange,
  disabled = false,
  error,
  id = 'signup-consent',
  className,
}: ClickwrapConsentProps) {
  const errorId = `${id}-error`;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-start gap-3">
        {/* 24px hit area around the 20px box (WCAG 2.2 target size). */}
        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
          <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={(v) => onCheckedChange(v === true)}
            disabled={disabled}
            required
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-5 w-5"
          />
        </span>
        <label htmlFor={id} className="text-sm leading-6 text-foreground">
          I am at least {MINIMUM_AGE} years old and agree to the{' '}
          <Link to={LEGAL_ROUTES.terms} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            Terms of Service
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
          . I have read the{' '}
          <Link to={LEGAL_ROUTES.privacy} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            Privacy Policy
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
          .
        </label>
      </div>
      {error && (
        <p id={errorId} className="pl-9 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default ClickwrapConsent;
