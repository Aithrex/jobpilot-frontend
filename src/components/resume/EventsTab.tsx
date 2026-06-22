import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LegitimacyBadge } from './LegitimacyBadge';
import { PostComposer } from './PostComposer';
import {
  Trophy, RefreshCw, ExternalLink, MapPin, Calendar, Gift, Loader2,
  Bookmark, CalendarCheck, CircleCheck, PenLine, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import type { EventItem, EventRelation } from '@/types/events';

const TYPES = [
  { id: undefined as undefined | 'hackathon' | 'webinar', label: 'All' },
  { id: 'hackathon' as const, label: 'Hackathons' },
  { id: 'webinar' as const, label: 'Webinars' },
];

const RELATIONS: { id: EventRelation; label: string; icon: typeof Bookmark }[] = [
  { id: 'saved', label: 'Save', icon: Bookmark },
  { id: 'registered', label: 'Registered', icon: CalendarCheck },
  { id: 'attended', label: 'Attended', icon: CircleCheck },
  { id: 'won', label: 'Won', icon: Trophy },
];

export default function EventsTab() {
  const qc = useQueryClient();
  const [type, setType] = useState<undefined | 'hackathon' | 'webinar'>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [showUnvetted, setShowUnvetted] = useState(false);
  const [postEvent, setPostEvent] = useState<EventItem | null>(null);

  const q = useQuery({
    queryKey: ['events', type ?? 'all'],
    queryFn: async () => {
      const res = await apiService.getEvents(type);
      if (res.error) throw new Error(res.error);
      return res.data?.events ?? [];
    },
  });

  const { vetted, unvetted } = useMemo(() => {
    const all = q.data ?? [];
    return {
      vetted: all.filter((e) => e.legitimacy_band === 'verified' || e.legitimacy_band === 'credible'),
      unvetted: all.filter((e) => e.legitimacy_band === 'unvetted'),
    };
  }, [q.data]);

  const refresh = async () => {
    setRefreshing(true);
    const res = await apiService.refreshEvents();
    setRefreshing(false);
    if (res.error) {
      toast.error('Refresh failed', { description: res.error });
      return;
    }
    toast.success(`Pulled ${res.data?.upserted ?? 0} events`);
    qc.invalidateQueries({ queryKey: ['events'] });
  };

  const setRelation = async (e: EventItem, relation: EventRelation) => {
    const next = e.relation === relation ? 'dismissed' : relation;
    const res = await apiService.setEventRelation(e.event_id, next);
    if (res.error) { toast.error(res.error); return; }
    qc.invalidateQueries({ queryKey: ['events'] });
    if (next === 'won' || next === 'attended') {
      toast.success(next === 'won' ? 'Marked as won 🏆' : 'Marked as attended', {
        description: 'Want to post about it? Use “Draft post”.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Trophy className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Events</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Hackathons & webinars, vetted</h2>
          <p className="text-sm text-muted-foreground">Legitimacy-scored so you only invest in events worth your time.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.label}
            onClick={() => setType(t.id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${type === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (q.data?.length ?? 0) === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No events yet. Hit <span className="font-medium text-foreground">Refresh</span> to pull the latest from public sources.
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {vetted.map((e) => <EventCard key={e.event_id} e={e} onRelation={setRelation} onPost={setPostEvent} />)}
          </div>

          {unvetted.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowUnvetted((v) => !v)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showUnvetted ? 'rotate-180' : ''}`} />
                {showUnvetted ? 'Hide' : `Show ${unvetted.length}`} unvetted event{unvetted.length > 1 ? 's' : ''}
              </button>
              {showUnvetted && unvetted.map((e) => <EventCard key={e.event_id} e={e} onRelation={setRelation} onPost={setPostEvent} dim />)}
            </div>
          )}
        </>
      )}

      <PostComposer open={!!postEvent} onClose={() => setPostEvent(null)} event={postEvent} />
    </div>
  );
}

function EventCard({
  e, onRelation, onPost, dim,
}: {
  e: EventItem;
  onRelation: (e: EventItem, r: EventRelation) => void;
  onPost: (e: EventItem) => void;
  dim?: boolean;
}) {
  const canPost = e.relation === 'attended' || e.relation === 'won';
  return (
    <Card className={`p-4 ${dim ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{e.title}</h3>
            <LegitimacyBadge
              band={e.legitimacy_band}
              score={e.legitimacy_score}
              rationale={e.vetting_signals?.llm_rationale}
              redFlags={e.vetting_signals?.red_flags}
            />
          </div>
          {e.org && <p className="text-sm text-muted-foreground">{e.org}</p>}
        </div>
        {e.url && (
          <a href={e.url} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-primary" aria-label="Open event">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {e.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {e.start_date && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {e.start_date}</span>}
        {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
        {e.prize_pool && <span className="inline-flex items-center gap-1"><Gift className="h-3 w-3" /> {e.prize_pool}</span>}
      </div>

      {(e.tags?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {e.tags!.slice(0, 5).map((t) => <Badge key={t} variant="outline" className="font-normal">{t}</Badge>)}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {RELATIONS.map((r) => {
          const Icon = r.icon;
          const active = e.relation === r.id;
          return (
            <Button
              key={r.id}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => onRelation(e, r.id)}
              className="h-8"
            >
              <Icon className="h-3.5 w-3.5" /> {r.label}
            </Button>
          );
        })}
        {canPost && (
          <Button size="sm" variant="secondary" className="h-8" onClick={() => onPost(e)}>
            <PenLine className="h-3.5 w-3.5" /> Draft post
          </Button>
        )}
      </div>
    </Card>
  );
}
