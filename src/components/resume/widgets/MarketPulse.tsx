/**
 * Market pulse — a quiet, live read on what's moving in the field the user is
 * targeting. Low, steady relevance: always somewhat useful, never loud. Empty
 * state is a gentle "loading soon" rather than a dead card.
 */
import { TrendingUp } from 'lucide-react';
import type { TechNewsItem } from '@/types/techChronicle';
import type { Widget } from './types';
import { WidgetCard, WidgetEmpty, WidgetError } from './primitives';

export const marketPulseWidget: Widget = {
  key: 'market-pulse',
  relevance: (ctx) => (ctx.trends.length > 0 ? 0.34 : 0.16),
  span: () => 1,
  render: (ctx) => {
    const items = ctx.trends.slice(0, 4);
    return (
      <WidgetCard
        icon={TrendingUp}
        title="Market pulse"
        eyebrow="What's moving"
        onOpen={() => ctx.navigate('beta')}
        openLabel="More"
      >
        {ctx.errors.trends && items.length === 0 ? (
          <WidgetError label="Couldn't load market signal" onRetry={ctx.retry} />
        ) : items.length === 0 ? (
          <WidgetEmpty
            title="Know what's moving in your field"
            body="Aspirely gathers hiring and tech signal for your target role and drops the highlights here."
            ctaLabel="Browse the latest"
            onCta={() => ctx.navigate('beta')}
          />
        ) : (
          <ul className="flex flex-1 flex-col divide-y divide-border/60">
            {items.map((item) => {
              const url = (item as TechNewsItem).sourceUrl;
              return (
                <li key={item.id}>
                  <a
                    href={url || '#'}
                    target={url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    onClick={(e) => !url && e.preventDefault()}
                    className="block py-2.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{item.timeAgo}</span>
                    </div>
                    <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground/90">{item.headline}</p>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </WidgetCard>
    );
  },
};
