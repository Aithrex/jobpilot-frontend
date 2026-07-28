import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, Check, Copy, ExternalLink, Eye, KeyRound, Loader2, ShieldCheck,
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PanelError } from '@/app-shell/pages/today/primitives';
import type { AtsCredential, AtsCredentialSecret } from '@/types/atsCredentials';

/** Copy-to-clipboard, matching MailboxSettingsPanel's button. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 shrink-0 gap-1.5 px-3 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy");
        }
      }}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

function credentialKey(c: AtsCredential) {
  return `${c.ats_family}::${c.tenant}`;
}

function vendorLabel(family: string) {
  if (!family) return 'Employer';
  return family.charAt(0).toUpperCase() + family.slice(1);
}

function employerLabel(c: AtsCredential) {
  if (c.company) return c.company;
  if (!c.tenant) return `${vendorLabel(c.ats_family)} - all employers`;
  return c.tenant.charAt(0).toUpperCase() + c.tenant.slice(1);
}

/**
 * "Employer logins" (`/app/settings/employer-logins`).
 *
 * When an employer's ATS demands a candidate account, JobPilot registers one
 * with the user's managed private alias and a 24-char password it generates and
 * keeps KMS-encrypted. This is where the user gets that login back, so they can
 * sign in to the employer's portal themselves and check status.
 *
 * Security posture, mirrored from the backend and deliberately visible here:
 *   - the LIST never contains a password (metadata only);
 *   - revealing ONE password is an explicit click plus the user's own account
 *     password (fresh re-auth), rate-limited server-side and audited BEFORE the
 *     backend decrypts anything;
 *   - the revealed value lives in component state for this view only - it is
 *     never cached in react-query, never written to storage, and is dropped as
 *     soon as the row is collapsed.
 */
