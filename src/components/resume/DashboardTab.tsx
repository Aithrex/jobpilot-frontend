import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { TechChronicleItem } from '@/types/techChronicle';
import type { DashboardOverview } from '@/types/overview';
import type { CareerReadiness, ConnectStatus } from '@/types/career';
import type { OptClock } from '@/types/visa';
import { RecommendedForYou } from './RecommendedForYou';
import { CareerReadinessCard } from './CareerReadinessCard';
import { CareerPath } from './CareerPath';
import { GitHubProofCard } from './GitHubProofCard';
import { LinkedInAuditCard } from './LinkedInAuditCard';
import OptClockCard from './OptClockCard';
import {
  Sparkles, Search, ClipboardList, GraduationCap, Bot, Flame, Send,
  TrendingUp, ArrowRight, ArrowUpRight, RefreshCw, Briefcase, Trophy, Mic,
  PenLine, Target, DollarSign, Clock,
} from 'lucide-react';

type NavKey =
  | 'tailor' | 'batch' | 'jobs' | 'my-resumes' | 'tailored'
  | 'applications' | 'interview' | 'visa' | 'beta' | 'copilot' | 'profile'
  | 'learning' | 'events' | 'network' | 'billing';

interface DashboardTabProps {
  userName?: string | null;
  onNavigate: (tab: NavKey) => void;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  today_count: number;
  total_applications: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', applied: 'Applied', interviewing: 'Interviewing',
  offer: 'Offer', rejected: 'Rejected', withdrawn: 'Withdrawn', ghosted: 'Ghosted',
};
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-muted-foreground/40', applied: 'bg-primary', interviewing: 'bg-warning',
  offer: 'bg-success', rejected: 'bg-destructive/70', withdrawn: 'bg-muted-foreground/30', ghosted: 'bg-muted-foreground/50',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({ icon: Icon, label, value, sub, onClick }: {
  icon: typeof Flame; label: string; value: string | number; sub?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="font-display mt-2 text-2xl font-extrabold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </button>
  );
}

