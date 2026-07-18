import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { apiService } from '@/lib/api';
import { useUpgrade } from '@/components/billing/UpgradeModalProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  GraduationCap, Sparkles, Plus, ArrowLeft, Check, CheckCircle2, Loader2,
  Trophy, Target, BookOpen, Briefcase, Brain, ExternalLink, Compass, BookMarked,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { YourEdge } from '@/components/resume/learning/YourEdge';
import { MarketTrends } from '@/components/resume/learning/MarketTrends';
import type { LearningPath, LearningProgress, ModuleCompletionResult, Quiz } from '@/types/learning';

type HubMode = 'edge' | 'topics';

function isUpgrade(res: { status?: number; errorPayload?: Record<string, unknown> }) {
  return res.status === 403 && res.errorPayload?.error === 'upgrade_required';
}

interface LearningHubTabProps {
  /** Mounted inside the /next app shell — the shell already renders the page
      header + SubNav, so suppress the internal hero and top padding. */
  embedded?: boolean;
}

export default function LearningHubTab({ embedded }: LearningHubTabProps) {
  // Shell pages pass `embedded` via outlet context (the routes in App.tsx
  // mount this component without props); the legacy /app monolith passes
  // neither, so it renders unchanged.
  const shellCtx = useOutletContext<{ embedded?: boolean } | null>();
  const isEmbedded = embedded ?? shellCtx?.embedded ?? false;
  const qc = useQueryClient();
  const reduceMotion = useReducedMotion();
  const { open: openUpgrade } = useUpgrade();
  const [selected, setSelected] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<HubMode>('edge');
  // Feature-flag: the "Your edge" surface hides itself on a 404 from the backend.
  const [edgeAvailable, setEdgeAvailable] = useState(true);

  const pathsQuery = useQuery({
    queryKey: ['learning-paths'],
    queryFn: async () => {
      const res = await apiService.getLearningPaths();
      if (res.error) throw new Error(res.error);
      return res.data?.paths ?? [];
    },
  });

  const create = async () => {
    const t = topic.trim();
    if (!t) return;
    setCreating(true);
    const res = await apiService.createLearningPlan(t);
    setCreating(false);
    if (isUpgrade(res)) {
      openUpgrade({ feature: 'learning', title: 'Unlock more learning paths', description: 'Free includes one active path. Upgrade for more topics and capstones.' });
      return;
    }
    if (res.error || !res.data) {
      toast.error('Could not build plan', { description: res.error || 'Please try again.' });
      return;
    }
    setTopic('');
    toast.success('Your learning plan is ready!');
    qc.invalidateQueries({ queryKey: ['learning-paths'] });
    setSelected(res.data.path_id);
  };

  if (selected) {
    return <PathDetail pathId={selected} onBack={() => setSelected(null)} embedded={isEmbedded} />;
  }

  return (
    <div className={cn('space-y-6', isEmbedded ? 'max-w-3xl' : 'mx-auto max-w-3xl p-4')}>
      {isEmbedded ? (
        // The shell page renders the h1 + SubNav — keep only the one line of
        // section context so we don't stack a second hero under them.
        <p className="max-w-xl text-caption text-muted-foreground">
          Close the gap to the role you want. Find your trending market edge and build it with
          verified proof, or get an AI study plan for any topic.
        </p>
      ) : (
        <header className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Grow · Learning</p>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Learning Hub</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Close the gap to the role you want. Find your trending market edge and build it with
            verified proof, or get an AI study plan for any topic.
          </p>
        </header>
      )}

      {/* Cross-user market trend signal — what the whole corpus is asking for. */}
      <MarketTrends onPlanCreated={(pathId) => setSelected(pathId)} />

      {/* Mode switch: the market-driven "Your edge" loop vs. free-form topics. */}
      {edgeAvailable && (
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {([
            { id: 'edge', label: 'Your edge', icon: Compass },
            { id: 'topics', label: 'Topics', icon: BookMarked },
          ] as const).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'edge' && edgeAvailable && (
        <YourEdge
          onUnavailable={() => {
            setEdgeAvailable(false);
            setMode('topics');
          }}
        />
      )}

      {mode === 'topics' && (
        <>
      {/* Create */}
      <Card className="p-4">
        <label className="mb-2 block text-sm font-medium">What do you want to learn?</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !creating && create()}
            placeholder="e.g. System design, Docker, SQL for analytics…"
            disabled={creating}
          />
          <Button onClick={create} disabled={creating || !topic.trim()} className="shrink-0">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? 'Building…' : 'Create plan'}
          </Button>
        </div>
        {creating && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Designing a week-by-week plan grounded in your skills. This takes ~20s.
          </p>
        )}
      </Card>

      {/* Paths */}
      {pathsQuery.isLoading ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : pathsQuery.isError ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Couldn't load your learning paths.</p>
            <p className="text-xs opacity-80">{pathsQuery.error instanceof Error ? pathsQuery.error.message : 'Please try again.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => pathsQuery.refetch()}>Retry</Button>
        </div>
      ) : (pathsQuery.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">No learning paths yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Type a topic above and we'll build a week-by-week plan around your skills.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pathsQuery.data!.map((p, i) => (
            <motion.button
              key={p.path_id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(p.path_id)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-panel"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.total_modules} modules · {p.topic}</p>
                </div>
                {p.status === 'completed' ? (
                  <Badge className="shrink-0 gap-1"><Trophy className="h-3 w-3" /> Done</Badge>
                ) : (
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">{p.percent}%</span>
                )}
              </div>
              <Progress value={p.percent} className="mt-3 h-1.5" />
            </motion.button>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}

function PathDetail({ pathId, onBack, embedded }: { pathId: string; onBack: () => void; embedded?: boolean }) {
  const qc = useQueryClient();
  const [completing, setCompleting] = useState<number | null>(null);
  const [lastUnlock, setLastUnlock] = useState<ModuleCompletionResult | null>(null);
  const [quiz, setQuiz] = useState<{ week: number; quiz: Quiz } | null>(null);
  const [quizLoading, setQuizLoading] = useState<number | null>(null);

  const detail = useQuery({
    queryKey: ['learning-path', pathId],
    queryFn: async () => {
      const res = await apiService.getLearningPath(pathId);
      if (res.error) throw new Error(res.error);
      return res.data as { path: LearningPath; progress: LearningProgress };
    },
  });

  const completeModule = async (week: number) => {
    setCompleting(week);
    const res = await apiService.completeLearningModule(pathId, week);
    setCompleting(null);
    if (res.error || !res.data) {
      toast.error('Could not save progress', { description: res.error });
      return;
    }
    setLastUnlock(res.data);
    if (res.data.earned_skill) {
      toast.success(`Skill earned: ${res.data.earned_skill}`, {
        description: res.data.unlocked_jobs.length
          ? `${res.data.unlocked_jobs.length} saved job(s) need this skill.`
          : 'Added to your profile.',
      });
    }
    qc.invalidateQueries({ queryKey: ['learning-path', pathId] });
    qc.invalidateQueries({ queryKey: ['learning-paths'] });
  };

  const startQuiz = async (week: number) => {
    setQuizLoading(week);
    const res = await apiService.generateLearningQuiz(pathId, week);
    setQuizLoading(null);
    if (res.status === 403 && res.errorPayload?.error === 'upgrade_required') {
      toast('Daily quiz limit reached. Upgrade for more.');
      return;
    }
    if (res.error || !res.data?.questions?.length) {
      toast.error('Could not generate quiz', { description: res.error });
      return;
    }
    setQuiz({ week, quiz: res.data });
  };

  if (detail.isError) {
    return (
      <div className={cn('space-y-4', embedded ? 'max-w-3xl' : 'mx-auto max-w-3xl p-4')}>
        <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All paths
        </button>
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Couldn't load this path.</p>
            <p className="text-xs opacity-80">{detail.error instanceof Error ? detail.error.message : 'Please try again.'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => detail.refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (detail.isLoading || !detail.data) {
    return (
      <div className={cn('space-y-4', embedded ? 'max-w-3xl' : 'mx-auto max-w-3xl p-4')} aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const { path, progress } = detail.data;
  const done = new Set(progress.completed_step_ids);

  return (
    <div className={cn('space-y-5', embedded ? 'max-w-3xl' : 'mx-auto max-w-3xl p-4')}>
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All paths
      </button>

      <header className="space-y-1.5">
        <h2 className="font-display text-2xl font-bold tracking-tight">{path.title}</h2>
        {path.summary && <p className="text-sm text-muted-foreground">{path.summary}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary" className="gap-1"><Trophy className="h-3 w-3" /> {progress.xp_earned} XP</Badge>
          {path.target_role && <Badge variant="outline" className="gap-1"><Target className="h-3 w-3" /> {path.target_role}</Badge>}
          {(path.target_skills ?? []).slice(0, 4).map((s) => (
            <Badge key={s} variant="outline">{s}</Badge>
          ))}
        </div>
      </header>

      {lastUnlock && lastUnlock.unlocked_jobs.length > 0 && (
        <Card className="border-primary/40 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Briefcase className="h-4 w-4" /> {lastUnlock.earned_skill} unlocked {lastUnlock.unlocked_jobs.length} saved job(s)
          </p>
          <ul className="mt-2 space-y-1.5">
            {lastUnlock.unlocked_jobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{j.title}{j.company ? ` · ${j.company}` : ''}</span>
                {j.url && (
                  <a href={j.url} target="_blank" rel="noreferrer" className="shrink-0 text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ol className="space-y-3">
        {path.modules.map((m) => {
          const isDone = done.has(`week-${m.week}`);
          return (
            <li key={m.week}>
              <Card className={`p-4 ${isDone ? 'border-primary/30 bg-primary/[0.03]' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${isDone ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {isDone ? <Check className="h-4 w-4" /> : m.week}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{m.title}</p>
                    {m.objective && <p className="mt-0.5 text-sm text-muted-foreground">{m.objective}</p>}
                    {m.concepts && m.concepts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.concepts.map((c) => <Badge key={c} variant="outline" className="font-normal">{c}</Badge>)}
                      </div>
                    )}
                    {m.practice_task && (
                      <p className="mt-2 flex items-start gap-1.5 text-sm">
                        <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span><span className="font-medium">Practice:</span> {m.practice_task}</span>
                      </p>
                    )}
                    {m.inferred_skill && (
                      <p className="mt-1.5 text-xs text-muted-foreground">Proves: <span className="font-medium text-foreground">{m.inferred_skill}</span></p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => startQuiz(m.week)} disabled={quizLoading === m.week}>
                        {quizLoading === m.week ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                        Quiz
                      </Button>
                      {!isDone ? (
                        <Button size="sm" onClick={() => completeModule(m.week)} disabled={completing === m.week}>
                          {completing === m.week ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Mark complete
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary"><Check className="h-4 w-4" /> Completed</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>

      {path.capstone && (
        <Card className="border-warning/40 bg-warning/[0.04] p-4">
          <p className="flex items-center gap-2 font-semibold"><Trophy className="h-4 w-4 text-warning" /> Capstone: {path.capstone.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{path.capstone.description}</p>
        </Card>
      )}

      <QuizDialog data={quiz} onClose={() => setQuiz(null)} />
    </div>
  );
}

function QuizDialog({ data, onClose }: { data: { week: number; quiz: Quiz } | null; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  if (!data) return null;
  const score = data.quiz.questions.reduce((n, q, i) => n + (answers[i] === q.answer_index ? 1 : 0), 0);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) { setAnswers({}); setChecked(false); onClose(); } }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick quiz · Week {data.week}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {data.quiz.questions.map((q, qi) => (
            <div key={qi}>
              <p className="mb-2 text-sm font-medium">{qi + 1}. {q.question}</p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const picked = answers[qi] === oi;
                  const correct = checked && oi === q.answer_index;
                  const wrong = checked && picked && oi !== q.answer_index;
                  return (
                    <button
                      key={oi}
                      onClick={() => !checked && setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        correct ? 'border-success bg-success/10' : wrong ? 'border-destructive bg-destructive/10' : picked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs">{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {checked && q.explanation && <p className="mt-1.5 text-xs text-muted-foreground">{q.explanation}</p>}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          {checked ? <span className="text-sm font-semibold">Score: {score} / {data.quiz.questions.length}</span> : <span />}
          {!checked ? (
            <Button onClick={() => setChecked(true)} disabled={Object.keys(answers).length < data.quiz.questions.length}>Check answers</Button>
          ) : (
            <Button variant="outline" onClick={() => { setAnswers({}); setChecked(false); onClose(); }}>Done</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