export default function EmployerLoginsPanel() {
  const [openFor, setOpenFor] = useState<AtsCredential | null>(null);
  const [accountPassword, setAccountPassword] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  // Revealed secrets, keyed by row. NEVER persisted anywhere.
  const [secrets, setSecrets] = useState<Record<string, AtsCredentialSecret>>({});

  const query = useQuery<{ disabled: boolean; credentials: AtsCredential[] }>({
    queryKey: ['ats-credentials'],
    // A password must never sit in a cache that outlives the view.
    gcTime: 0,
    queryFn: async () => {
      const res = await apiService.getAtsCredentials();
      if (res.status === 404) return { disabled: true, credentials: [] };
      if (res.error) throw new Error(res.error);
      return { disabled: false, credentials: res.data?.credentials ?? [] };
    },
  });

  const rows = useMemo(() => {
    const all = query.data?.credentials ?? [];
    // The canonical shared record is explained in the header banner instead of
    // being listed as if it were an employer.
    return all.filter((c) => !(c.scope === 'shared' && !c.tenant));
  }, [query.data]);

  const sharedVendors = useMemo(
    () =>
      Array.from(
        new Set(
          (query.data?.credentials ?? [])
            .filter((c) => c.scope === 'shared')
            .map((c) => vendorLabel(c.ats_family)),
        ),
      ),
    [query.data],
  );

  const closeDialog = () => {
    setOpenFor(null);
    setAccountPassword('');
    setRevealError(null);
  };

  const doReveal = async () => {
    if (!openFor || !accountPassword) return;
    setRevealing(true);
    setRevealError(null);
    const res = await apiService.revealAtsCredential({
      ats_family: openFor.ats_family,
      tenant: openFor.tenant,
      password: accountPassword,
    });
    setRevealing(false);
    if (res.error || !res.data) {
      const code = String(
        (res.errorPayload as { error?: string } | undefined)?.error ?? '',
      );
      if (code === 'reauth_unavailable') {
        setRevealError(
          'This account signs in with Google, so there is no JobPilot password to check. Set one with "Forgot password" first.',
        );
      } else if (res.status === 429) {
        setRevealError('Too many attempts. Try again in a few minutes.');
      } else {
        setRevealError(res.error ?? "Couldn't reveal this password.");
      }
      return;
    }
    setSecrets((prev) => ({ ...prev, [credentialKey(openFor)]: res.data! }));
    closeDialog();
  };

  if (query.isLoading) {
    return <div className="h-40 animate-pulse rounded-container bg-muted" />;
  }
  if (query.isError) {
    return (
      <PanelError
        title="Couldn't load your employer logins"
        onRetry={() => query.refetch()}
      />
    );
  }
  if (query.data?.disabled || rows.length === 0) {
    return (
      <div className="rounded-container border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
        <KeyRound className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">No employer logins yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Some employers make you create an account before they'll take an
          application. When that happens we create it for you with your private
          address - and the login shows up here so you can check your status on
          their site yourself.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-container border border-border bg-card p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Logins we created for you
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              We generate a strong password, store it encrypted, and never show it
              until you ask. Revealing one needs your JobPilot password and is
              recorded in your account's audit trail.
              {sharedVendors.length > 0 && (
                <>
                  {' '}
                  {sharedVendors.join(' and ')} uses <strong>one password across
                  all of its employers</strong>, so you only have to remember it
                  once.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <ul className="space-y-3">
        {rows.map((c) => {
          const key = credentialKey(c);
          const secret = secrets[key];
          return (
            <li
              key={key}
              className="rounded-container border border-border bg-card p-5 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <p className="truncate text-sm font-semibold text-foreground">
                      {employerLabel(c)}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {vendorLabel(c.ats_family)}
                    </Badge>
                    {c.scope === 'shared' && (
                      <Badge variant="outline" className="text-[10px]">
                        Shared {vendorLabel(c.ats_family)} password
                      </Badge>
                    )}
                    {c.legacy_per_tenant && (
                      <Badge variant="outline" className="text-[10px]">
                        This employer only
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.legacy_per_tenant
                      ? 'Created before we moved to one shared password, so this employer keeps its own.'
                      : c.scope === 'shared'
                        ? 'Signs in with your shared password for this vendor.'
                        : 'A password unique to this employer.'}
                  </p>
                </div>
                {c.login_url && (
                  <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
                    <a href={c.login_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      Open portal
                    </a>
                  </Button>
                )}
              </div>

              {/* Username - the managed private alias, safe to show. */}
              <div className="mt-3 space-y-2">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Email / username
                  </p>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
                    <code className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {c.username || '-'}
                    </code>
                    {c.username && <CopyButton value={c.username} label="email" />}
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Password
                  </p>
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
                    <code className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {secret ? secret.password : '••••••••••••••••'}
                    </code>
                    {secret ? (
                      <>
                        <CopyButton value={secret.password} label="password" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 shrink-0 px-3 text-xs"
                          onClick={() =>
                            setSecrets((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            })
                          }
                        >
                          Hide
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 gap-1.5 px-3 text-xs"
                        disabled={!c.has_password}
                        onClick={() => {
                          setOpenFor(c);
                          setAccountPassword('');
                          setRevealError(null);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Reveal
                      </Button>
                    )}
                  </div>
                  {!c.has_password && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No password stored for this employer yet.
                    </p>
                  )}
                  {c.pending_ats_reset && (
                    <p className="mt-1 text-xs text-warning">
                      A reset is queued - this password may not work on their site
                      until it completes.
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* One explicit reveal at a time, behind a fresh account-password check. */}
      <Dialog open={!!openFor} onOpenChange={(o) => (o ? null : closeDialog())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reveal this password?</DialogTitle>
            <DialogDescription>
              Confirm it's you. Enter your JobPilot account password - not the
              employer's. We record every reveal.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void doReveal();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ats-reauth-password">JobPilot password</Label>
              <Input
                id="ats-reauth-password"
                type="password"
                autoComplete="current-password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                autoFocus
              />
            </div>
            {revealError && (
              <p role="alert" className="text-xs text-destructive">
                {revealError}
              </p>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={!accountPassword || revealing}>
                {revealing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Reveal password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