/** Interconnected pillar card: header (icon + title + deep-link), body, optional cross-link footer. */
function ConnectCard({ icon: Icon, title, onOpen, children, footer, accent }: {
  icon: typeof Flame; title: string; onOpen: () => void; children: React.ReactNode;
  footer?: React.ReactNode; accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${accent || 'bg-primary/10 text-primary'}`}>
            <Icon className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold">{title}</h3>
        </div>
        <button onClick={onOpen} className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
          Open <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1">{children}</div>
      {footer && <div className="mt-3 border-t border-border pt-3">{footer}</div>}
    </motion.div>
  );
}

function CrossLink({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      {children} <ArrowRight className="h-3 w-3" />
    </button>
  );
}

const QUICK_ACTIONS: { key: NavKey; icon: typeof Sparkles; title: string }[] = [
  { key: 'tailor', icon: Sparkles, title: 'Tailor a resume' },
  { key: 'jobs', icon: Search, title: 'Find jobs' },
  { key: 'learning', icon: GraduationCap, title: 'Learn a skill' },
  { key: 'events', icon: Trophy, title: 'Browse events' },
  { key: 'network', icon: PenLine, title: 'Draft a post' },
  { key: 'copilot', icon: Bot, title: 'Career copilot' },
];

export default function DashboardTab({ userName, onNavigate }: DashboardTabProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [readiness, setReadiness] = useState<CareerReadiness | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [brief, setBrief] = useState<{ headline: string; lines: string[] } | null>(null);
  const [trends, setTrends] = useState<TechChronicleItem[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [optClock, setOptClock] = useState<OptClock | null>(null);
  const [optError, setOptError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [ovR, crR, stR, brR, trR, cnR, ocR] = await Promise.all([
      apiService.getOverview().catch(() => ({ error: 'x' } as const)),
      apiService.getCareerReadiness().catch(() => ({ error: 'x' } as const)),
      apiService.getApplicationStreak().catch(() => ({ error: 'x' } as const)),
      apiService.getMorningBrief().catch(() => ({ error: 'x' } as const)),
      apiService.getTechChronicle('all').catch(() => ({ error: 'x' } as const)),
      apiService.getConnectStatus().catch(() => ({ error: 'x' } as const)),
      apiService.optClock().catch(() => ({ error: 'x' } as const)),
    ]);
    if ('data' in ovR && ovR.data) setOverview(ovR.data as DashboardOverview);
    // Guard against the backend's {} error-fallback — only accept a real score.
    if ('data' in crR && crR.data && Array.isArray((crR.data as CareerReadiness).dimensions)) {
      setReadiness(crR.data as CareerReadiness);
    }
    if ('data' in stR && stR.data) setStreak(stR.data as StreakData);
    if ('data' in brR && brR.data?.briefing) setBrief({ headline: brR.data.briefing.headline, lines: brR.data.briefing.lines || [] });
    if ('data' in trR && trR.data) setTrends((trR.data.items || []).slice(0, 6));
    // Guard against the {} error-fallback — only accept a shape with both providers.
    if ('data' in cnR && cnR.data && (cnR.data as ConnectStatus).github && (cnR.data as ConnectStatus).linkedin) {
      setConnect(cnR.data as ConnectStatus);
    }
    if ('data' in ocR && ocR.data) { setOptClock(ocR.data as OptClock); setOptError(false); }
    else setOptError(true);
    setLoading(false);
  };

  const reloadOptClock = async () => {
    const r = await apiService.optClock().catch(() => ({ error: 'x' } as const));
    if ('data' in r && r.data) { setOptClock(r.data as OptClock); setOptError(false); }
    else setOptError(true);
  };

  const reloadConnect = async () => {
    const r = await apiService.getConnectStatus().catch(() => ({ error: 'x' } as const));
    if ('data' in r && r.data && (r.data as ConnectStatus).github && (r.data as ConnectStatus).linkedin) {
      setConnect(r.data as ConnectStatus);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  // After OAuth the backend redirects to /app?connected=<p> | ?connect_error=<r>.
  // Surface a toast, then strip the param so a refresh doesn't re-fire it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('connect_error');
    if (!connected && !error) return;
    if (connected) toast.success(`${connected} connected`);
    if (error) toast.error(`Couldn't connect: ${error.replace(/_/g, ' ')}`);
    params.delete('connected');
    params.delete('connect_error');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, []);

  const o = overview;
  const byStatus = o?.applications.by_status || {};
  const totalApps = o?.applications.total || 0;
  const name = userName?.split(' ')[0] || userName || 'there';
  const iv = o?.interview;
  const gaps = o?.skills.top_gaps || [];

  const interviewReady = useMemo(() => {
    if (!iv || iv.attempts === 0) return null;
    return iv.avg_score ?? null;
  }, [iv]);

  // The OPT Clock jumps to the very top only when the runway is genuinely
  // urgent (< ~20 days). Otherwise it sits as a prominent-but-calm card
  // under career readiness. Rendered in exactly one place either way.
  const optUrgent = optClock?.status_band === 'urgent';
  const optClockNode = (
    <OptClockCard
      clock={optClock}
      loading={loading}
      error={optError}
      onOpenVisa={() => onNavigate('visa')}
      onRefresh={reloadOptClock}
    />
  );

  return (
    <div className="space-y-6">
      {/* OPT Clock — promoted above everything when the runway is urgent */}
      {optUrgent && optClockNode}

      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{greeting()}, {name} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your whole career, connected. Here's where everything stands.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Compass — career readiness: where you are → your next step */}
      <CareerReadinessCard data={readiness} loading={loading} onNavigate={(t) => onNavigate(t as NavKey)} />

      {/* Your path — the guided, build-one-step-at-a-time journey */}
      {readiness?.build_plan && readiness.build_plan.length > 0 && (
        <CareerPath steps={readiness.build_plan} onNavigate={(t) => onNavigate(t as NavKey)} />
      )}

      {/* OPT Clock — calm, prominent placement when not urgent */}
      {!optUrgent && optClockNode}

      {/* Hero stats — each links into its surface */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Send} label="Applications" value={streak?.total_applications ?? totalApps} sub={`${o?.applications.active ?? 0} active`} onClick={() => onNavigate('applications')} />
        <StatCard icon={Briefcase} label="Interviewing" value={o?.applications.interviewing ?? 0} sub={`${o?.applications.offers ?? 0} offers`} onClick={() => onNavigate('applications')} />
        <StatCard icon={Flame} label="Streak" value={`${streak?.current_streak ?? 0}d`} sub={`Best ${streak?.longest_streak ?? 0}d`} onClick={() => onNavigate('applications')} />
        <StatCard icon={GraduationCap} label="Learning" value={o?.learning.modules_completed ?? 0} sub={`${o?.learning.active_paths ?? 0} active paths`} onClick={() => onNavigate('learning')} />
        <StatCard icon={Mic} label="Interview" value={interviewReady != null ? `${interviewReady}` : '—'} sub={iv?.attempts ? `${iv.attempts} answers` : 'Not started'} onClick={() => onNavigate('interview')} />
      </div>

      {/* Daily brief */}
      {brief && (brief.headline || brief.lines.length > 0) && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <Sparkles className="h-4 w-4" /> {brief.headline || 'Your daily brief'}
          </div>
          {brief.lines.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm text-foreground/85">
              {brief.lines.slice(0, 4).map((l, i) => (
                <li key={i} className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />{l}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Recommended for you — personalized cross-feature feed */}
      <RecommendedForYou onNavigate={(t) => onNavigate(t as NavKey)} />

      {/* Build your professional presence — proof that recognizes the building */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Build your professional presence
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <GitHubProofCard onLinked={load} connect={connect} reloadConnect={reloadConnect} />
          <LinkedInAuditCard connect={connect} reloadConnect={reloadConnect} />
        </div>
      </section>

      {/* ── Your toolkit: each pillar links into its surface ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pipeline */}
        <ConnectCard icon={ClipboardList} title="Application pipeline" onOpen={() => onNavigate('applications')}
          footer={(o?.applications.stale ?? 0) > 0 ? (
            <CrossLink onClick={() => onNavigate('applications')}>
              <Clock className="h-3 w-3" /> {o!.applications.stale} stale — follow up
            </CrossLink>
          ) : null}>
          {totalApps === 0 ? (
            <p className="text-sm text-muted-foreground">No applications yet. <button onClick={() => onNavigate('tailor')} className="text-primary hover:underline">Tailor a resume</button> to start.</p>
          ) : (
            <div className="space-y-2">
              {['applied', 'interviewing', 'offer', 'rejected', 'draft'].map((s) => {
                const count = byStatus[s] || 0;
                const pct = totalApps ? Math.round((count / totalApps) * 100) : 0;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">{STATUS_LABELS[s]}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${STATUS_COLOR[s]}`} style={{ width: `${pct}%` }} /></div>
                    <span className="w-6 shrink-0 text-right text-xs font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </ConnectCard>

        {/* Jobs ↔ Learning (skill gaps) */}
        <ConnectCard icon={Search} title="Jobs & skill gaps" onOpen={() => onNavigate('jobs')} accent="bg-cyan-500/10 text-cyan-500"
          footer={gaps.length > 0 ? <span className="text-xs text-muted-foreground">Close a gap → <CrossLink onClick={() => onNavigate('learning')}>build a learning path</CrossLink></span> : null}>
          <p className="text-sm"><span className="font-bold">{o?.jobs.saved ?? 0}</span> <span className="text-muted-foreground">saved jobs</span></p>
          {gaps.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Most-wanted skills you're missing</p>
              <div className="flex flex-wrap gap-1.5">
                {gaps.map((g) => (
                  <button key={g.skill} onClick={() => onNavigate('learning')}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs transition-colors hover:border-primary hover:text-primary">
                    {g.skill} <span className="rounded-full bg-amber-500/15 px-1 text-[10px] font-bold text-amber-600">×{g.count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Save jobs to see which skills unlock the most roles.</p>
          )}
        </ConnectCard>

        {/* Learning */}
        <ConnectCard icon={GraduationCap} title="Learning Hub" onOpen={() => onNavigate('learning')} accent="bg-violet-500/10 text-violet-500"
          footer={(o?.learning.earned_skills_count ?? 0) > 0 ? <span className="text-xs text-muted-foreground">{o!.learning.earned_skills_count} earned skills → <CrossLink onClick={() => onNavigate('my-resumes')}>add to resume</CrossLink></span> : null}>
          {(o?.learning.in_progress.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No active paths. <button onClick={() => onNavigate('learning')} className="text-primary hover:underline">Start one</button> for any topic.</p>
          ) : (
            <div className="space-y-2.5">
              {o!.learning.in_progress.map((p) => (
                <button key={p.path_id} onClick={() => onNavigate('learning')} className="block w-full text-left">
                  <div className="mb-1 flex justify-between text-xs"><span className="truncate font-medium">{p.title}</span><span className="text-muted-foreground">{p.percent}%</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-violet-500" style={{ width: `${p.percent}%` }} /></div>
                </button>
              ))}
            </div>
          )}
        </ConnectCard>

        {/* Interview readiness ↔ salary */}
        <ConnectCard icon={Mic} title="Interview readiness" onOpen={() => onNavigate('interview')} accent="bg-emerald-500/10 text-emerald-500"
          footer={<CrossLink onClick={() => onNavigate('interview')}><DollarSign className="h-3 w-3" /> Check a salary benchmark</CrossLink>}>
          {(iv?.attempts ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No mock answers yet. <button onClick={() => onNavigate('interview')} className="text-primary hover:underline">Run a mock</button> to find your patterns.</p>
          ) : (
            <div>
              <p className="text-sm"><span className="text-2xl font-extrabold">{iv!.avg_score}</span> <span className="text-muted-foreground">avg across {iv!.attempts} answers</span></p>
              {iv!.weakest && (
                <p className="mt-2 flex items-center gap-1.5 text-xs">
                  <Target className="h-3.5 w-3.5 text-amber-500" /> Weakest: <span className="font-medium">{iv!.weakest.replace(/_/g, ' ')}</span> —
                  <button onClick={() => onNavigate('interview')} className="text-primary hover:underline">drill it</button>
                </p>
              )}
            </div>
          )}
        </ConnectCard>

        {/* Events ↔ Network (posts) */}
        <ConnectCard icon={Trophy} title="Events" onOpen={() => onNavigate('events')} accent="bg-amber-500/10 text-amber-500"
          footer={(o?.events.won ?? 0) + (o?.events.attended ?? 0) > 0 ? <CrossLink onClick={() => onNavigate('network')}><PenLine className="h-3 w-3" /> Draft a post about it</CrossLink> : null}>
          <p className="text-sm"><span className="font-bold">{o?.events.upcoming_verified ?? 0}</span> <span className="text-muted-foreground">vetted events to explore</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {(o?.events.won ?? 0) > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-600">🏆 {o!.events.won} won</span>}
            {(o?.events.attended ?? 0) > 0 && <span className="rounded-full bg-muted px-2 py-0.5">{o!.events.attended} attended</span>}
            {(o?.events.registered ?? 0) > 0 && <span className="rounded-full bg-muted px-2 py-0.5">{o!.events.registered} registered</span>}
            {(o?.events.saved ?? 0) > 0 && <span className="rounded-full bg-muted px-2 py-0.5">{o!.events.saved} saved</span>}
          </div>
        </ConnectCard>

        {/* Momentum */}
        <ConnectCard icon={Flame} title="Today's momentum" onOpen={() => onNavigate('billing')} accent="bg-rose-500/10 text-rose-500"
          footer={<span className="text-xs text-muted-foreground">{o?.momentum.tailors_remaining ?? 0} tailors left today · <CrossLink onClick={() => onNavigate('billing')}>upgrade for more</CrossLink></span>}>
          <div className="flex items-center gap-4">
            <div><p className="text-2xl font-extrabold">{streak?.today_count ?? 0}</p><p className="text-xs text-muted-foreground">applied today</p></div>
            <div><p className="text-2xl font-extrabold">{o?.momentum.tailors_today ?? 0}<span className="text-sm text-muted-foreground">/{o?.momentum.tailor_limit ?? 5}</span></p><p className="text-xs text-muted-foreground">resumes tailored</p></div>
          </div>
        </ConnectCard>
      </div>

      {/* Quick actions + Market trends */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.key} onClick={() => onNavigate(a.key)}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <a.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">{a.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Market trends</h2>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Live</span>
          </div>
          <div className="mt-4 space-y-2.5">
            {loading && trends.length === 0 ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)
            ) : trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">Trends will appear here shortly.</p>
            ) : (
              trends.slice(0, 5).map((item) => (
                <a key={item.id} href={(item as any).sourceUrl || '#'} target={(item as any).sourceUrl ? '_blank' : undefined} rel="noopener noreferrer"
                  onClick={(e) => !(item as any).sourceUrl && e.preventDefault()}
                  className="block rounded-lg border border-border/70 p-2.5 transition-colors hover:border-primary/40 hover:bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">{item.category}</span>
                    <span className="text-[10px] text-muted-foreground">{(item as any).timeAgo}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-foreground/90">{item.headline}</p>
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
