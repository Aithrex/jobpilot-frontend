import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, ListChecks, Loader2, Github, ExternalLink, Copy, Check,
  Lightbulb, Rocket, Ban, ShieldCheck, PartyPopper, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import type { EdgeTask, EdgeVerifyResult } from '@/types/learning';
import { proofMeta } from './edgeShared';
import { VerifyDialog } from './VerifyDialog';
import { ShareWinDialog } from './ShareWinDialog';
import type { EdgeGithubSync } from '@/types/learning';

interface EdgeTaskCardProps {
  pathId: string;
  task: EdgeTask;
  verifyResult: EdgeVerifyResult | null;
  onVerify: (result: EdgeVerifyResult) => void;
}

export function EdgeTaskCard({ pathId, task, verifyResult, onVerify }: EdgeTaskCardProps) {
  const meta = proofMeta(task.proof_type);
  const ProofIcon = meta.icon;

  const [ghLoading, setGhLoading] = useState(false);
  const [gh, setGh] = useState<EdgeGithubSync | null>(null);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const verified = verifyResult?.status === 'verified';
  const canShare = verified || !!verifyResult?.post_draft_available;

  const syncGithub = async () => {
    setGhLoading(true);
    const res = await apiService.syncTaskGithub(pathId, task.task_ref);
    setGhLoading(false);
    if (res.error || !res.data) {
      toast.error('Could not sync GitHub', { description: res.error || 'Please try again.' });
      return;
    }
    setGh(res.data);
    if (res.data.repo_url && res.data.created) toast.success('Repo created');
  };

  const copyStep = async (step: string, i: number) => {
    await navigator.clipboard.writeText(step);
    setCopiedStep(i);
    setTimeout(() => setCopiedStep(null), 1400);
  };

  return (
    <Card className={cn('p-4', verified && 'border-success/30 bg-success/[0.03]')}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold',
            verified ? 'bg-success text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
          aria-hidden
        >
          {verified ? <Check className="h-4 w-4" /> : `D${task.day}`}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Day {task.day} · Task {task.task_no}
            </span>
            <Badge variant="outline" className="gap-1 font-normal">
              <ProofIcon className="h-3 w-3" /> {meta.label}
            </Badge>
            {verified && (
              <Badge className="gap-1 bg-success text-primary-foreground hover:bg-success">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>

          <p className="mt-1.5 font-semibold leading-snug">{task.brief}</p>

          {/* Acceptance criteria */}
          {task.acceptance_criteria?.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" /> Done when
              </p>
              <ul className="space-y-1">
                {task.acceptance_criteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Guided extras */}
          {task.scaffold_hint && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/50 p-2.5 text-sm">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span><span className="font-medium">Scaffold:</span> {task.scaffold_hint}</span>
            </p>
          )}
          {task.sub_steps && task.sub_steps.length > 0 && (
            <ol className="mt-2 space-y-1">
              {task.sub_steps.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <span className="mt-0.5 font-mono text-xs text-primary">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}

          {/* Advanced stretch */}
          {task.stretch && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-sm">
              <Rocket className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              <span><span className="font-medium">Stretch:</span> {task.stretch}</span>
            </p>
          )}

          {/* Constraints */}
          {task.constraints?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {task.constraints.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  <Ban className="h-3 w-3" /> {c}
                </span>
              ))}
            </div>
          )}

          {/* GitHub sync result */}
          {gh && (
            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3">
              {gh.repo_url ? (
                <a
                  href={gh.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Github className="h-4 w-4" /> {gh.repo_url.replace(/^https?:\/\//, '')}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-sm font-medium">Push your work</p>
              )}
              {gh.push_instructions?.length > 0 && (
                <ol className="mt-2 space-y-1.5">
                  {gh.push_instructions.map((step, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 text-xs">{step}</code>
                      <button
                        onClick={() => copyStep(step, i)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label="Copy command"
                      >
                        {copiedStep === i ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={syncGithub} disabled={ghLoading}>
              {ghLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
              Sync GitHub
            </Button>

            {!verified ? (
              <Button size="sm" onClick={() => setVerifyOpen(true)}>
                <ShieldCheck className="h-3.5 w-3.5" /> Mark done → verify
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                <Check className="h-4 w-4" /> Verified
              </span>
            )}

            {canShare && (
              <Button size="sm" variant={verified ? 'default' : 'outline'} onClick={() => setShareOpen(true)}>
                <PartyPopper className="h-3.5 w-3.5" /> Share this win
              </Button>
            )}
          </div>

          {/* Coach message for needs_work / unverifiable, shown inline after dialog closes */}
          {verifyResult && verifyResult.status !== 'verified' && (
            <button
              onClick={() => setVerifyOpen(true)}
              className={cn(
                'mt-3 flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                verifyResult.status === 'needs_work'
                  ? 'border-warning/40 bg-warning/5 hover:bg-warning/10'
                  : 'border-border bg-muted/40 hover:bg-muted/60',
              )}
            >
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'font-medium',
                    verifyResult.status === 'needs_work' ? 'text-warning' : 'text-muted-foreground',
                  )}
                >
                  {verifyResult.status === 'needs_work' ? 'Almost there: ' : "Couldn't verify: "}
                </span>
                {verifyResult.details}
              </span>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <VerifyDialog
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        pathId={pathId}
        task={task}
        result={verifyResult}
        onResult={onVerify}
      />
      <ShareWinDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        pathId={pathId}
        task={task}
      />
    </Card>
  );
}

export default EdgeTaskCard;
