import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, CheckCheck, Download, Image as ImageIcon, Link2,
  Link2Off, Loader2, Mail, MailOpen, Send, ShieldAlert,
} from 'lucide-react';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  Attachment, MailAuthResult, MessageView, ThreadDetail,
} from '@/types/mailbox';
import { SafeHtmlFrame } from './SafeHtmlFrame';
import { TrustChip } from './ThreadList';

function formatBytes(n: number): string {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function AuthChip({ label, result }: { label: string; result: MailAuthResult }) {
  const tone =
    result === 'pass'
      ? 'border-success/30 bg-success/10 text-success'
      : result === 'fail'
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : 'border-border bg-muted/50 text-muted-foreground';
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase', tone)}
      title={`${label}: ${result}`}
    >
      {label} {result}
    </span>
  );
}

function AttachmentRow({ att }: { att: Attachment }) {
  const [loading, setLoading] = useState(false);
  const clean = att.verdict === 'clean';

  const download = async () => {
    if (!clean) return;
    setLoading(true);
    const res = await apiService.getAttachmentDownloadUrl(att.id);
    setLoading(false);
    if (res.error || !res.data?.download_url) {
      toast.error("Couldn't prepare that download", { description: res.error });
      return;
    }
    // Presigned, short-TTL URL: open in a new tab; never render it as a
    // standing link (it is a capability).
    window.open(res.data.download_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-foreground">{att.filename}</span>
        <span className="text-[11px] text-muted-foreground">{formatBytes(att.size)}</span>
      </span>
      {clean ? (
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 gap-1.5 px-2 text-xs"
          disabled={loading}
          onClick={download}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download
        </Button>
      ) : (
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning"
          title={`This attachment was flagged (${att.verdict}) and cannot be downloaded.`}
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          {att.verdict === 'blocked' ? 'Blocked' : 'Suspicious'} - download disabled
        </span>
      )}
    </li>
  );
}

function MessageCard({ msg }: { msg: MessageView }) {
  const [showImages, setShowImages] = useState(false);
  const html = msg.html ?? msg.safe_html ?? null;

  return (
    <article className="rounded-container border border-border bg-card p-4 shadow-soft">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{msg.from}</p>
          <p className="truncate text-xs text-muted-foreground">{msg.subject}</p>
        </div>
        <time className="shrink-0 text-[11px] text-muted-foreground" dateTime={msg.received_at}>
          {formatWhen(msg.received_at)}
        </time>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <TrustChip trust={msg.trust} />
        <AuthChip label="SPF" result={msg.spf} />
        <AuthChip label="DKIM" result={msg.dkim} />
        <AuthChip label="DMARC" result={msg.dmarc} />
      </div>

      {html ? (
        <>
          <div className="mb-2 flex items-center justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 px-2 text-[11px]"
              onClick={() => setShowImages((v) => !v)}
              aria-pressed={showImages}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {showImages ? 'Hide remote images' : 'Show images'}
            </Button>
          </div>
          <SafeHtmlFrame
            html={html}
            showImages={showImages}
            title={`Message from ${msg.from}`}
            className="min-h-[220px] w-full rounded-lg border border-border bg-background"
          />
        </>
      ) : msg.text ? (
        <pre className="whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-3 text-[13px] text-foreground">
          {msg.text}
        </pre>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          This message has no readable body.
        </p>
      )}

      {msg.attachments.length > 0 && (
        <div className="mt-3">
          <p className="overline mb-1.5">Attachments ({msg.attachments.length})</p>
          <ul className="space-y-1.5">
            {msg.attachments.map((a) => (
              <AttachmentRow key={a.id} att={a} />
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

interface ThreadDetailViewProps {
  detail: ThreadDetail;
  /** Mobile: return to the list pane. */
  onBack?: () => void;
  /** Notify the container to refetch the list + this thread after a mutation. */
  onChanged?: () => void;
}

/**
 * Read pane for one conversation: message stack (each body sandboxed), trust +
 * SPF/DKIM/DMARC evidence, safe attachment downloads, and the thread controls
 * (mark read/unread, attach/detach an application, report phishing). The reply
 * box is intentionally DISABLED - sending is a later task and we never fake it.
 */
export function ThreadDetailView({ detail, onBack, onChanged }: ThreadDetailViewProps) {
  const { thread, messages } = detail;
  const [busy, setBusy] = useState<null | 'read' | 'attach' | 'detach' | 'report'>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [applicationId, setApplicationId] = useState('');

  const anyUnread = thread.unread_count > 0;

  const toggleRead = async () => {
    setBusy('read');
    const res = await apiService.markThreadRead(thread.thread_id, anyUnread);
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't update the thread", { description: res.error });
      return;
    }
    onChanged?.();
  };

  const attach = async () => {
    const id = applicationId.trim();
    if (!id) return;
    setBusy('attach');
    const res = await apiService.attachThread(thread.thread_id, id);
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't link this thread", { description: res.error });
      return;
    }
    toast.success('Linked to application');
    setAttachOpen(false);
    setApplicationId('');
    onChanged?.();
  };

  const detach = async () => {
    setBusy('detach');
    const res = await apiService.detachThread(thread.thread_id);
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't unlink this thread", { description: res.error });
      return;
    }
    onChanged?.();
  };

  const report = async () => {
    setBusy('report');
    const res = await apiService.reportPhishing(thread.thread_id);
    setBusy(null);
    if (res.error) {
      toast.error("Couldn't report this thread", { description: res.error });
      return;
    }
    toast.success('Reported. Thanks - we will take a look.');
    onChanged?.();
  };

  return (
    <section className="flex min-h-0 flex-col" aria-label="Conversation">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        {onBack && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 px-2 lg:hidden"
            onClick={onBack}
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {thread.subject || '(no subject)'}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {thread.participants?.join(', ')}
          </p>
        </div>
        <TrustChip trust={thread.trust} />
      </header>

      {/* Thread controls */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2 text-xs" disabled={busy === 'read'} onClick={toggleRead}>
          {busy === 'read' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : anyUnread ? (
            <MailOpen className="h-3.5 w-3.5" />
          ) : (
            <Mail className="h-3.5 w-3.5" />
          )}
          {anyUnread ? 'Mark read' : 'Mark unread'}
        </Button>

        {thread.application_id ? (
          <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2 text-xs" disabled={busy === 'detach'} onClick={detach}>
            {busy === 'detach' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
            Unlink application
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-8 gap-1.5 px-2 text-xs" onClick={() => setAttachOpen((v) => !v)} aria-expanded={attachOpen}>
            <Link2 className="h-3.5 w-3.5" />
            Link to application
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs text-warning hover:text-warning"
          disabled={busy === 'report'}
          onClick={report}
        >
          {busy === 'report' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          Report phishing
        </Button>
      </div>

      {attachOpen && !thread.application_id && (
        <form
          className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            attach();
          }}
        >
          <label htmlFor="attach-app-id" className="sr-only">
            Application ID
          </label>
          <Input
            id="attach-app-id"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            placeholder="Application ID"
            className="h-8 flex-1 text-xs"
          />
          <Button type="submit" size="sm" className="h-8 gap-1.5 px-3 text-xs" disabled={busy === 'attach' || !applicationId.trim()}>
            {busy === 'attach' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Link
          </Button>
        </form>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <MessageCard key={m.message_id} msg={m} />
        ))}
      </div>

      {/* Reply box - present but DISABLED. Sending is a later task; we never
          fake a send. */}
      <div className="border-t border-border bg-background/60 px-4 py-3">
        <div className="flex items-end gap-2 opacity-60">
          <textarea
            rows={2}
            disabled
            aria-label="Reply (coming soon)"
            placeholder="Reply from your managed address - coming soon"
            className="flex-1 resize-none rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground/70"
          />
          <Button size="sm" disabled className="gap-1.5" aria-disabled="true">
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Replying to recruiters from your managed address is coming soon.</p>
      </div>
    </section>
  );
}
