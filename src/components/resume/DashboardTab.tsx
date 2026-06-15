import { useEffect, useMemo, useState } from 'react';
import { apiService } from '@/lib/api';
import type { TechChronicleItem } from '@/types/techChronicle';
import {
  Sparkles,
  Search,
  ClipboardList,
  GraduationCap,
  Bot,
  Flame,
  Send,
  FileText,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Briefcase,
} from 'lucide-react';

type NavKey =
  | 'tailor' | 'batch' | 'jobs' | 'my-resumes' | 'tailored'
  | 'applications' | 'interview' | 'visa' | 'beta' | 'copilot' | 'profile';

interface DashboardTabProps {
  userName?: string | null;
  onNavigate: (tab: NavKey) => void;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  today_count: number;
  total_applications: number;
  last_application_date: string | null;
  heatmap: { date: string; count: number }[];
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  ghosted: 'Ghosted',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-muted-foreground/40',
  applied: 'bg-primary',
  interviewing: 'bg-warning',
  offer: 'bg-success',
  rejected: 'bg-destructive/70',
  withdrawn: 'bg-muted-foreground/30',
  ghosted: 'bg-muted-foreground/50',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Flame;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="font-display mt-2 text-2xl font-extrabold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

const QUICK_ACTIONS: { key: NavKey; icon: typeof Sparkles; title: string; body: string }[] = [
  { key: 'tailor', icon: Sparkles, title: 'Tailor a resume', body: 'Optimize for a specific JD' },
  { key: 'jobs', icon: Search, title: 'Find jobs', body: 'Discover scored opportunities' },
  { key: 'applications', icon: ClipboardList, title: 'Track applications', body: 'Manage your pipeline' },
  { key: 'interview', icon: GraduationCap, title: 'Interview prep', body: 'Practice + AI coach' },
  { key: 'copilot', icon: Bot, title: 'Career copilot', body: 'Your agentic assistant' },
  { key: 'batch', icon: Send, title: 'Batch tailor', body: 'Many JDs at once' },
];

export default function DashboardTab({ userName, onNavigate }: DashboardTabProps) {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [brief, setBrief] = useState<{ headline: string; lines: string[] } | null>(null);
  const [trends, setTrends] = useState<TechChronicleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [streakResp, recordsResp, briefResp, trendsResp] = await Promise.all([
      apiService.getApplicationStreak().catch(() => ({ error: 'x' } as const)),
      apiService.listTailoringRecords().catch(() => ({ error: 'x' } as const)),
      apiService.getMorningBrief().catch(() => ({ error: 'x' } as const)),
      apiService.getTechChronicle('all').catch(() => ({ error: 'x' } as const)),
    ]);
    if ('data' in streakResp && streakResp.data) setStreak(streakResp.data as StreakData);
    if ('data' in recordsResp && recordsResp.data) setRecords(recordsResp.data.records || []);
    if ('data' in briefResp && briefResp.data?.briefing) {
      setBrief({ headline: briefResp.data.briefing.headline, lines: briefResp.data.briefing.lines || [] });
    }
    if ('data' in trendsResp && trendsResp.data) setTrends((trendsResp.data.items || []).slice(0, 6));
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) {
      const status = (r?.application?.status || r?.status || 'draft') as string;
      counts[status] = (counts[status] || 0) + 1;
    }
    return counts;
  }, [records]);

  const totalRecords = records.length;
  const name = userName?.split(' ')[0] || userName || 'there';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {greeting()}, {name} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's your job-hunt cockpit. Let's make today count.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Send}
          label="Applications"
          value={streak?.total_applications ?? totalRecords}
          sub={`${streak?.today_count ?? 0} today`}
        />
        <StatCard
          icon={Flame}
          label="Current streak"
          value={`${streak?.current_streak ?? 0}d`}
          sub={`Best ${streak?.longest_streak ?? 0}d`}
        />
        <StatCard
          icon={FileText}
          label="Tailored resumes"
          value={totalRecords}
          sub="In your library"
        />
        <StatCard
          icon={Briefcase}
          label="Interviewing"
          value={pipeline['interviewing'] || 0}
          sub={`${pipeline['offer'] || 0} offers`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: quick actions + pipeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Morning brief */}
          {brief && (brief.headline || brief.lines.length > 0) && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4" /> {brief.headline || 'Your daily brief'}
              </div>
              {brief.lines.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-foreground/85">
                  {brief.lines.slice(0, 4).map((l, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Quick actions
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => onNavigate(a.key)}
                  className="group flex flex-col items-start rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="mt-3 text-sm font-semibold">{a.title}</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{a.body}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pipeline */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Application pipeline</h2>
              <button
                onClick={() => onNavigate('applications')}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {totalRecords === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No applications yet. Tailor a resume and start tracking your pipeline.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {['applied', 'interviewing', 'offer', 'rejected', 'draft'].map((s) => {
                  const count = pipeline[s] || 0;
                  const pct = totalRecords ? Math.round((count / totalRecords) * 100) : 0;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                        {STATUS_LABELS[s]}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${STATUS_COLOR[s]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: market trends */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Market trends</h2>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground">AI-curated tech & career intelligence</p>

          <div className="mt-4 space-y-3">
            {loading && trends.length === 0 ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))
            ) : trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">Trends will appear here shortly.</p>
            ) : (
              trends.map((item) => (
                <a
                  key={item.id}
                  href={(item as any).sourceUrl || '#'}
                  target={(item as any).sourceUrl ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  onClick={(e) => !(item as any).sourceUrl && e.preventDefault()}
                  className="block rounded-lg border border-border/70 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{(item as any).timeAgo}</span>
                  </div>
                  <p className="mt-1.5 text-xs font-medium leading-snug text-foreground/90 line-clamp-2">
                    {item.headline}
                  </p>
                </a>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
