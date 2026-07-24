import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { apiService } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles, Clock, FileText, GraduationCap, Mic, Trophy, ArrowRight,
} from 'lucide-react';

const ICONS: Record<string, typeof Sparkles> = {
  clock: Clock, file: FileText, grad: GraduationCap, mic: Mic, trophy: Trophy,
};

/**
 * "Recommended for you" - the all-in-one payoff. One ranked feed of next-best
 * actions synthesized across applications, learning, interviews, jobs, and
 * events. Each card deep-links into the relevant tab.
 */
export function RecommendedForYou({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const q = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await apiService.getRecommendations();
      if (res.error) throw new Error(res.error);
      return res.data?.recommendations ?? [];
    },
    staleTime: 60_000,
  });

  // Skeleton row with the same card footprint so the feed doesn't jump in.
  if (q.isLoading) {
    return (
      <div>
        <h2 className="overline mb-3 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" /> Recommended for you
        </h2>
        <div className="-mx-1 flex gap-3 overflow-hidden px-1 pb-1" aria-hidden>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[158px] w-[260px] shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Ambient strip: when there's nothing to recommend (or the fetch failed),
  // stay out of the way rather than adding noise to the dashboard.
  if (q.isError || (q.data?.length ?? 0) === 0) return null;

  return (
    <div>
      <h2 className="overline mb-3 flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" /> Recommended for you
      </h2>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {q.data!.map((r, i) => {
          const Icon = ICONS[r.icon] || Sparkles;
          return (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onNavigate(r.tab)}
              className="group flex w-[260px] shrink-0 snap-start flex-col rounded-xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="mt-3 line-clamp-2 text-sm font-semibold">{r.title}</span>
              <span className="mt-1 line-clamp-2 flex-1 text-xs text-muted-foreground">{r.subtitle}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                {r.cta} <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default RecommendedForYou;
