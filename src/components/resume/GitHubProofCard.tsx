import { useEffect, useState } from 'react';
import { Github, Star, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { GithubProfile } from '@/types/career';

/**
 * GitHub proof-of-skill. Link by username/URL (no OAuth) → real shipped projects
 * count toward Career Readiness. Embodies "recognize the building, not just the
 * applying." Calls onLinked() so the dashboard re-pulls the readiness score.
 */
export function GitHubProofCard({ onLinked }: { onLinked?: () => void }) {
  const [profile, setProfile] = useState<GithubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let active = true;
    apiService
      .getGithub()
      .then((r) => {
        if (active && r.data?.linked && r.data.profile) setProfile(r.data.profile);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const link = async () => {
    const u = input.trim();
    if (!u) return;
    setBusy(true);
    try {
      const r = await apiService.linkGithub(u);
      if (r.data?.profile) {
        setProfile(r.data.profile);
        setEditing(false);
        setInput('');
        toast.success('GitHub linked — proof added to your readiness');
        onLinked?.();
      } else {
        toast.error(r.error || 'Could not analyze that profile');
      }
    } catch {
      toast.error('Failed to analyze GitHub profile');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />;
  }

  if (profile && !editing) {
    return (
      <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full border border-border" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-foreground/5">
              <Github className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <a
              href={profile.html_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 truncate text-sm font-bold hover:underline"
            >
              <Github className="h-3.5 w-3.5 text-muted-foreground" /> @{profile.username}
            </a>
            <p className="text-xs text-muted-foreground">
              {profile.original_repos} projects · {profile.total_stars} ★ · {profile.followers} followers
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-extrabold tabular-nums text-primary">{profile.proof_score}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">proof</div>
          </div>
        </div>

        {profile.top_languages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {profile.top_languages.map((l) => (
              <span key={l} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                {l}
              </span>
            ))}
          </div>
        )}

        {profile.top_repos.length > 0 && (
          <div className="space-y-1.5">
            {profile.top_repos.slice(0, 3).map((r) => (
              <a
                key={r.name}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs transition-colors hover:border-primary/40"
              >
                <span className="truncate font-medium">{r.name}</span>
                {r.language && <span className="shrink-0 text-muted-foreground">{r.language}</span>}
                <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-muted-foreground">
                  <Star className="h-3 w-3" />
                  {r.stars}
                </span>
              </a>
            ))}
          </div>
        )}

        <button
          onClick={() => setEditing(true)}
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" /> Update username
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Github className="h-4 w-4" /> Prove your skills
      </div>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Link your GitHub — your real, shipped projects count toward your Career Readiness. No login needed.
      </p>
      <div className="mt-auto flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && link()}
          placeholder="github.com/username or username"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={link}
          disabled={busy || !input.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? 'Analyzing…' : <>Analyze <ArrowRight className="h-3.5 w-3.5" /></>}
        </button>
      </div>
    </div>
  );
}

export default GitHubProofCard;
