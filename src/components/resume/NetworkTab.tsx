import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PostComposer } from './PostComposer';
import { PenLine, Trophy, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { EventItem } from '@/types/events';

export default function NetworkTab() {
  const [composer, setComposer] = useState<{ open: boolean; event: EventItem | null }>({ open: false, event: null });
  const [copied, setCopied] = useState<string | null>(null);

  const events = useQuery({
    queryKey: ['events', 'all'],
    queryFn: async () => {
      const res = await apiService.getEvents();
      if (res.error) throw new Error(res.error);
      return res.data?.events ?? [];
    },
  });
  const posts = useQuery({
    queryKey: ['post-drafts'],
    queryFn: async () => {
      const res = await apiService.getPosts();
      if (res.error) throw new Error(res.error);
      return res.data?.posts ?? [];
    },
  });

  const postable = (events.data ?? []).filter((e) => e.relation === 'attended' || e.relation === 'won');

  const copy = async (text: string, id: string, tags?: string[]) => {
    const full = `${text}\n\n${(tags || []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`;
    await navigator.clipboard.writeText(full);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
    toast.success('Copied');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <PenLine className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Network & Posts</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Turn wins into a personal brand</h2>
          <p className="text-sm text-muted-foreground">Draft audience-tailored posts about what you built, learned, or won.</p>
        </div>
        <Button onClick={() => setComposer({ open: true, event: null })}>
          <Sparkles className="h-4 w-4" /> Draft a post
        </Button>
      </header>

      {/* Post about events */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Post about your events</h3>
        {events.isLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : postable.length === 0 ? (
          <Card className="p-5 text-center text-sm text-muted-foreground">
            Mark an event as <span className="font-medium text-foreground">Attended</span> or <span className="font-medium text-foreground">Won</span> in the Events tab to draft a post about it.
          </Card>
        ) : (
          <div className="space-y-2">
            {postable.map((e) => (
              <Card key={e.event_id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.relation === 'won' ? '🏆 Won' : 'Attended'}{e.org ? ` · ${e.org}` : ''}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => setComposer({ open: true, event: e })}>
                  <PenLine className="h-3.5 w-3.5" /> Draft
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent drafts */}
      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent drafts</h3>
        {posts.isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : (posts.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No drafts yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.data!.map((d) => {
              const v = d.variants?.[0];
              if (!v) return null;
              return (
                <Card key={d.draft_id} className="p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      <Trophy className="h-3 w-3" /> {d.audience}
                    </span>
                    <button onClick={() => copy(v.text, d.draft_id, v.hashtags)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      {copied === d.draft_id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === d.draft_id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="line-clamp-3 whitespace-pre-wrap text-sm">{v.text}</p>
                  {d.variants.length > 1 && <p className="mt-1 text-xs text-muted-foreground">+{d.variants.length - 1} more variant(s)</p>}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <PostComposer open={composer.open} onClose={() => setComposer({ open: false, event: null })} event={composer.event} />
    </div>
  );
}
