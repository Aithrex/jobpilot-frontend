import { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AuthNoticeVariant = 'error' | 'success' | 'info' | 'rate-limit';

const STYLES: Record<AuthNoticeVariant, string> = {
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-success/30 bg-success/10 text-success',
  info: 'border-primary/25 bg-primary/10 text-foreground',
  'rate-limit': 'border-warning/40 bg-warning/10 text-warning',
};

const ICONS: Record<AuthNoticeVariant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  'rate-limit': Clock,
};

/**
 * Heuristic for the 429 / throttle case. The auth API surfaces failures as a
 * message string (never a 401 logout), so we detect the "slow down" family to
 * render an encouraging amber notice instead of an alarming red one.
 */
export function looksRateLimited(msg?: string | null): boolean {
  if (!msg) return false;
  return /too many|rate.?limit|try again (in|later|after)|slow down|temporarily|throttl/i.test(
    msg,
  );
}

/** Pick the right variant for a raw error string (rate-limit vs. generic error). */
export function errorVariant(msg?: string | null): AuthNoticeVariant {
  return looksRateLimited(msg) ? 'rate-limit' : 'error';
}

/**
 * Inline auth feedback banner. Errors/throttles announce assertively; success
 * and info announce politely. State is carried by icon + text, not colour.
 */
export function AuthNotice({
  variant,
  children,
  className,
}: {
  variant: AuthNoticeVariant;
  children: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[variant];
  const assertive = variant === 'error' || variant === 'rate-limit';
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm',
        STYLES[variant],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
