import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, PartyPopper, Copy, Check, Sparkles, ExternalLink, Send, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { useUpgrade } from '@/components/billing/UpgradeModalProvider';
import { toast } from 'sonner';
import type { EdgeTask, EdgePostVariant } from '@/types/learning';

interface ShareWinDialogProps {
  open: boolean;
  onClose: () => void;
  pathId: string;
  task: EdgeTask;
}

function variantText(v: EdgePostVariant): string {
  const tags = (v.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ');
  return tags ? `${v.text}\n\n${tags}` : v.text;
}

export function ShareWinDialog({ open, onClose, pathId, task }: ShareWinDialogProps) {
  const { open: openUpgrade } = useUpgrade();
  const [loading, setLoading] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [variants, setVariants] = useState<EdgePostVariant[] | null>(null);
  const [picked, setPicked] = useState(0);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState<'manual' | 'auto' | null>(null);
  const [scheduled, setScheduled] = useState<{ scheduleId: string; holdsUntil?: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const reset = () => {
    setLoading(false);
    setDraftId(null);
    setVariants(null);
    setPicked(0);
    setCopied(false);
    setPublishing(null);
    setScheduled(null);
    setCancelling(false);
  };

  const draft = async () => {
    setLoading(true);
    const res = await apiService.draftWinPost(pathId, task.task_ref);
    setLoading(false);
    if (res.status === 400 && res.errorPayload?.error === 'not_verified') {
      toast.error('Verify this task first', { description: 'Only verified wins can be shared.' });
      return;
    }
    if (res.error || !res.data?.variants?.length) {
      toast.error('Could not draft your post', { description: res.error || 'Please try again.' });
      return;
    }
    setDraftId(res.data.draft_id);
    setVariants(res.data.variants);
    setPicked(0);
  };

  const copy = async () => {
    if (!variants) return;
    await navigator.clipboard.writeText(variantText(variants[picked]));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
    toast.success('Copied — paste it into LinkedIn');
  };

  const publish = async (mode: 'manual' | 'auto') => {
    if (!draftId) return;
    setPublishing(mode);
    const res = await apiService.publishWinPost(draftId, { mode, variant_index: picked });
    setPublishing(null);
    if (res.status === 403 && res.errorPayload?.error === 'upgrade_required') {
      openUpgrade({
        feature: 'auto_post',
        title: 'Auto-post to LinkedIn',
        description: 'Auto-publishing is a Premium+ perk. Upgrade to have Aspirely post for you.',
        highlight: 'premium_plus',
      });
      return;
    }
    if (res.error) {
      toast.error('Could not publish', { description: res.error });
      return;
    }
    if (mode === 'manual') {
      if (res.data?.post_url) window.open(res.data.post_url, '_blank', 'noopener,noreferrer');
      toast.success('Ready to post on LinkedIn');
      return;
    }
    // auto — scheduled with a 30-min hold
    setScheduled({
      scheduleId: res.data?.schedule_id || '',
      holdsUntil: res.data?.holds_until || res.data?.scheduled_for,
    });
    toast.success('Scheduled', { description: 'Holds for 30 minutes — you can still cancel.' });
  };

  const cancel = async () => {
    if (!scheduled?.scheduleId) return;
    setCancelling(true);
    const res = await apiService.cancelWinPost(scheduled.scheduleId);
    setCancelling(false);
    if (res.error) {
      toast.error('Could not cancel', { description: res.error });
      return;
    }
    setScheduled(null);
    toast('Auto-post cancelled');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-primary" /> Share this win
          </DialogTitle>
          <DialogDescription>
            A verified, specific post — grounded in what you actually shipped.
          </DialogDescription>
        </DialogHeader>

        {/* Scheduled (auto) state */}
        {scheduled ? (
          <div className="rounded-xl border border-success/40 bg-success/5 p-4">
            <p className="flex items-center gap-2 font-semibold text-success">
              <Clock className="h-5 w-5" /> Scheduled to post
            </p>
            <p className="mt-1.5 text-sm text-foreground/90">
              We hold auto-posts for 30 minutes so you can change your mind. It will publish
              automatically unless you cancel.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={cancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Cancel auto-post
            </Button>
          </div>
        ) : !variants ? (
          <div className="space-y-3 py-2 text-center">
            <p className="text-sm text-muted-foreground">
              Turn this into a LinkedIn post recruiters actually read.
            </p>
            <Button onClick={draft} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Writing your post…' : 'Draft my post'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Variant chips */}
            {variants.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {variants.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setPicked(i)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      picked === i
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {v.angle}
                  </button>
                ))}
              </div>
            )}

            {/* Selected variant */}
            <div className="rounded-xl border border-border p-4">
              {variants[picked].hook && (
                <p className="mb-2 text-sm font-semibold">{variants[picked].hook}</p>
              )}
              <p className="whitespace-pre-wrap text-sm">{variants[picked].text}</p>
              {variants[picked].hashtags?.length > 0 && (
                <p className="mt-2 text-xs text-primary">
                  {variants[picked].hashtags
                    .map((h) => (h.startsWith('#') ? h : `#${h}`))
                    .join(' ')}
                </p>
              )}
            </div>

            {/* Manual */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copy}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => publish('manual')} disabled={publishing !== null}>
                {publishing === 'manual' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                Open LinkedIn
              </Button>
              <Button variant="outline" size="sm" onClick={draft} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Regenerate
              </Button>
            </div>

            {/* Auto */}
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <Button size="sm" className="w-full" onClick={() => publish('auto')} disabled={publishing !== null}>
                {publishing === 'auto' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Auto-post for me
              </Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Premium+ · holds for 30 minutes and can be cancelled.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ShareWinDialog;
