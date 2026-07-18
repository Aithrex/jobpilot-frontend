import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle, HelpCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import type { EdgeTask, EdgeVerifyResult } from '@/types/learning';
import { proofMeta } from './edgeShared';

interface VerifyDialogProps {
  open: boolean;
  onClose: () => void;
  pathId: string;
  task: EdgeTask;
  result: EdgeVerifyResult | null;
  onResult: (result: EdgeVerifyResult) => void;
}

const STATUS_UI = {
  verified: {
    icon: CheckCircle2,
    label: 'Verified',
    box: 'border-success/40 bg-success/5',
    tint: 'text-success',
  },
  needs_work: {
    icon: AlertTriangle,
    label: 'Needs work',
    box: 'border-warning/40 bg-warning/5',
    tint: 'text-warning',
  },
  unverifiable: {
    icon: HelpCircle,
    label: "Couldn't verify",
    box: 'border-border bg-muted/40',
    tint: 'text-muted-foreground',
  },
} as const;

export function VerifyDialog({ open, onClose, pathId, task, result, onResult }: VerifyDialogProps) {
  const meta = proofMeta(task.proof_type);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setValue('');
    setLoading(false);
  };

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error(meta.kind === 'url' ? 'Paste your link first.' : 'Paste your write-up first.');
      return;
    }
    setLoading(true);
    const res = await apiService.verifyTask(pathId, task.task_ref, {
      type: task.proof_type,
      ...(meta.kind === 'url' ? { url: trimmed } : { text: trimmed }),
    });
    setLoading(false);
    if (res.error || !res.data) {
      toast.error('Verification failed', { description: res.error || 'Please try again.' });
      return;
    }
    onResult(res.data);
  };

  const StatusIcon = result ? STATUS_UI[result.status].icon : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Verify your proof
          </DialogTitle>
          <DialogDescription>{task.brief}</DialogDescription>
        </DialogHeader>

        {/* Acceptance criteria we check against */}
        {task.acceptance_criteria?.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              We check for
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

        {!result && (
          <div className="space-y-2">
            <label htmlFor="verify-input" className="text-sm font-medium">
              {meta.inputLabel}
            </label>
            {meta.kind === 'url' ? (
              <Input
                id="verify-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && submit()}
                placeholder={meta.placeholder}
                disabled={loading}
                inputMode="url"
              />
            ) : (
              <Textarea
                id="verify-input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={meta.placeholder}
                rows={5}
                disabled={loading}
              />
            )}
            <Button onClick={submit} disabled={loading || !value.trim()} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? 'Checking your proof…' : 'Verify'}
            </Button>
            {loading && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Reading against the acceptance criteria. No fabrication.
              </p>
            )}
          </div>
        )}

        {result && StatusIcon && (
          <div className={cn('rounded-xl border p-4', STATUS_UI[result.status].box)}>
            <p className={cn('flex items-center gap-2 font-semibold', STATUS_UI[result.status].tint)}>
              <StatusIcon className="h-5 w-5" /> {STATUS_UI[result.status].label}
            </p>
            {result.details && <p className="mt-1.5 text-sm text-foreground/90">{result.details}</p>}
            {result.specifics?.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {result.specifics.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-2">
              {result.status !== 'verified' && (
                <Button variant="outline" size="sm" onClick={reset}>
                  Try again
                </Button>
              )}
              <Button
                size="sm"
                variant={result.status === 'verified' ? 'default' : 'ghost'}
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                {result.status === 'verified' ? 'Done' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default VerifyDialog;
