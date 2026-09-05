/**
 * Canonical match-gap guidance.
 *
 * already_demonstrated — covered; expandable matched text, no task.
 * Genuine unknowns stay optional. Recheck never rewrites the resume.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, HelpCircle, Info } from 'lucide-react';

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

function DemonstratedRow({ entry }: { entry: MatchGapItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-control border border-border bg-card px-3 py-2.5">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-foreground">{entry.item}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Shown on the resume{entry.section ? ` · ${entry.section}` : ''}
          </p>
        </div>
        <ChevronDown className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 space-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
          {entry.span && (
            <p className="leading-snug text-foreground">“{entry.span.trim()}”</p>
          )}
          {entry.why && <p>{entry.why}</p>}
          {entry.match_method && <p>Match: {entry.match_method}</p>}
        </div>
      )}
    </div>
  );
}

function OptionalExperienceRow({
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
          className="h-7 shrink-0 px-2 text-[11px]"
          onClick={() => setOpen((v) => !v)}
        >
          Have relevant experience?
        </Button>
      </div>
      {open && (
        <div className="mt-2.5 space-y-2 border-t border-border pt-2.5">
          <p className="text-[11px] text-muted-foreground">
            Optional. Add experience only if you actually used{' '}
            <span className="font-medium text-foreground">{entry.item}</span>
            {' '}on a specific job or project. This does not rewrite the rest of the resume.
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
              <option value="">Select a job or project…</option>
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
            Write a new bullet on the selected role
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
              if (!opt && !asNew) return;
              if (!opt) return;
              onAttach(entry.item, {
                section: opt.section,
                itemIndex: opt.itemIndex,
                bulletIndex: asNew ? -1 : opt.bulletIndex,
                clause: clause.trim(),
                asNewBullet: asNew,
              });
              setOpen(false);
              setClause('');
            }}
          >
            Add this experience
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
  const demonstrated = gaps.already_demonstrated || [];
  const defensible = gaps.defensible || [];
  const learnable = gaps.learnable || [];
  const stretch = gaps.stretch || [];
  if (
    !demonstrated.length &&
    !defensible.length &&
    !learnable.length &&
    !stretch.length &&
    !gaps.incomplete
  ) {
    return null;
  }

  return (
    <div className="space-y-4">
      {gaps.incomplete && (
        <p className="text-[11px] text-muted-foreground">
          Some requirement checks could not be completed. This is not a perfect match score.
        </p>
      )}

      {demonstrated.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">
            Already shown
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            These requirements are on the final resume. Expand to see the matched text.
            No evidence attachment is needed.
          </p>
          <div className="space-y-1.5">
            {demonstrated.map((entry) => (
              <DemonstratedRow key={entry.item} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {defensible.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-foreground">
            Related experience (optional)
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Adjacent to what you already do. Add only if you have used the named tool
            or responsibility. Skills-list mentions can satisfy a skills-list requirement;
            production use, ownership, and duration need the matching context.
          </p>
          <div className="space-y-1.5">
            {defensible.map((entry) => (
              <OptionalExperienceRow
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
            Not shown on this resume
          </p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Not found after a complete search of the final document. Do not add them
            unless you have used them on a real job or project.
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
