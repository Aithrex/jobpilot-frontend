/**
 * BetaLabTab - Beta features that aren't yet promoted to the main flow.
 *
 * Layout: card grid. Each card is either a working "functional" feature
 * (load on click, render output inline) or a "coming soon" stub with a
 * description and a non-blocking "Notify me" button.
 *
 * Design principle: nothing here disrupts the main app. All cards are
 * opt-in clicks; none of them auto-fetch on mount.
 */
import { useState, useCallback } from 'react';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Beaker, Wand2, Sparkles, ListChecks, Compass,
  BellRing, BookOpen, Bot, Globe, ChevronRight, RefreshCw,
} from 'lucide-react';

type BriefingState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; headline: string; lines: string[]; counts: Record<string, number> }
  | { kind: 'error'; message: string };

type SimilarState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; tokens: string[]; results: Array<{ title: string; company: string; url?: string; score_overlap: number; status?: string }> }
  | { kind: 'error'; message: string };

type AbState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; total: number; hasTagged: boolean; insight?: string; variants: Array<{ variant: string; total: number; callback_rate: number; offers: number; interviewed: number }> }
  | { kind: 'error'; message: string };

export default function BetaLabTab() {
  const [brief, setBrief] = useState<BriefingState>({ kind: 'idle' });
  const [similar, setSimilar] = useState<SimilarState>({ kind: 'idle' });
  const [similarJd, setSimilarJd] = useState('');
  const [ab, setAb] = useState<AbState>({ kind: 'idle' });

  const runBrief = useCallback(async () => {
    setBrief({ kind: 'loading' });
    const resp = await apiService.getMorningBrief();
    if (resp.error || !resp.data?.ok) {
      setBrief({ kind: 'error', message: resp.error || 'Failed to build briefing.' });
      return;
    }
    setBrief({
      kind: 'done',
      headline: resp.data.briefing.headline,
      lines: resp.data.briefing.lines,
      counts: resp.data.briefing.counts,
    });
  }, []);

  const runSimilar = useCallback(async () => {
    if (similarJd.trim().length < 80) {
      toast.error('Paste at least a paragraph of the JD.');
      return;
    }
    setSimilar({ kind: 'loading' });
    const resp = await apiService.findSimilarRoles(similarJd.trim());
    if (resp.error || !resp.data?.ok) {
      setSimilar({ kind: 'error', message: resp.error || resp.data?.error || 'Failed.' });
      return;
    }
    setSimilar({
      kind: 'done',
      tokens: resp.data.seed_tokens || [],
      results: resp.data.results || [],
    });
  }, [similarJd]);

  const runAb = useCallback(async () => {
    setAb({ kind: 'loading' });
    const resp = await apiService.getAbTelemetry();
    if (resp.error || !resp.data?.ok) {
      setAb({ kind: 'error', message: resp.error || 'Failed to load telemetry.' });
      return;
    }
    setAb({
      kind: 'done',
      total: resp.data.total_apps,
      hasTagged: resp.data.has_tagged_data,
      insight: resp.data.insight || '',
      variants: resp.data.variants,
    });
  }, []);

  const notify = (label: string) => {
    toast.success(`Got it. We'll ping you when ${label} ships.`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="overline">Experimental</p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="inline-flex items-center gap-2 font-display text-title-lg text-foreground">
            <Beaker className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> Beta Lab
          </h2>
          <Badge variant="outline" className="border-border text-caption-sm uppercase tracking-wide text-muted-foreground">
            All in beta
          </Badge>
        </div>
        <p className="max-w-prose text-sm text-muted-foreground">
          Experiments that aren't ready for the main flow. Working ones run on
          click; "Coming soon" cards are scoped and ranked, just not built yet.
          Send feedback. These decisions reshape the roadmap.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ─── #8 Morning Agent ──────────────────────────────────────── */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="inline-flex items-center gap-2 text-title-sm">
                <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Morning Agent
              </CardTitle>
              <WorkingBadge />
            </div>
            <CardDescription className="text-caption">
              One-screen briefing of what to do today. Synthesizes follow-ups,
              interviews, saved roles, daily cadence.
            </CardDescription>
          </CardHeader>
          <CardContent aria-live="polite">
            {brief.kind === 'idle' && (
              <Button size="sm" onClick={runBrief} className="gap-1.5">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                Generate today's brief
              </Button>
            )}
            {brief.kind === 'loading' && (
              <p className="inline-flex items-center gap-1.5 text-caption text-muted-foreground" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Synthesizing your agenda...
              </p>
            )}
            {brief.kind === 'done' && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  {brief.headline}
                </p>
                <ul className="max-w-prose space-y-1.5 text-caption text-ink-muted">
                  {brief.lines.map((l, i) => (
                    <li key={i} className="leading-relaxed">{l}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(brief.counts).map(([k, v]) => (
                    <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-caption-sm tabular-nums text-muted-foreground">
                      {k.replace(/_/g, ' ')}: <b className="text-foreground">{v}</b>
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={runBrief} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Regenerate
                </Button>
              </div>
            )}
            {brief.kind === 'error' && (
              <div className="space-y-2">
                <p className="text-caption text-destructive" role="alert">{brief.message}</p>
                <Button size="sm" variant="outline" onClick={runBrief}>Retry</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── #12 JD reverse-search ─────────────────────────────────── */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="inline-flex items-center gap-2 text-title-sm">
                <Compass className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                JD to similar roles
              </CardTitle>
              <WorkingBadge />
            </div>
            <CardDescription className="text-caption">
              Paste a JD you like. Surfaces matching saved/recent roles by
              skill-token overlap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={similarJd}
              onChange={(e) => setSimilarJd(e.target.value)}
              rows={4}
              maxLength={15000}
              aria-label="Job description to match"
              placeholder="Paste the JD you'd like to find more like..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              size="sm"
              onClick={runSimilar}
              disabled={similar.kind === 'loading'}
              aria-busy={similar.kind === 'loading'}
              className="gap-1.5"
            >
              {similar.kind === 'loading' ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Searching...</>
              ) : (
                <><Wand2 className="h-3.5 w-3.5" aria-hidden="true" />Find similar</>
              )}
            </Button>
            <div aria-live="polite">
              {similar.kind === 'done' && (
                <div className="space-y-2 pt-1">
                  {similar.tokens.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {similar.tokens.slice(0, 12).map((t) => (
                        <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-caption-sm text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {similar.results.length === 0 ? (
                    <p className="text-caption text-muted-foreground">
                      No matches in your saved roles. Save more jobs from the pipeline
                      to seed the index.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {similar.results.map((r, i) => {
                        const body = (
                          <>
                            <span className="truncate">
                              <b className="font-medium text-foreground">{r.title}</b>
                              {r.company ? <span className="text-muted-foreground"> · {r.company}</span> : null}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-caption-sm tabular-nums text-signal">
                              {r.score_overlap} match{r.score_overlap === 1 ? '' : 'es'}
                              {r.url && <ChevronRight className="h-3 w-3" aria-hidden="true" />}
                            </span>
                          </>
                        );
                        return (
                          <li key={`${r.url || r.title}-${i}`} className="rounded-md border border-border bg-background">
                            {r.url ? (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex min-h-10 items-center justify-between gap-2 rounded-md px-3 py-2 text-caption transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {body}
                              </a>
                            ) : (
                              <div className="flex min-h-10 items-center justify-between gap-2 px-3 py-2 text-caption">
                                {body}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
              {similar.kind === 'error' && (
                <p className="text-caption text-destructive" role="alert">{similar.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ─── #6 A/B Telemetry ──────────────────────────────────────── */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="inline-flex items-center gap-2 text-title-sm">
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                Resume A/B telemetry
              </CardTitle>
              <WorkingBadge />
            </div>
            <CardDescription className="text-caption">
              Callback rates by resume variant. Tag your tailored submissions to
              see which framing converts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2" aria-live="polite">
            {ab.kind === 'idle' && (
              <Button size="sm" onClick={runAb} className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                Load my stats
              </Button>
            )}
            {ab.kind === 'loading' && (
              <p className="inline-flex items-center gap-1.5 text-caption text-muted-foreground" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Crunching tailoring records...
              </p>
            )}
            {ab.kind === 'done' && (
              <div className="space-y-2">
                <p className="text-caption text-muted-foreground">
                  Across <b className="tabular-nums text-foreground">{ab.total}</b> tailored submission{ab.total === 1 ? '' : 's'}.
                </p>
                {!ab.hasTagged && (
                  <p className="max-w-prose text-caption text-foreground">
                    No variants tagged yet. When you save a tailored resume, set
                    a <code className="font-mono">variant</code> tag (e.g. "A" or "B") to start comparing.
                  </p>
                )}
                {ab.insight && (
                  <div className="rounded-md border border-border bg-muted px-3 py-2">
                    <span className="overline">AI insight</span>
                    <p className="mt-0.5 max-w-prose text-caption leading-relaxed text-foreground">{ab.insight}</p>
                  </div>
                )}
                {ab.variants.length > 0 && (
                  <table className="w-full text-caption">
                    <thead>
                      <tr className="border-b border-border text-left text-caption-sm uppercase text-muted-foreground">
                        <th scope="col" className="py-1.5 font-medium">Variant</th>
                        <th scope="col" className="py-1.5 font-medium tabular-nums">Sent</th>
                        <th scope="col" className="py-1.5 font-medium tabular-nums">Interviews</th>
                        <th scope="col" className="py-1.5 font-medium tabular-nums">Offers</th>
                        <th scope="col" className="py-1.5 font-medium tabular-nums">Callback %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ab.variants.map((v) => (
                        <tr key={v.variant} className="border-b border-border last:border-0">
                          <td className="py-1.5 font-medium">{v.variant}</td>
                          <td className="py-1.5 tabular-nums">{v.total}</td>
                          <td className="py-1.5 tabular-nums">{v.interviewed}</td>
                          <td className="py-1.5 tabular-nums">{v.offers}</td>
                          <td className="py-1.5 font-semibold tabular-nums text-signal">{v.callback_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {ab.kind === 'error' && (
              <div className="space-y-2">
                <p className="text-caption text-destructive" role="alert">{ab.message}</p>
                <Button size="sm" variant="outline" onClick={runAb}>Retry</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── #7 Recruiter scrape (stub) ────────────────────────────── */}
        {/* --- APIFY DISABLED (temporary): Apify recruiter-scrape stub card hidden. Restore to re-enable. ---
        <StubCard
          icon={<Globe className="h-4 w-4 text-chart-8" />}
          title="LinkedIn Recruiter Auto-Discover"
          description="Phase 2 of Reach Out. Apify-scrapes 3 recruiters / hiring managers per Tier 1 row so you don't have to find them manually."
          eta="2 weeks"
          onNotify={() => notify('LinkedIn auto-discover')}
        />
        --- APIFY DISABLED (temporary) --- */}

        {/* ─── #9 Co-applicant (stub) ────────────────────────────────── */}
        <StubCard
          icon={<Bot className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          title="AI Co-Applicant Agent"
          description="The agent loop: scrape, rank, tailor, reach out, fill apply form, flash-prep, thank-you. You show up to interviews."
          eta="6+ weeks"
          onNotify={() => notify('AI Co-Applicant')}
        />

        {/* ─── #10 Chrome extension (stub) ───────────────────────────── */}
        <StubCard
          icon={<Compass className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          title="Apply Autopilot (Chrome ext.)"
          description="Watches Workday/Greenhouse/Lever forms, auto-fills your info, EEO, visa answers, and uploads the matching tailored resume."
          eta="4 weeks"
          onNotify={() => notify('Apply Autopilot')}
        />

        {/* ─── #11 Brand engine (stub) ───────────────────────────────── */}
        <StubCard
          icon={<BellRing className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          title="Personal Brand Auto-Engine"
          description="Weekly LinkedIn post + blog draft + GitHub README updates from your commits. Flips you from applying to being recruited."
          eta="8 weeks"
          onNotify={() => notify('Brand Engine')}
        />
      </div>

      <p className="max-w-prose border-t border-border pt-3 text-caption text-muted-foreground">
        Beta features may be unstable or change behavior. Disable them by simply
        not opening this tab. The rest of the app is unaffected.
      </p>
    </div>
  );
}

/** One "working" chip for every live experiment: a quiet signal tint. */
function WorkingBadge() {
  return (
    <Badge variant="outline" className="shrink-0 border-transparent bg-signal-tint text-caption-sm text-signal">
      Working
    </Badge>
  );
}

function StubCard({
  icon,
  title,
  description,
  eta,
  onNotify,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  eta: string;
  onNotify: () => void;
}) {
  return (
    <Card className="flex flex-col border-dashed bg-transparent shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="inline-flex items-center gap-2 text-title-sm">
            {icon}
            {title}
          </CardTitle>
          <Badge variant="outline" className="shrink-0 border-border text-caption-sm text-muted-foreground">
            Coming soon · ~{eta}
          </Badge>
        </div>
        <CardDescription className="text-caption">{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onNotify}
          className="gap-1.5"
        >
          <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
          Notify me when live
        </Button>
      </CardContent>
    </Card>
  );
}
