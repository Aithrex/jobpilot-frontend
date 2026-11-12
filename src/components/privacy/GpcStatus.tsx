import { ShieldCheck, ShieldOff } from 'lucide-react';

import { browserSendsGpc } from '@/lib/legal';
import { cn } from '@/lib/utils';
import type { PrivacyState } from '@/types/privacy';
import { formatPrivacyDate } from './privacyFormat';

export interface GpcStatusProps {
  /** What the server recorded for the signed-in account, when known. */
  server?: PrivacyState['gpc'] | null;
  className?: string;
}

/**
 * Global Privacy Control, as this browser reports it right now.
 *
 * Read from `navigator.globalPrivacyControl` on render, so it is true for this
 * browser only. When the account is known, the server's record (set from the
 * `Sec-GPC` request header) is shown beside it.
 */
export function GpcStatus({ server, className }: GpcStatusProps) {
  const detected = browserSendsGpc();
  const lastSeen = formatPrivacyDate(server?.last_seen_at);
  const Icon = detected ? ShieldCheck : ShieldOff;

  return (
    <div
      className={cn('flex items-start gap-3 rounded-xl border border-border bg-card p-4', className)}
      data-testid="gpc-status"
      data-gpc={detected ? 'on' : 'off'}
    >
      <Icon
        aria-hidden
        className={cn('mt-0.5 h-5 w-5 shrink-0', detected ? 'text-success' : 'text-muted-foreground')}
      />
      <div className="min-w-0 space-y-1 text-sm leading-relaxed">
        <p className="font-semibold text-foreground">
          Global Privacy Control: {detected ? 'detected and honored' : 'not detected in this browser'}
        </p>
        <p className="text-muted-foreground">
          {detected
            ? 'Your browser is asking sites not to sell or share your personal information. Aspirely does neither, and in this browser it also does not load performance monitoring.'
            : 'Aspirely does not sell or share personal information, so you do not need this signal here. If you turn it on in your browser, we also stop loading performance monitoring in that browser.'}
        </p>
        {server?.detected && lastSeen && (
          <p className="text-muted-foreground">We last received the signal on your account on {lastSeen}.</p>
        )}
      </div>
    </div>
  );
}

export default GpcStatus;
