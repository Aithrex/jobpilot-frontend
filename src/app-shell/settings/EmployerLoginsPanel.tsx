import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2, Check, Copy, ExternalLink, Eye, KeyRound, Loader2, Mail, ShieldCheck,
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
import type {
  AtsCredential, AtsCredentialSecret, AtsReauthMethod, AtsReauthMethods,
} from '@/types/atsCredentials';

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
 *   - revealing ONE password is an explicit click plus a FRESH step-up re-auth,
 *     rate-limited server-side and audited BEFORE the backend decrypts anything;
 *   - the revealed value lives in component state for this view only - it is
 *     never cached in react-query, never written to storage, and is dropped as
 *     soon as the row is collapsed.
 *
 * The step-up factor is whatever the ACCOUNT supports, published by
 * `GET /apply/credentials/reauth-methods`. Google is the primary signup path
 * and those accounts have no JobPilot password at all - demanding one made the
 * reveal permanently unreachable for them. So: password box for a password
 * account (unchanged), emailed one-time code for an OAuth-only account, and the
 * code as a fallback for everyone.
 */
export default function EmployerLoginsPanel() {
  const [openFor, setOpenFor] = useState<AtsCredential | null>(null);
  const [accountPassword, setAccountPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  /** null until the account's methods load, then the factor being used. */
  const [method, setMethod] = useState<AtsReauthMethod | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealNotice, setRevealNotice] = useState<string | null>(null);
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

  // What this account can actually do. Fetched only while the dialog is open,
  // and never cached (gcTime: 0) - it names the user's own address.
  const reauth = useQuery<AtsReauthMethods>({
    queryKey: ['ats-reauth-methods'],
    enabled: !!openFor,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      const res = await apiService.getAtsReauthMethods();
      if (res.error || !res.data) throw new Error(res.error ?? 'unavailable');
      return res.data;
    },
  });

  // Default to the account's preferred factor once we know it. An OAuth-only
  // account never sees a password box it cannot fill.
  useEffect(() => {
    if (!openFor || method) return;
    const first = reauth.data?.methods?.[0];
    if (!first) return;
    setMethod(first);
    // A code is already in flight (dialog reopened, tab reloaded): go straight
    // to the code box rather than burning another send off the user's budget.
    if (first === 'email_code' && reauth.data?.challenge) setCodeSent(true);
  }, [openFor, method, reauth.data]);

  const methods = reauth.data?.methods ?? [];
  const canUsePassword = methods.includes('password');
  const canUseEmailCode = methods.includes('email_code');
  const codeLength = reauth.data?.code_length ?? 6;

  const closeDialog = () => {
    setOpenFor(null);
    setAccountPassword('');
    setEmailCode('');
    setMethod(null);
    setCodeSent(false);
    setSendingCode(false);
    setRevealError(null);
    setRevealNotice(null);
  };

  const switchMethod = (next: AtsReauthMethod) => {
    setMethod(next);
    setRevealError(null);
    setRevealNotice(null);
    if (next === 'password') {
      setEmailCode('');
    } else {
      setAccountPassword('');
      if (reauth.data?.challenge) setCodeSent(true);
    }
  };

  const sendCode = async () => {
    setSendingCode(true);
    setRevealError(null);
    setRevealNotice(null);
    const res = await apiService.sendAtsRevealCode();
    setSendingCode(false);
    if (res.error || !res.data?.sent) {
      const code = String(
        (res.errorPayload as { error?: string } | undefined)?.error ?? '',
      );
      setRevealError(
        code === 'code_send_rate_limited'
          ? 'Too many codes requested. Try again in a few minutes.'
          : code === 'email_unavailable'
            ? "We couldn't send the code right now. Please try again later."
            : (res.error ?? "Couldn't send the code."),
      );
      return;
    }
    setCodeSent(true);
    setEmailCode('');
    setRevealNotice(`Code sent to ${res.data.email_hint}. It expires in ${Math.round(
      (res.data.expires_in_seconds ?? 600) / 60,
    )} minutes.`);
  };

  const doReveal = async () => {
    if (!openFor || !method) return;
    const usingCode = method === 'email_code';
    if (usingCode ? !emailCode : !accountPassword) return;
    setRevealing(true);
    setRevealError(null);
    setRevealNotice(null);
    const res = await apiService.revealAtsCredential({
      ats_family: openFor.ats_family,
      tenant: openFor.tenant,
      ...(usingCode ? { code: emailCode } : { password: accountPassword }),
    });
    setRevealing(false);
    if (res.error || !res.data) {
      const code = String(
        (res.errorPayload as { error?: string } | undefined)?.error ?? '',
      );
      if (code === 'reauth_unavailable') {
        // Shouldn't happen (we branch on the published methods) - but if it
        // does, move the user onto the factor that CAN work instead of dead-ending.
        setMethod('email_code');
        setAccountPassword('');
        setRevealError(
          'This account signs in with a connected provider, so there is no JobPilot password to check. Use an emailed code instead.',
        );
      } else if (code === 'reauth_failed') {
        setRevealError("That password isn't right.");
      } else if (code === 'code_invalid') {
        setRevealError("That code isn't right. Check the email and try again.");
      } else if (code === 'code_expired' || code === 'code_attempts_exceeded') {
        setCodeSent(false);
        setEmailCode('');
        setRevealError('That code is no longer usable. Send yourself a new one.');
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
              until you ask. Revealing one needs a fresh check that it's you -
              your JobPilot password, or a one-time code emailed to you - and is
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
                          setAccountPassword('');
                          setEmailCode('');
                          setMethod(null);
                          setCodeSent(false);
                          setRevealError(null);
                          setRevealNotice(null);
                          setOpenFor(c);
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

      {/* One explicit reveal at a time, behind a fresh step-up check whose
          factor is whatever THIS account supports. */}
      <Dialog open={!!openFor} onOpenChange={(o) => (o ? null : closeDialog())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reveal this password?</DialogTitle>
            <DialogDescription>
              {method === 'email_code'
                ? "Confirm it's you with a one-time code we email you. We record every reveal."
                : "Confirm it's you. Enter your JobPilot account password - not the employer's. We record every reveal."}
            </DialogDescription>
          </DialogHeader>

          {reauth.isLoading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Checking how to verify you...
            </div>
          )}

          {reauth.isError && (
            <p role="alert" className="py-2 text-xs text-destructive">
              We couldn't check how to verify you. Close this and try again.
            </p>
          )}

          {!reauth.isLoading && !reauth.isError && method && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void doReveal();
              }}
            >
              {method === 'password' ? (
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
                  {canUseEmailCode && (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => switchMethod('email_code')}
                    >
                      Email me a code instead
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    We'll email a {codeLength}-digit code to{' '}
                    <strong className="text-foreground">
                      {reauth.data?.email_hint || 'your account email'}
                    </strong>
                    .
                  </p>
                  {!codeSent ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => void sendCode()}
                      disabled={sendingCode}
                    >
                      {sendingCode ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      )}
                      Send me a code
                    </Button>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="ats-reauth-code">Verification code</Label>
                      <Input
                        id="ats-reauth-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={codeLength}
                        placeholder={'0'.repeat(codeLength)}
                        value={emailCode}
                        onChange={(e) =>
                          setEmailCode(e.target.value.replace(/\D/g, '').slice(0, codeLength))
                        }
                        autoFocus
                      />
                      <button
                        type="button"
                        className="text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60"
                        onClick={() => void sendCode()}
                        disabled={sendingCode}
                      >
                        Send a new code
                      </button>
                    </div>
                  )}
                  {canUsePassword && (
                    <button
                      type="button"
                      className="block text-xs font-medium text-primary underline-offset-2 hover:underline"
                      onClick={() => switchMethod('password')}
                    >
                      Use my JobPilot password instead
                    </button>
                  )}
                </div>
              )}

              {revealNotice && (
                <p role="status" className="text-xs text-muted-foreground">
                  {revealNotice}
                </p>
              )}
              {revealError && (
                <p role="alert" className="text-xs text-destructive">
                  {revealError}
                </p>
              )}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    revealing ||
                    (method === 'password'
                      ? !accountPassword
                      : !codeSent || emailCode.length !== codeLength)
                  }
                >
                  {revealing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Reveal password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
