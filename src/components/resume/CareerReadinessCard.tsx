import { motion } from 'framer-motion';
import { Compass, ArrowRight, Sparkles, Target } from 'lucide-react';
import type { CareerReadiness, ReadinessBand, ReadinessDimension } from '@/types/career';

const BAND: Record<ReadinessBand, { ring: string; chip: string }> = {
  starting: { ring: 'hsl(var(--muted-foreground))', chip: 'bg-muted text-muted-foreground' },
  building: { ring: 'hsl(var(--warning))', chip: 'bg-warning/10 text-warning' },
  ready: { ring: 'hsl(var(--success))', chip: 'bg-success/10 text-success' },
  standout: { ring: 'hsl(var(--primary))', chip: 'bg-primary/15 text-primary' },
};

function Ring({ score, color }: { score: number; color: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-extrabold leading-none tabular-nums tracking-tight">{score}</span>
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function DimBar({ d }: { d: ReadinessDimension }) {
  const color = d.score >= 70 ? 'bg-success' : d.score >= 40 ? 'bg-warning' : 'bg-muted-foreground/50';
  return (
    <div title={d.summary}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium">{d.label}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{d.score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, d.score)}%` }} />
      </div>
    </div>
  );
}

/**
 * Career Readiness - the Compass hero. Turns the onboarding goal (finally used)
 * + the cross-surface score into a single "here's where you are → your next step"
 * view, and recognizes the *building* via the "You've built" highlights.
 */
export function CareerReadinessCard({
  data,
  loading,
  onNavigate,
}: {
  data: CareerReadiness | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}) {
  if (loading && !data) {
    return <div className="h-44 animate-pulse rounded-2xl border border-border bg-card shadow-soft" />;
  }
  if (!data) return null;
  const band = BAND[data.band] || BAND.building;
  const step = data.next_step;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mesh-accent overflow-hidden rounded-2xl border border-primary/20 p-5 shadow-soft"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        {/* Score + level + goal */}
        <div className="flex items-center gap-4">
          <Ring score={data.overall} color={band.ring} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Compass className="h-3.5 w-3.5" /> Career readiness
            </div>
            <div className="mt-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${band.chip}`}>{data.level}</span>
            </div>
            <p className="mt-1.5 flex items-center gap-1 truncate text-sm text-muted-foreground">
              <Target className="h-3.5 w-3.5 shrink-0" />
              {data.target_role ? (
                <>Goal:&nbsp;<span className="font-medium text-foreground">{data.target_role}</span></>
              ) : (
                <button onClick={() => onNavigate('profile')} className="text-primary hover:underline">
                  Set your target role →
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Dimension breakdown */}
        <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:max-w-md">
          {data.dimensions.map((d) => (
            <DimBar key={d.key} d={d} />
          ))}
        </div>

        {/* The one next step */}
        <div className="lg:w-64 lg:shrink-0">
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your next step</div>
            <div className="mt-1 text-sm font-semibold">{step.label}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
            <button
              onClick={() => onNavigate(step.cta_tab)}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Let's do it <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recognize the building */}
      {data.highlights.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> You've built
          </span>
          {data.highlights.map((h, i) => (
            <span key={i} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground/80">
              {h}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default CareerReadinessCard;
