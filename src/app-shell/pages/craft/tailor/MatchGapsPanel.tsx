/**
 * Tiered match-gap guidance. Replaces one-click missing-keyword chips.
 *
 * defensible — user must point at a bullet (or write one) before anything
 * is added. learnable — genuine gap, no add affordance. stretch — collapsed.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, HelpCircle, Info, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { MatchGapItem, MatchGaps, TailoredFullResume } from '@/types/resume';

export interface EvidenceTarget {
  section: 'experience' | 'projects';
  itemIndex: number;
  bulletIndex: number;
  clause: string;
  asNewBullet?: boolean;
}

interface MatchGapsPanelProps {
  gaps: MatchGaps | null | undefined;
  resume: TailoredFullResume | null;
  onAttachEvidence: (term: string, target: EvidenceTarget) => void;
}

type BulletOpt = {
  id: string;
  section: 'experience' | 'projects';
  itemIndex: number;
  bulletIndex: number;
  label: string;
  text: string;
};

function bulletOptions(resume: TailoredFullResume | null): BulletOpt[] {
  if (!resume) return [];
  const out: BulletOpt[] = [];
  (resume.experience || []).forEach((exp, i) => {
    (exp.bullets || []).forEach((b, j) => {
      if (!b?.trim()) return;
      out.push({
        id: `experience.${i}.bullets.${j}`,
        section: 'experience',
        itemIndex: i,
        bulletIndex: j,
        label: exp.title ? `${exp.title}` : `Role ${i + 1}`,
        text: b,
      });
    });
  });
  (resume.projects || []).forEach((proj, i) => {
    (proj.bullets || []).forEach((b, j) => {
      if (!b?.trim()) return;
      out.push({
        id: `projects.${i}.bullets.${j}`,
        section: 'projects',
        itemIndex: i,
        bulletIndex: j,
        label: proj.name ? `Project: ${proj.name}` : `Project ${i + 1}`,
        text: b,
      });
    });
  });
  return out;
}

function DefensibleRow({
  entry,
  options,
  onAttach,
}: {
  entry: MatchGapItem;
  options: BulletOpt[];
  onAttach: (term: string, target: EvidenceTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [clause, setClause] = useState('');
  const [asNew, setAsNew] = useState(false);

  const canSubmit = clause.trim().length >= 12 && (asNew || selected);

  return (
    <div className="rounded-control border border-border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-foreground">{entry.item}</p>
          {entry.why && (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {entry.why}
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1 px-2 text-[11px]"
          onClick={() => setOpen((v) => !v)}
        >
          <MapPin className="h-3 w-3" />
          Where did you use it?
        </Button>
      </div>
      {open && (
        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
          <p className="text-[11px] text-muted-foreground">
            Point at a bullet and add a short clause naming how you used{' '}
            <span className="font-medium text-foreground">{entry.item}</span>.
            We will not add it as a bare skill.
          </p>
          {options.length > 0 && (
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setAsNew(false);
              }}
              className="w-full rounded-control border border-border bg-background px-2 py-1.5 text-[11px] text-foreground"
            >
              <option value="">Select a bullet…</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}: {opt.text.slice(0, 80)}
                  {opt.text.length > 80 ? '…' : ''}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={asNew}
              onChange={(e) => setAsNew(e.target.checked)}
            />
            Write a new bullet on the most recent role instead
          </label>
          <Textarea
            value={clause}
            onChange={(e) => setClause(e.target.value)}
            placeholder={`How you used ${entry.item} (at least a short clause)`}
            className="min-h-[64px] text-[12px]"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-[11px]"
            disabled={!canSubmit}
            onClick={() => {
              const opt = options.find((o) => o.id === selected);
              const fallback = options[0];
              const target = asNew || !opt ? fallback : opt;
              if (!target && !asNew) return;
              onAttach(entry.item, {
                section: target?.section ?? 'experience',
                itemIndex: target?.itemIndex ?? 0,
                bulletIndex: asNew ? -1 : (target?.bulletIndex ?? 0),
                clause: clause.trim(),
                asNewBullet: asNew || !opt,
              });
              setOpen(false);
              setClause('');
            }}
          >
            Attach evidence
          </Button>
        </div>
      )}
    </div>
  );
}

export function MatchGapsPanel({
  gaps,
  resume,
  onAttachEvidence,
}: MatchGapsPanelProps) {
  const [stretchOpen, setStretchOpen] = useState(false);
  const options = useMemo(() => bulletOptions(resume), [resume]);

  if (!gaps) return null;
  const defensible = gaps.defensible || [];
  const learnable = gaps.learnable || [];
  const stretch = gaps.stretch || [];
  if (!defensible.length && !learnable.length && !stretch.length) return null;

  return (
    <div className="space-y-4">
      {defensible.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">
            You likely have these
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Adjacent to what you already do. Adding requires pointing at a
            bullet — listing them in Skills earns no credit.
          </p>
          <div className="space-y-1.5">
            {defensible.map((entry) => (
              <DefensibleRow
                key={entry.item}
                entry={entry}
                options={options}
                onAttach={onAttachEvidence}
              />
            ))}
          </div>
        </div>
      )}

      {learnable.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <HelpCircle className="h-3.5 w-3.5 text-warning" />
            Genuine gaps
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Not on this resume. Do not add them unless you have used them.
          </p>
          <ul className="space-y-1.5">
            {learnable.map((entry) => (
              <li
                key={entry.item}
                className="rounded-control border border-warning/25 bg-warning/5 px-3 py-2"
              >
                <p className="text-[12.5px] font-medium text-foreground">{entry.item}</p>
                {entry.why && (
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {entry.why}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stretch.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setStretchOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Stretch requirements ({stretch.length})
            </span>
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', stretchOpen && 'rotate-180')}
            />
          </button>
          {stretchOpen && (
            <ul className="mt-2 space-y-1.5">
              {stretch.map((entry) => (
                <li
                  key={entry.item}
                  className="rounded-control border border-border bg-muted/40 px-3 py-2"
                >
                  <p className="text-[12.5px] font-medium text-foreground">{entry.item}</p>
                  {entry.why && (
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {entry.why}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
