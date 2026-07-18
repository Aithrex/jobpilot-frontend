import { useState } from 'react';
import { Linkedin, ArrowRight, Copy, Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { LinkedinAudit, ConnectStatus } from '@/types/career';

const DOT: Record<string, string> = {
  good: 'bg-success',
  improve: 'bg-warning',
  missing: 'bg-destructive',
};

/** LinkedIn brand blue — intentional brand literal for the mark only; chrome stays tokenized. */
const LINKEDIN_ICON = 'text-[#0a66c2]';

interface LinkedInAuditCardProps {
  connect?: ConnectStatus | null;
  reloadConnect?: () => void;
}

/**
 * LinkedIn self-audit. We don't (and can't) scrape LinkedIn — this builds honest,
 * specific guidance from the user's real résumé + goal, plus a paste-ready headline
 * and About. Helps a student present as a legitimate, well-positioned candidate.
 *
 * The footer adds an optional OAuth "connect & act" capability: once connected,
 * the user can review and post an update to LinkedIn (always human-approved).
 */
export function LinkedInAuditCard({ connect, reloadConnect }: LinkedInAuditCardProps) {
  const [audit, setAudit] = useState<LinkedinAudit | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await apiService.auditLinkedin(url.trim());
      if (r.data?.sections) setAudit(r.data);
      else toast.error(r.error || 'Could not run the audit');
    } catch {
      toast.error('Audit failed. Try again');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };

  if (audit) {
    return (
      <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <Linkedin className={`h-4 w-4 ${LINKEDIN_ICON}`} />
          <h3 className="text-sm font-semibold text-foreground">LinkedIn audit</h3>
          <span className="ml-auto">
            <span className="text-xl font-extrabold tabular-nums text-primary">{audit.score}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/100</span>
          </span>
        </div>

        {audit.headline && (
          <div className="mb-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Suggested headline</span>
              <button
                onClick={() => copy(audit.headline, 'h')}
                aria-label={copied === 'h' ? 'Headline copied' : 'Copy suggested headline'}
                className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copied === 'h' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="text-xs">{audit.headline}</p>
          </div>
        )}

        <div className="space-y-1.5">
          {audit.sections.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT[s.status] || 'bg-muted-foreground'}`} />
              <span>
                <span className="font-medium">{s.name}:</span>{' '}
                <span className="text-muted-foreground">{s.tip}</span>
              </span>
            </div>
          ))}
        </div>

        {audit.about && (
          <button
            onClick={() => copy(audit.about, 'a')}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            {copied === 'a' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy suggested “About”
          </button>
        )}

        <LinkedInConnect connect={connect} reloadConnect={reloadConnect} prefill={audit.headline} />
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Linkedin className={`h-4 w-4 ${LINKEDIN_ICON}`} /> Polish your LinkedIn
      </div>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Get a personalized audit + a ready-to-paste headline and About, built from your resume and goal.
      </p>
      <div className="mt-auto flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          aria-label="LinkedIn profile URL (optional)"
          placeholder="LinkedIn URL (optional)"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? 'Auditing…' : <>Audit <ArrowRight className="h-3.5 w-3.5" /></>}
        </button>
      </div>

      <LinkedInConnect connect={connect} reloadConnect={reloadConnect} />
    </div>
  );
}

/**
 * "Connect & act" footer — OAuth LinkedIn so the user can post an update.
 * The user always writes/reviews the text before posting (human-approved).
 */
function LinkedInConnect({ connect, reloadConnect, prefill }: {
  connect?: ConnectStatus | null; reloadConnect?: () => void; prefill?: string;
}) {
  const li = connect?.linkedin;
  const [connecting, setConnecting] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(prefill || '');
  const [posting, setPosting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const startConnect = async () => {
    setConnecting(true);
    try {
      const r = await apiService.getConnectAuthorizeUrl('linkedin');
      if (r.data?.authorize_url) {
        window.location.href = r.data.authorize_url;
      } else {
        toast.error(r.error || 'LinkedIn connect is unavailable right now');
        setConnecting(false);
      }
    } catch {
      toast.error('Could not start LinkedIn connect');
      setConnecting(false);
    }
  };

  const post = async () => {
    const t = text.trim();
    if (!t) {
      toast.error('Write something to post');
      return;
    }
    setPosting(true);
    try {
      const r = await apiService.postToLinkedin(t);
      if (r.data && !r.error) {
        if (r.data.post_url) {
          toast.success('Posted to LinkedIn', {
            action: { label: 'View', onClick: () => window.open(r.data!.post_url!, '_blank', 'noopener,noreferrer') },
          });
        } else {
          toast.success('Posted to LinkedIn');
        }
        setOpen(false);
        setText('');
      } else {
        toast.error(r.error || 'Could not post to LinkedIn');
      }
    } catch {
      toast.error('Post failed. Try again');
    } finally {
      setPosting(false);
    }
  };

  const disconnect = async () => {
    setDisconnecting(true);
    try {
      const r = await apiService.disconnectProvider('linkedin');
      if (r.data?.ok) {
        toast.success('LinkedIn disconnected');
        reloadConnect?.();
      } else {
        toast.error(r.error || 'Could not disconnect');
      }
    } catch {
      toast.error('Could not disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  if (!li?.connected) {
    return (
      <div className="mt-3 border-t border-border pt-3">
        <button
          onClick={startConnect}
          disabled={connecting}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <Linkedin className={`h-3.5 w-3.5 ${LINKEDIN_ICON}`} /> {connecting ? 'Connecting…' : 'Connect LinkedIn to post'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Linkedin className={`h-3.5 w-3.5 ${LINKEDIN_ICON}`} /> Connected{li.name ? ` as ${li.name}` : ''}
        </span>
        <button
          onClick={disconnect}
          disabled={disconnecting}
          className="ml-auto text-[11px] font-medium text-muted-foreground hover:text-destructive disabled:opacity-50"
        >
          {disconnecting ? 'Disconnecting…' : 'Disconnect'}
        </button>
      </div>

      {!open ? (
        <button
          onClick={() => { setText(prefill || ''); setOpen(true); }}
          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Send className="h-3.5 w-3.5" /> Post to LinkedIn
        </button>
      ) : (
        <div className="mt-2 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Write your post… you review it before it goes live."
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={post}
              disabled={posting || !text.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {posting ? 'Posting…' : <>Post <Send className="h-3.5 w-3.5" /></>}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LinkedInAuditCard;
