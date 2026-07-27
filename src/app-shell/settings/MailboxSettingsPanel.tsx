import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BadgeCheck, Check, Copy, Loader2, Mail, MailCheck, MailX, RefreshCw, ShieldQuestion,
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PanelError } from '@/app-shell/pages/today/primitives';
import type { Mailbox } from '@/types/mailbox';

interface MailboxData {
  disabled: boolean;
  mailbox: Mailbox | null;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
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
      aria-label="Copy address"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

/**
 * Managed-mailbox settings (`/app/settings/mailbox`). Shows the private
 * application address (copy), the provision CTA (with a privacy-alias option),
 * a pause toggle, rotate (confirmed - rotating changes the address forever),
 * and forwarding (on/off + destination + verification state). All writes go
 * through apiService; a 404 hides the surface (feature flag off).
 */
export default function MailboxSettingsPanel() {
  const queryClient = useQueryClient();
  const [privacyAlias, setPrivacyAlias] = useState(false);
  const [busy, setBusy] = useState<null | 'provision' | 'pause' | 'rotate' | 'forwarding'>(null);
  const [forwardTo, setForwardTo] = useState('');

  const mailboxQuery = useQuery<MailboxData>({
    queryKey: ['mailbox', 'settings'],
    queryFn: async () => {
      const res = await apiService.getMailbox();
      if (res.status === 404) return { disabled: true, mailbox: null };
      if (res.error) throw new Error(res.error);
      return { disabled: false, mailbox: res.data ?? null };
    },
  });

  const mailbox = mailboxQuery.data?.mailbox ?? null;

  // Seed the forward_to field from the loaded mailbox (once per change).
  useEffect(() => {
    if (mailbox?.forward_to) setForwardTo(mailbox.forward_to);
  }, [mailbox?.forward_to]);

  const applyMailbox = (m?: Mailbox) => {
    if (m) queryClient.setQueryData<MailboxData>(['mailbox', 'settings'], { disabled: false, mailbox: m });
    // Keep the inbox badge + list in sync.
    queryClient.invalidateQueries({ queryKey: ['mailbox'] });
  };

  const provision = async () => {
    setBusy('provision');
    const res = await apiService.provisionMailbox({ privacy_alias: privacyAlias });
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't create your mailbox", { description: res.error });
      return;
    }
    applyMailbox(res.data);
    toast.success('Your managed address is ready');
  };

  const togglePause = async (next: boolean) => {
    setBusy('pause');
    const res = await apiService.pauseMailbox(next);
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't update the mailbox", { description: res.error });
      return;
    }
    applyMailbox(res.data);
  };

  const rotate = async () => {
    setBusy('rotate');
    const res = await apiService.rotateMailbox();
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't rotate your address", { description: res.error });
      return;
    }
    applyMailbox(res.data);
    toast.success('New address minted. The old one is retired.');
  };

  const saveForwarding = async (enabled: boolean) => {
    setBusy('forwarding');
    const res = await apiService.setForwarding({
      enabled,
      forward_to: forwardTo.trim() || undefined,
    });
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't update forwarding", { description: res.error });
      return;
    }
    applyMailbox(res.data);
    if (enabled && res.data && !res.data.forward_to_verified) {
      toast.success('Verification email sent', {
        description: 'Open the link we sent to your inbox to finish.',
      });
    }
  };

  if (mailboxQuery.isLoading) {
    return <div className="h-40 animate-pulse rounded-container bg-muted" />;
  }
  if (mailboxQuery.isError) {
    return <PanelError title="Couldn't load your mailbox" onRetry={() => mailboxQuery.refetch()} />;
  }
  if (mailboxQuery.data?.disabled) {
    return (
      <div className="rounded-container border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
        <MailX className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Managed mailbox isn't available yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Your private application address turns on with Auto-Apply.
        </p>
      </div>
    );
  }

  // Not provisioned -> CTA.
  if (!mailbox?.provisioned) {
    return (
      <div className="rounded-container border border-border bg-card p-6 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Mail className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Managed application mailbox</h2>
            <p className="text-xs text-muted-foreground">
              A private address recruiters reply to - replies land in your Inbox.
            </p>
          </div>
        </div>
        <label className="mb-4 flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={privacyAlias}
            onChange={(e) => setPrivacyAlias(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span>
            Use a privacy alias (an opaque <code className="font-mono">career.xxxxxx@</code> address)
            instead of your name.
          </span>
        </label>
        <Button className="gap-1.5" disabled={busy === 'provision'} onClick={provision}>
          {busy === 'provision' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Create my address
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Address + rotate */}
      <section className="rounded-container border border-border bg-card p-5 shadow-soft">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Your managed address</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Applications sent for you use this address; recruiter replies appear in your Inbox.
        </p>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
          <code className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
            {mailbox.address}
          </code>
          {mailbox.address && <CopyButton value={mailbox.address} />}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Pause mailbox</p>
            <p className="text-xs text-muted-foreground">Stop accepting and acting on new mail.</p>
          </div>
          <Switch
            checked={!!mailbox.paused}
            disabled={busy === 'pause'}
            onCheckedChange={togglePause}
            aria-label="Pause mailbox"
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-sm font-medium text-foreground">Rotate address</p>
            <p className="text-xs text-muted-foreground">
              Mint a new address and retire this one. This cannot be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={busy === 'rotate'}>
                {busy === 'rotate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Rotate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate your managed address?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your current address will be retired and can never be reused. Any recruiter
                  holding the old address will no longer reach you. A brand-new address is minted
                  in its place.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep current</AlertDialogCancel>
                <AlertDialogAction onClick={rotate}>Rotate address</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      {/* Forwarding */}
      <section className="rounded-container border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Forward to my inbox</h2>
            <p className="text-xs text-muted-foreground">
              Also send a copy of important updates to your own email.
            </p>
          </div>
          <Switch
            checked={!!mailbox.forwarding_enabled}
            disabled={busy === 'forwarding'}
            onCheckedChange={(v) => saveForwarding(v)}
            aria-label="Enable forwarding"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="forward-to" className="sr-only">
            Forwarding destination email
          </label>
          <Input
            id="forward-to"
            type="email"
            value={forwardTo}
            onChange={(e) => setForwardTo(e.target.value)}
            placeholder="you@example.com"
            className="h-9 min-w-0 flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-9 shrink-0 gap-1.5"
            disabled={busy === 'forwarding' || !forwardTo.trim()}
            onClick={() => saveForwarding(mailbox.forwarding_enabled)}
          >
            {busy === 'forwarding' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            Save
          </Button>
        </div>

        {mailbox.forward_to && (
          <div className="mt-3">
            {mailbox.forward_to_verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified: {mailbox.forward_to}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning">
                <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                Verification sent to {mailbox.forward_to} - check your inbox
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
