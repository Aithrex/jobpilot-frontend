import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { GuestChallengeProviderConfig } from '@/lib/guest';
import type { GuestChallenge } from '@/hooks/useGuestFlow';

/**
 * Anti-abuse challenge surface. A guest write can answer
 * `429 { error:"challenge_required", provider, challenge_id }`; the guest
 * solves the provider widget here, the hook redeems it at
 * POST /api/resume/guest/challenge/verify, then retries the original call.
 *
 * Honesty rules:
 * - the hook only opens this for a provider we can genuinely render (known id
 *  + configured publishable site key). There is no fake widget and no fake
 *  "verified" state;
 * - if the provider script fails to load or the widget errors, we say so and
 *  offer "Try again shortly", which closes back to the conversion CTA;
 * - verify failures are 400 with a code (expired / already used / mismatch /
 *  rejected). They are NEVER 401 and can never affect a session.
 *
 * When no provider is configured server-side the 429 never fires and this
 * component never mounts.
 */

interface CaptchaApi {
  render: (el: HTMLElement, params: Record<string, unknown>) => unknown;
  reset?: (widgetId?: unknown) => void;
}

const scriptPromises = new Map<string, Promise<void>>();

/** Inject the provider script once per src and resolve when its global API is
 * actually usable. Rejects on load failure or timeout - the caller then shows
 * the honest fallback instead of an empty box. */
function loadProvider(config: GuestChallengeProviderConfig): Promise<void> {
  const key = config.scriptSrc;
  const existing = scriptPromises.get(key);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
  const ready = () => {
  const started = Date.now();
  const tick = () => {
  const api = (window as unknown as Record<string, CaptchaApi | undefined>)[
  config.globalName
  ];
  if (api && typeof api.render === 'function') {
  resolve();
  return;
  }
  if (Date.now() - started > 10000) {
  reject(new Error('challenge script did not initialize'));
  return;
  }
  window.setTimeout(tick, 50);
  };
  tick();
  };

  const found = document.querySelector<HTMLScriptElement>(
  `script[src="${key}"]`,
  );
  if (found) {
  ready();
  return;
  }
  const script = document.createElement('script');
  script.src = key;
  script.async = true;
  script.defer = true;
  script.onload = ready;
  script.onerror = () => reject(new Error('challenge script failed to load'));
  document.head.appendChild(script);
  });

  // A failed load must not be cached forever - a later attempt may succeed.
  promise.catch(() => scriptPromises.delete(key));
  scriptPromises.set(key, promise);
  return promise;
}

function ChallengeWidget({
  provider,
  onSolve,
  onUnavailable,
}: {
  provider: GuestChallengeProviderConfig;
  onSolve: (solution: string) => void;
  onUnavailable: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  let cancelled = false;
  setLoading(true);
  loadProvider(provider)
  .then(() => {
  if (cancelled || !hostRef.current) return;
  const api = (window as unknown as Record<string, CaptchaApi | undefined>)[
  provider.globalName
  ];
  if (!api) {
  onUnavailable();
  return;
  }
  hostRef.current.innerHTML = '';
  api.render(hostRef.current, {
  sitekey: provider.siteKey,
  callback: (token: string) => {
  if (!cancelled && token) onSolve(token);
  },
  'error-callback': () => {
  if (!cancelled) onUnavailable();
  },
  'expired-callback': () => {
  if (!cancelled) onUnavailable();
  },
  });
  setLoading(false);
  })
  .catch(() => {
  if (!cancelled) onUnavailable();
  });
  return () => {
  cancelled = true;
  };
  }, [provider, onSolve, onUnavailable]);

  return (
  <div className="min-h-[78px]">
  {loading && (
  <p className="flex items-center gap-2 text-sm text-muted-foreground">
  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
  Loading the verification...
  </p>
  )}
  <div ref={hostRef} />
  </div>
  );
}

export function GuestChallengeDialog({
  challenge,
  error,
  verifying,
  onSolve,
  onDismiss,
}: {
  challenge: GuestChallenge | null;
  error: string | null;
  verifying: boolean;
  onSolve: (solution: string) => void;
  onDismiss: () => void;
}) {
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
  setUnavailable(false);
  }, [challenge?.challengeId]);

  if (!challenge) return null;

  return (
  <Dialog open onOpenChange={(open) => !open && onDismiss()}>
  <DialogContent className="sm:max-w-md">
  <DialogHeader>
  <DialogTitle className="flex items-center gap-2">
  <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
  Quick verification
  </DialogTitle>
  <DialogDescription>
  Traffic from your network tripped our anti-abuse checks. Complete this
  check and we will pick up exactly where you left off. Nothing you have
  done is lost.
  </DialogDescription>
  </DialogHeader>

  {unavailable ? (
  <p className="text-sm text-muted-foreground" role="status">
  We could not load the verification right now. Please try again shortly,
  or create a free account to keep going.
  </p>
  ) : (
  <ChallengeWidget
  provider={challenge.provider}
  onSolve={onSolve}
  onUnavailable={() => setUnavailable(true)}
  />
  )}

  {error && (
  <p className="text-sm text-warning" role="status">
  {error}
  </p>
  )}

  <div className="flex items-center justify-between gap-3">
  <p className="text-xs text-muted-foreground" role="status">
  {verifying ? 'Checking your verification...' : ''}
  </p>
  <Button variant="outline" size="sm" onClick={onDismiss} disabled={verifying}>
  Not now
  </Button>
  </div>
  </DialogContent>
  </Dialog>
  );
}
