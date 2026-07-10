import { useEffect, useState } from 'react';
import { apiService } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Provider = 'google' | 'github' | 'linkedin' | 'microsoft' | 'apple';

/** Google is always presented as the primary option; the rest stay gated. */
const SECONDARY_ORDER: Provider[] = ['github', 'linkedin', 'microsoft', 'apple'];
const LABEL: Record<Provider, string> = {
  google: 'Google',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  microsoft: 'Microsoft',
  apple: 'Apple',
};

function BrandIcon({ provider }: { provider: Provider }) {
  const cls = 'h-[18px] w-[18px] shrink-0';
  switch (provider) {
    case 'google':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
        </svg>
      );
    case 'github':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 1a11 11 0 0 0-3.48 21.44c.55.1.75-.24.75-.53v-1.87c-3.06.67-3.71-1.47-3.71-1.47-.5-1.27-1.22-1.61-1.22-1.61-1-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.98 1.68 2.57 1.2 3.2.92.1-.71.38-1.2.69-1.47-2.44-.28-5-1.22-5-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.92 0 0 .92-.3 3.02 1.13a10.4 10.4 0 0 1 5.5 0c2.1-1.43 3.02-1.13 3.02-1.13.6 1.52.22 2.64.11 2.92.7.77 1.13 1.75 1.13 2.95 0 4.22-2.57 5.15-5.02 5.42.39.34.74 1.01.74 2.04v3.02c0 .29.2.64.76.53A11 11 0 0 0 12 1Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="#0A66C2" aria-hidden>
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.75v20.5C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.75V1.75C24 .78 23.2 0 22.22 0Z" />
        </svg>
      );
    case 'microsoft':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden>
          <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
          <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
          <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
          <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
        </svg>
      );
    case 'apple':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16.37 12.78c.03 3.27 2.87 4.35 2.9 4.37-.02.08-.45 1.55-1.49 3.07-.9 1.31-1.83 2.62-3.3 2.65-1.44.03-1.9-.85-3.55-.85-1.64 0-2.16.82-3.52.88-1.42.05-2.5-1.42-3.41-2.73C2.15 17.49.74 12.7 2.62 9.47c.93-1.6 2.6-2.62 4.4-2.64 1.39-.03 2.7.93 3.55.93.85 0 2.44-1.15 4.11-.98.7.03 2.66.28 3.92 2.13-.1.06-2.34 1.37-2.23 4.07ZM13.7 4.7c.75-.91 1.26-2.17 1.12-3.43-1.08.04-2.39.72-3.17 1.63-.7.8-1.31 2.09-1.15 3.32 1.2.1 2.44-.61 3.2-1.52Z" />
        </svg>
      );
  }
}

interface Props {
  /** Verb shown on buttons: "Continue with" (default) / "Sign in with". */
  verb?: string;
}

export function SocialAuthButtons({ verb = 'Continue with' }: Props) {
  // `null` = we haven't heard back yet (unknown), array = the configured set.
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [pending, setPending] = useState<Provider | null>(null);

  useEffect(() => {
    let alive = true;
    apiService.getOAuthProviders().then((res) => {
      if (!alive) return;
      const list = (res.data?.providers || []).filter((p): p is Provider =>
        (['google', ...SECONDARY_ORDER] as string[]).includes(p),
      );
      setProviders(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Google is configured only if the backend advertised it. `null` (still
  // loading) is treated as "attempt it" — the flow surfaces any real error.
  const googleConfigured = providers === null ? null : providers.includes('google');
  const others = providers ? SECONDARY_ORDER.filter((p) => providers.includes(p)) : [];

  const startProvider = async (provider: Provider) => {
    setPending(provider);
    const res = await apiService.beginSocialAuth(provider, { redirect: true });
    // On success the browser is already navigating to the provider.
    return res;
  };

  const onGoogle = async () => {
    // Not configured yet → be honest, never fake success or throw a scary error.
    if (googleConfigured === false) {
      toast.info('Google sign-in is being set up', {
        description: 'It’s almost ready — continue with your email for now.',
      });
      return;
    }
    const res = await startProvider('google');
    if (res.error) {
      setPending(null);
      toast.info('Google sign-in is being set up', {
        description: res.error || 'It’s almost ready — continue with your email for now.',
      });
    }
  };

  const onOther = async (provider: Provider) => {
    const res = await startProvider(provider);
    if (res.error) {
      setPending(null);
      toast.error('Could not start sign-in', { description: res.error });
    }
  };

  const busy = pending !== null;

  return (
    <div className="space-y-4">
      {/* PRIMARY — Google is always the obvious first choice. */}
      <button
        type="button"
        onClick={onGoogle}
        disabled={busy}
        aria-busy={pending === 'google'}
        className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-soft transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
      >
        {pending === 'google' ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden />
        ) : (
          <BrandIcon provider="google" />
        )}
        <span>{verb} Google</span>
      </button>

      {/* SECONDARY — only the providers the backend actually advertises. */}
      {others.length > 0 && (
        <div className="grid gap-2.5">
          {others.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onOther(p)}
              disabled={busy}
              aria-busy={pending === p}
              className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-4 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
            >
              {pending === p ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BrandIcon provider={p} />}
              <span>{verb} {LABEL[p]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Divider into the email form below. */}
      <div className="relative py-0.5">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-xs uppercase tracking-wide text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}

export default SocialAuthButtons;
