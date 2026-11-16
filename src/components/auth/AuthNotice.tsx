import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AuthNoticeVariant = 'error' | 'success' | 'info' | 'wait';

const ICONS: Record<AuthNoticeVariant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  wait: Clock,
};

/**
 * Inline feedback on a sign-in page. Errors and waits are announced at once;
 * success and info politely. The state is carried by the icon and the words,
 * never by colour alone.
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
  const assertive = variant === 'error' || variant === 'wait';
  return (
    <div
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      data-variant={variant}
      className={cn('pub-auth-notice', className)}
    >
      <Icon className="mt-[0.1875rem] h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** "45 seconds", "1 minute", "12 minutes": a wait, in words. */
export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/**
 * Whole seconds left until `until` (a `Date.now()` timestamp), ticking down
 * to 0. Derived from the clock on every tick, so a throttled background tab
 * comes back with the right number.
 */
export function useSecondsUntil(until: number | null): number {
  const left = () => (until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(left);

  useEffect(() => {
    setSeconds(left());
    if (!until || until <= Date.now()) return;
    const id = window.setInterval(() => {
      const next = left();
      setSeconds(next);
      if (next <= 0) window.clearInterval(id);
    }, 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  return seconds;
}
