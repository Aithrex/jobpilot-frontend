// /unsubscribe?t=<token>: the landing page for the unsubscribe link in every
// non-transactional email. Works without signing in.
//
// Opening the page NEVER unsubscribes. Mail security scanners and link
// previewers fetch every URL in a message, so the page only READS which list
// the token is for (GET) and waits for a person to press the button (POST).
// One-click unsubscribe from the mail client itself (RFC 8058) posts straight
// to the backend and does not come through here.

import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailX } from 'lucide-react';

import { LegalDocument, LegalLink, MailLink } from '@/components/legal/LegalDocument';
import { emailListLabel } from '@/components/privacy/privacyFormat';
import { Button } from '@/components/ui/button';
import { apiService } from '@/lib/api';
import { LEGAL_ROUTES, PRIVACY_EMAIL } from '@/lib/legal';

type Phase =
  | { kind: 'missing' }
  | { kind: 'loading' }
  | { kind: 'ready'; list: string }
  | { kind: 'confirming'; list: string }
  | { kind: 'done'; list: string }
  | { kind: 'invalid' }
  | { kind: 'error'; list: string | null; message: string };

function ManageHint() {
  return (
    <p className="text-base leading-relaxed text-foreground">
      You can also choose exactly which email you get in{' '}
      <LegalLink to={LEGAL_ROUTES.settingsPrivacy}>Settings</LegalLink> after you sign in, or write to{' '}
      <MailLink address={PRIVACY_EMAIL} />.
    </p>
  );
}

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = (params.get('t') || '').trim();
  const [phase, setPhase] = useState<Phase>(token ? { kind: 'loading' } : { kind: 'missing' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      setPhase({ kind: 'missing' });
      return;
    }
    let alive = true;
    setPhase({ kind: 'loading' });
    void apiService.getUnsubscribe(token).then((res) => {
      if (!alive) return;
      if (res.data?.list) setPhase({ kind: 'ready', list: res.data.list });
      else if (res.status && res.status < 500 && res.status !== 429) setPhase({ kind: 'invalid' });
      else
        setPhase({
          kind: 'error',
          list: null,
          message: 'We could not check this link just now. Please try again.',
        });
    });
    return () => {
      alive = false;
    };
  }, [token, attempt]);

  const confirm = async (list: string) => {
    setPhase({ kind: 'confirming', list });
    const res = await apiService.confirmUnsubscribe(token);
    if (res.data?.unsubscribed) {
      setPhase({ kind: 'done', list: res.data.list || list });
      return;
    }
    if (res.status === 400 || res.status === 404) {
      setPhase({ kind: 'invalid' });
      return;
    }
    setPhase({
      kind: 'error',
      list,
      message:
        res.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : 'We could not complete that just now. Please try again.',
    });
  };

  let body: ReactNode;
  switch (phase.kind) {
    case 'missing':
      body = (
        <>
          <p className="text-base leading-relaxed text-foreground">
            This unsubscribe link is incomplete. Open the link from the email again, or manage your email another
            way.
          </p>
          <ManageHint />
        </>
      );
      break;
    case 'loading':
      body = (
        <p className="flex items-center gap-2 text-base text-muted-foreground" role="status">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Checking your link...
        </p>
      );
      break;
    case 'ready':
    case 'confirming':
      body = (
        <>
          <p className="text-base leading-relaxed text-foreground">
            You are about to unsubscribe from <strong>{emailListLabel(phase.list)}</strong>. You will stop getting
            these emails right away.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => void confirm(phase.list)}
            disabled={phase.kind === 'confirming'}
          >
            {phase.kind === 'confirming' && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {phase.kind === 'confirming' ? 'Unsubscribing...' : 'Unsubscribe'}
          </Button>
          <ManageHint />
        </>
      );
      break;
    case 'done':
      body = (
        <>
          <p className="flex items-start gap-2 text-base leading-relaxed text-foreground" role="status">
            <CheckCircle2 aria-hidden className="mt-1 h-4 w-4 shrink-0 text-success" />
            <span>
              You are unsubscribed from <strong>{emailListLabel(phase.list)}</strong>. Account and security email,
              such as password resets, still arrives because your account needs it.
            </span>
          </p>
          <ManageHint />
        </>
      );
      break;
    case 'invalid':
      body = (
        <>
          <p className="flex items-start gap-2 text-base leading-relaxed text-foreground" role="alert">
            <MailX aria-hidden className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>We could not verify this unsubscribe link. It may have been copied incompletely.</span>
          </p>
          <ManageHint />
        </>
      );
      break;
    case 'error':
      body = (
        <>
          <p className="text-base leading-relaxed text-foreground" role="alert">
            {phase.message}
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => {
              if (phase.list) void confirm(phase.list);
              else setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
          <ManageHint />
        </>
      );
      break;
  }

  return (
    <LegalDocument eyebrow="Email" title="Unsubscribe">
      <div className="mt-8 max-w-prose space-y-6" aria-live="polite">
        {body}
      </div>
    </LegalDocument>
  );
}
