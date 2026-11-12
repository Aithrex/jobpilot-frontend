import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { WORK_AUTHORIZATION_QUERY_KEY } from '@/hooks/useWorkAuthorization';
import { PRIVACY_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';
import { EMAIL_LIST_KEYS, type EmailListKey } from '@/types/privacy';
import { ExportDataButton } from './ExportDataButton';
import { EMAIL_LIST_COPY, formatPrivacyDate } from './privacyFormat';
import { PrivacyRequestError, usePrivacy } from './usePrivacy';

function Row({
  id,
  title,
  description,
  control,
}: {
  id: string;
  title: ReactNode;
  description: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 space-y-1">
        <p id={`${id}-label`} className="text-sm font-medium text-foreground">
          {title}
        </p>
        <div id={`${id}-description`} className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1" aria-label={title}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function errorText(err: unknown): string {
  if (err instanceof PrivacyRequestError && err.status === 404) {
    return 'This control is not available yet. Please try again later.';
  }
  return err instanceof Error && err.message ? err.message : 'We could not save that change.';
}

export interface PrivacyControlsProps {
  className?: string;
}

/**
 * The signed-in privacy controls, shared by Settings and /privacy/choices:
 * immigration status consent, the four email lists, and data export.
 * Assumes a signed-in session; the caller decides what a guest sees.
 */
export function PrivacyControls({ className }: PrivacyControlsProps) {
  const { state, unavailable, isLoading, isError, refetch, update } = usePrivacy(true, {
    refetchOnMount: 'always',
  });
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [pendingEmail, setPendingEmail] = useState<Partial<Record<EmailListKey, boolean>>>({});
  const [consentBusy, setConsentBusy] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);

  const consented = state?.sensitive.immigration_status.consented ?? false;
  const consentedAt = formatPrivacyDate(state?.sensitive.immigration_status.consented_at);

  const setConsent = async (next: boolean) => {
    setConsentBusy(true);
    try {
      await update({ immigration_status_consent: next });
      if (!next) {
        // The server erased the stored answer; drop every cached copy of it.
        await queryClient.invalidateQueries({ queryKey: WORK_AUTHORIZATION_QUERY_KEY });
        await refreshProfile();
        toast.success('Consent withdrawn. Your immigration status has been erased.');
      } else {
        toast.success('Consent recorded.');
      }
    } catch (err) {
      toast.error('We could not update your consent', { description: errorText(err) });
    } finally {
      setConsentBusy(false);
    }
  };

  const setEmail = async (key: EmailListKey, value: boolean) => {
    setPendingEmail((p) => ({ ...p, [key]: value }));
    try {
      await update({ email: { [key]: value } });
    } catch (err) {
      toast.error('We could not update your email settings', { description: errorText(err) });
    } finally {
      setPendingEmail((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    }
  };

  let body: ReactNode;
  if (isLoading) {
    body = (
      <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground" role="status">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        Loading your privacy settings...
      </p>
    );
  } else if (unavailable) {
    body = (
      <p className="py-3 text-sm leading-relaxed text-muted-foreground" role="status">
        Consent and email controls are not available in the app yet. Email{' '}
        <a className="font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${PRIVACY_EMAIL}`}>
          {PRIVACY_EMAIL}
        </a>{' '}
        and we will handle your request.
      </p>
    );
  } else if (isError || !state) {
    body = (
      <div className="flex flex-wrap items-center gap-3 py-3" role="alert">
        <p className="text-sm text-muted-foreground">We could not load your privacy settings.</p>
        <Button type="button" size="sm" variant="outline" onClick={refetch}>
          Try again
        </Button>
      </div>
    );
  } else {
    body = (
      <>
        <Group title="Sensitive information">
          <Row
            id="privacy-immigration"
            title="Immigration and work authorization status"
            description={
              <>
                <p>
                  Used only to match you with employers that sponsor. Withdrawing consent erases the work
                  authorization answer and visa details you saved, and stops their use in matching.
                </p>
                {consented && consentedAt && <p className="mt-1">Consent given on {consentedAt}.</p>}
              </>
            }
            control={
              <Switch
                checked={consented}
                disabled={consentBusy}
                aria-labelledby="privacy-immigration-label"
                aria-describedby="privacy-immigration-description"
                onCheckedChange={(next) => {
                  if (next) void setConsent(true);
                  else setConfirmWithdraw(true);
                }}
              />
            }
          />
        </Group>

        <Group title="Email">
          {EMAIL_LIST_KEYS.map((key) => {
            const copy = EMAIL_LIST_COPY[key];
            const pending = pendingEmail[key];
            const checked = pending ?? state.email[key];
            const id = `privacy-email-${key}`;
            return (
              <Row
                key={key}
                id={id}
                title={copy.label}
                description={copy.description}
                control={
                  <Switch
                    checked={checked}
                    disabled={pending !== undefined}
                    aria-labelledby={`${id}-label`}
                    aria-describedby={`${id}-description`}
                    onCheckedChange={(next) => void setEmail(key, next)}
                  />
                }
              />
            );
          })}
          <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
            Account and security email, such as password resets, is always sent because your account needs it.
          </p>
        </Group>
      </>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {body}

      <Group title="Your data">
        <Row
          id="privacy-export"
          title="Download a copy of your data"
          description="A JSON file of everything in your account. Passwords, sign-in tokens and encryption keys are left out. Up to 5 exports a day."
          control={null}
        />
        <div className="pb-1">
          <ExportDataButton />
        </div>
      </Group>

      <AlertDialog open={confirmWithdraw} onOpenChange={setConfirmWithdraw}>
        <AlertDialogContent solid>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw consent and erase your immigration status?</AlertDialogTitle>
            <AlertDialogDescription>
              Aspirely will erase the work authorization answer and visa details you saved, and stop using them to
              match you with jobs. You can add them again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void setConsent(false)}
            >
              Withdraw and erase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PrivacyControls;
