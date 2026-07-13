/**
 * ReviewPanel — human-in-the-loop review of AI-written claims.
 *
 * Renders the verification sidecar (claim-guard flags + entailment
 * verdicts) as a review queue: flagged claims first (UNSUPPORTED before
 * PARTIAL), each with why-it-was-flagged and the facts that back it, plus
 * Accept / Restore original / Remove / Edit actions. Presentational —
 * all mutations live in the TailorPage orchestrator.
 */
import { useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Check,
  Undo2,
  Trash2,
  Pencil,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type {
  TailoredFullResume,
  ResumeVerification,
  VerificationItem,
  BulletVerdict,
} from '@/types/resume';
import type { ReviewDecision } from './types';

const SURFACE = 'rounded-container border border-border bg-card p-5 shadow-soft';

const VERDICT_META: Record<
  BulletVerdict,
  { label: string; cls: string; icon: typeof ShieldCheck }
> = {
  SUPPORTED: {
    label: 'Supported',
    cls: 'border-success/30 bg-success/10 text-success',
    icon: ShieldCheck,
  },
  PARTIAL: {
    label: 'Partly supported',
    cls: 'border-warning/30 bg-warning/10 text-warning',
    icon: ShieldQuestion,
  },
  UNSUPPORTED: {
    label: 'Unsupported',
    cls: 'border-destructive/30 bg-destructive/10 text-destructive',
    icon: ShieldAlert,
  },
  UNVERIFIED: {
    label: 'Not verified',
    cls: 'border-border bg-muted text-muted-foreground',
    icon: ShieldQuestion,
  },
};

const FLAG_LABELS: Record<string, string> = {
  ungrounded_metric: 'contains a number with no source in your resume',
  downgraded_metric: 'an unsourced number was removed',
  unsupported_product: 'names a JD tool your resume never mentions',
};

const VERDICT_ORDER: Record<BulletVerdict, number> = {
  UNSUPPORTED: 0,
  PARTIAL: 1,
  UNVERIFIED: 2,
  SUPPORTED: 3,
};

interface ReviewPanelProps {
  resume: TailoredFullResume | null;
  decisions: Record<string, ReviewDecision>;
  hasBaseResume: boolean;
  onAccept: (address: string) => void;
  onRestore: (address: string) => void;
  onRemove: (address: string) => void;
  onEdit: (address: string, text: string) => void;
}

function ReviewCard({
  address,
  item,
  decision,
  hasBaseResume,
  onAccept,
  onRestore,
  onRemove,
  onEdit,
}: {
  address: string;
  item: VerificationItem;
  decision?: ReviewDecision;
  hasBaseResume: boolean;
  onAccept: (a: string) => void;
  onRestore: (a: string) => void;
  onRemove: (a: string) => void;
  onEdit: (a: string, text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const meta = VERDICT_META[item.verdict];
  const Icon = meta.icon;
  const resolved = decision !== undefined;
  const isSummary = address.startsWith('summary.');

  return (
    <div
      className={cn(
        'rounded-container border p-4 transition-opacity',
        item.verdict === 'UNSUPPORTED' && !resolved
          ? 'border-destructive/40 bg-destructive/[0.04]'
          : item.verdict === 'PARTIAL' && !resolved
            ? 'border-warning/40 bg-warning/[0.04]'
            : 'border-border bg-card',
        resolved && 'opacity-70',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-control border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            meta.cls,
          )}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
        {resolved && (
          <span className="text-[10px] font-medium capitalize text-muted-foreground">
            {decision}
          </span>
        )}
      </div>

      <p className="text-[12.5px] leading-relaxed text-foreground">{item.text}</p>

      {item.unsupported_claim && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Flagged:{' '}
          <span className="font-medium text-foreground">
            “{item.unsupported_claim}”
          </span>
          {item.flags.length > 0 && (
            <> — {item.flags.map((f) => FLAG_LABELS[f] ?? f).join('; ')}</>
          )}
        </p>
      )}

      {item.evidence_display && item.evidence_display.length > 0 && (
        <div className="mt-2 space-y-1 rounded-control bg-muted/60 p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Backed by
          </p>
          {item.evidence_display.slice(0, 3).map((ev, i) => (
            <p key={i} className="text-[11px] leading-snug text-muted-foreground">
              {ev}
            </p>
          ))}
        </div>
      )}

      {editing ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[72px] text-[12.5px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 px-3 text-[11px]"
              onClick={() => {
                onEdit(address, draft.trim());
                setEditing(false);
              }}
              disabled={!draft.trim()}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-[11px]"
              onClick={() => {
                setDraft(item.text);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        !resolved && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5 text-[11px] hover:border-success/50 hover:text-success"
              onClick={() => onAccept(address)}
            >
              <Check className="h-3 w-3" /> Accept
            </Button>
            {!isSummary && hasBaseResume && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2.5 text-[11px]"
                onClick={() => onRestore(address)}
              >
                <Undo2 className="h-3 w-3" /> Restore original
              </Button>
            )}
            {!isSummary && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2.5 text-[11px] hover:border-destructive/50 hover:text-destructive"
                onClick={() => onRemove(address)}
              >
                <Trash2 className="h-3 w-3" /> Remove
              </Button>
            )}
            {!isSummary && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2.5 text-[11px]"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            )}
          </div>
        )
      )}
    </div>
  );
}

export function ReviewPanel({
  resume,
  decisions,
  hasBaseResume,
  onAccept,
  onRestore,
  onRemove,
  onEdit,
}: ReviewPanelProps) {
  const [filter, setFilter] = useState<'flagged' | 'all'>('flagged');
  const verification: ResumeVerification | undefined = resume?.verification;

  const sorted = useMemo(() => {
    const entries = Object.entries(verification?.items ?? {});
    return entries.sort(
      (a, b) => VERDICT_ORDER[a[1].verdict] - VERDICT_ORDER[b[1].verdict],
    );
  }, [verification]);

  if (!verification || sorted.length === 0) {
    return (
      <div className="p-6 text-center">
        <ShieldQuestion className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No verification data yet — it's generated automatically with each
          tailoring run.
        </p>
      </div>
    );
  }

  const flagged = sorted.filter(
    ([, item]) => item.verdict === 'UNSUPPORTED' || item.verdict === 'PARTIAL',
  );
  const shown = filter === 'flagged' ? flagged : sorted;
  const { counts } = verification;

  return (
    <div className="space-y-4 p-5 sm:p-6">
      <div className={SURFACE}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Claim verification
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Every line checked against your resume
              {verification.status === 'skipped'
                ? ' — verification was skipped this run'
                : ''}
              . {counts.supported} supported · {counts.partial} partial ·{' '}
              {counts.unsupported} unsupported
              {counts.unverified > 0 ? ` · ${counts.unverified} unverified` : ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-1 rounded-control border border-border bg-muted/60 p-0.5">
            {(['flagged', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-control px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                  filter === f
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f === 'flagged' ? `Flagged (${flagged.length})` : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-container border border-success/30 bg-success/5 p-5 text-center">
          <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-success" />
          <p className="text-sm font-medium text-foreground">
            Nothing needs your review
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Every claim is backed by your resume.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map(([address, item]) => (
            <ReviewCard
              key={address}
              address={address}
              item={item}
              decision={decisions[address]}
              hasBaseResume={hasBaseResume}
              onAccept={onAccept}
              onRestore={onRestore}
              onRemove={onRemove}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
