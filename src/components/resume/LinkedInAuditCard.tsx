import { useState } from 'react';
import { Linkedin, ArrowRight, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import type { LinkedinAudit } from '@/types/career';

const DOT: Record<string, string> = {
  good: 'bg-emerald-500',
  improve: 'bg-amber-500',
  missing: 'bg-destructive',
};

/**
 * LinkedIn self-audit. We don't (and can't) scrape LinkedIn — this builds honest,
 * specific guidance from the user's real résumé + goal, plus a paste-ready headline
 * and About. Helps a student present as a legitimate, well-positioned candidate.
 */
export function LinkedInAuditCard() {
  const [audit, setAudit] = useState<LinkedinAudit | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await apiService.auditLinkedin(url.trim());
      if (r.data?.sections) setAudit(r.data);
      else toast.error(r.error || 'Could not run the audit');
    } catch {
      toast.error('Audit failed — try again');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };

  if (audit) {
    return (
      <div className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Linkedin className="h-4 w-4 text-[#0a66c2]" />
          <h3 className="text-sm font-bold">LinkedIn audit</h3>
          <span className="ml-auto">
            <span className="text-xl font-extrabold tabular-nums text-primary">{audit.score}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/100</span>
          </span>
        </div>

        {audit.headline && (
          <div className="mb-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suggested headline</span>
              <button onClick={() => copy(audit.headline, 'h')} className="text-muted-foreground hover:text-foreground">
                {copied === 'h' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
            <p className="text-xs">{audit.headline}</p>
          </div>
        )}

        <div className="space-y-1.5">
          {audit.sections.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT[s.status] || 'bg-muted-foreground'}`} />
              <span>
                <span className="font-medium">{s.name}:</span>{' '}
                <span className="text-muted-foreground">{s.tip}</span>
              </span>
            </div>
          ))}
        </div>

        {audit.about && (
          <button
            onClick={() => copy(audit.about, 'a')}
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            {copied === 'a' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy suggested “About”
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-dashed border-[#0a66c2]/30 bg-[#0a66c2]/[0.03] p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Linkedin className="h-4 w-4 text-[#0a66c2]" /> Polish your LinkedIn
      </div>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Get a personalized audit + a ready-to-paste headline and About, built from your résumé and goal.
      </p>
      <div className="mt-auto flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="LinkedIn URL (optional)"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? 'Auditing…' : <>Audit <ArrowRight className="h-3.5 w-3.5" /></>}
        </button>
      </div>
    </div>
  );
}

export default LinkedInAuditCard;
