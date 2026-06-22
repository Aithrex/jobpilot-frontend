import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PenLine, Loader2, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
import { apiService } from '@/lib/api';
import { useUpgrade } from '@/components/billing/UpgradeModalProvider';
import { toast } from 'sonner';
import type { EventItem, PostVariant } from '@/types/events';

const AUDIENCES = [
  { id: 'engineering', label: 'Engineers' },
  { id: 'product', label: 'Product' },
  { id: 'design', label: 'Designers' },
  { id: 'general', label: 'General' },
];

export function PostComposer({
  open, onClose, event,
}: {
  open: boolean;
  onClose: () => void;
  event?: EventItem | null;
}) {
  const { open: openUpgrade } = useUpgrade();
  const [audience, setAudience] = useState('general');
  const [achievement, setAchievement] = useState('');
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<PostVariant[] | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const relation = event?.relation === 'won' ? 'won' : 'attended';

  const generate = async () => {
    if (!event && !achievement.trim()) {
      toast.error('Write what you want to post about, or pick an event.');
      return;
    }
    setLoading(true);
    const res = await apiService.draftPost({
      event_id: event?.event_id,
      achievement: achievement.trim() || undefined,
      audience,
      relation,
    });
    setLoading(false);
    if (res.status === 403 && res.errorPayload?.error === 'upgrade_required') {
      openUpgrade({ feature: 'post_draft', title: 'More post drafting', description: 'Free includes 1 post a month. Upgrade for more.' });
      return;
    }
    if (res.error || !res.data?.variants?.length) {
      toast.error('Could not draft post', { description: res.error || 'Please try again.' });
      return;
    }
    setVariants(res.data.variants);
  };

  const copy = async (v: PostVariant, i: number) => {
    const text = `${v.text}\n\n${(v.hashtags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`;
    await navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); } }}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PenLine className="h-5 w-5 text-primary" /> Draft a LinkedIn post</DialogTitle>
        </DialogHeader>

        {event && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <span className="text-muted-foreground">About: </span>
            <span className="font-medium">{event.title}</span>
            {relation === 'won' && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600">Won</span>}
          </div>
        )}

        {!event && (
          <Textarea
            value={achievement}
            onChange={(e) => setAchievement(e.target.value)}
            placeholder="What do you want to post about? e.g. 'Finished a 6-week system design path and shipped a load-balancer demo.'"
            rows={3}
          />
        )}

        <div>
          <p className="mb-2 text-sm font-medium">Audience</p>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a.id}
                onClick={() => setAudience(a.id)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${audience === a.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={generate} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : variants ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          {loading ? 'Writing…' : variants ? 'Regenerate' : 'Generate 3 variants'}
        </Button>

        {variants && (
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">{v.angle}</span>
                  <button onClick={() => copy(v, i)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {copied === i ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === i ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm">{v.text}</p>
                {v.hashtags?.length > 0 && (
                  <p className="mt-2 text-xs text-primary">{v.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PostComposer;
