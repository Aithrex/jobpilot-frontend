import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

import { LEGAL_ROUTES } from '@/lib/legal';
import { cn } from '@/lib/utils';

export interface ImmigrationNoticeProps {
  /**
   * `matching`: the work authorization question (onboarding, settings).
   * `timeline`: the visa timeline form, which also powers deadline reminders.
   */
  purpose?: 'matching' | 'timeline';
  /**
   * Inside a flow that must not be navigated away from (the onboarding
   * dialog): "Settings" is plain text and the policy opens in a new tab.
   */
  inFlow?: boolean;
  className?: string;
}

const LINK_CLASS = 'font-medium text-primary underline underline-offset-4 hover:text-primary-hover';

/**
 * Notice at collection for immigration status, which state privacy laws
 * treat as sensitive personal information. Rendered beside every field that
 * asks for visa or work authorization. Saving a status records consent
 * (`apiService.recordImmigrationConsent`); "Prefer not to say" records none.
 */
export function ImmigrationNotice({
  purpose = 'matching',
  inFlow = false,
  className,
}: ImmigrationNoticeProps) {
  const policyHref = `${LEGAL_ROUTES.privacy}#sensitive-information`;
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground',
        className,
      )}
      data-testid="immigration-notice"
    >
      <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {purpose === 'timeline'
          ? 'Used only to match you with employers that sponsor and to build your visa timeline. '
          : 'Used only to match you with employers that sponsor. '}
        You can remove it anytime in{' '}
        {inFlow ? (
          'Settings'
        ) : (
          <Link to={LEGAL_ROUTES.settingsPrivacy} className={LINK_CLASS}>
            Settings
          </Link>
        )}
        .{' '}
        {inFlow ? (
          <a href={policyHref} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
            How we handle it<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <Link to={policyHref} className={LINK_CLASS}>
            How we handle it
          </Link>
        )}
      </span>
    </p>
  );
}

export default ImmigrationNotice;
