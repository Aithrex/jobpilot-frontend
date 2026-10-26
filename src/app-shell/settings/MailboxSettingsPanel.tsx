import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, Loader2, MailCheck, MailX, RefreshCw } from 'lucide-react';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
 * application address (copy), a pause toggle, rotate (confirmed - rotating
 * changes the address forever), and the forwarding on/off switch.
 *
 * There is deliberately NO "create my address" CTA and NO forward-to input:
 * per AUTOAPPLY_REPAIR_SPEC §6 the backend provisions the mailbox at sign-up and
 * forwards to the registered email by default, so the user is never asked to
 * create a private email or to choose where mail goes. All writes go through
 * apiService; a 404 hides the surface (feature flag off).
 */
export default function MailboxSettingsPanel() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<null | 'pause' | 'rotate' | 'forwarding'>(null);

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

  const applyMailbox = (m?: Mailbox) => {
    if (m) queryClient.setQueryData<MailboxData>(['mailbox', 'settings'], { disabled: false, mailbox: m });
    // Keep the inbox badge + list in sync.
    queryClient.invalidateQueries({ queryKey: ['mailbox'] });
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

  // The destination is always the registered email (set server-side at sign-up),
  // so this only ever flips the switch - we never send a forward_to.
  const saveForwarding = async (enabled: boolean) => {
    setBusy('forwarding');
    const res = await apiService.setForwarding({ enabled });
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't update forwarding", { description: res.error });
      return;
    }
    applyMailbox(res.data);
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
          Your managed application address is not available yet. You can connect Gmail from the application tracker.
        </p>
      </div>
    );
  }

  // Provisioning is automatic (§6): the backend mints the address at sign-up and
  // self-heals on read, so this is only the brief window before that lands - a
  // status line, never a "create my address" prompt.
  if (!mailbox?.provisioned) {
    return (
      <div className="rounded-container border border-border bg-card p-6 text-center shadow-soft">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Setting up your private address</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          We create it for you automatically - refresh in a moment.
        </p>
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
            <h2 className="text-sm font-semibold text-foreground">Heads-up in my inbox</h2>
            <p className="text-xs text-muted-foreground">
              When an employer gets back to you - an interview invite, an assessment, an
              offer or a rejection - we email you a short heads-up with a link. The full
              message stays here in your Inbox, so your personal inbox stays clean.
            </p>
          </div>
          <Switch
            checked={!!mailbox.forwarding_enabled}
            disabled={busy === 'forwarding'}
            onCheckedChange={(v) => saveForwarding(v)}
            aria-label="Enable forwarding"
          />
        </div>

        {mailbox.forward_to && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            {busy === 'forwarding' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <MailCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            )}
            Forwarding to{' '}
            <span className="font-medium text-foreground">{mailbox.forward_to}</span>
          </p>
        )}
      </section>
    </div>
  );
}
