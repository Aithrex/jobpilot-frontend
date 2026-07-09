/**
 * Content momentum — the LinkedIn posts the user has drafted and can publish to
 * build their presence. Empty state invites turning a win into a post.
 */
import { PenLine } from 'lucide-react';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, Stat } from './primitives';

export const postPerformanceWidget: Widget = {
  key: 'post-performance',
  relevance: (ctx) => {
    const posts = ctx.posts?.length ?? 0;
    const wins = (ctx.overview?.events.won ?? 0) + (ctx.overview?.events.attended ?? 0);
    if (posts > 0) return 0.48;
    if (wins > 0) return 0.36; // you have something worth posting about
    return 0.2;
  },
  span: () => 1,
  render: (ctx) => {
    const posts = ctx.posts ?? [];
    const latest = posts[0];

    return (
      <WidgetCard icon={PenLine} title="Your posts" eyebrow="Build presence" onOpen={() => ctx.navigate('network')}>
        {posts.length === 0 ? (
          <WidgetEmpty
            title="Turn a win into a post"
            body="Shipped a project or placed in an event? JobPilot drafts a LinkedIn post in your voice."
            ctaLabel="Draft a post"
            onCta={() => ctx.navigate('network')}
          />
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-3">
            <Stat value={posts.length} label={posts.length === 1 ? 'draft ready to publish' : 'drafts ready to publish'} />
            {latest?.variants?.[0]?.hook && (
              <p className="line-clamp-2 border-l-2 border-primary/30 pl-2.5 text-xs italic leading-relaxed text-muted-foreground">
                “{latest.variants[0].hook}”
              </p>
            )}
            <button
              type="button"
              onClick={() => ctx.navigate('network')}
              className="inline-flex items-center gap-1 self-start rounded text-xs font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Review & publish →
            </button>
          </div>
        )}
      </WidgetCard>
    );
  },
};
