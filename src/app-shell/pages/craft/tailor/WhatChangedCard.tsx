/**
 * WhatChangedCard — a compact "what the regeneration did" summary. Diffs the
 * previous vs current tailored resume into 4 stat tiles: bullets added /
 * removed / edited (heuristic) and keywords added.
 *
 * Presentational: pure derivation from the two resume props, memoized.
 */
import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TailoredFullResume } from './types';

function bulletSet(resume: TailoredFullResume): Set<string> {
  const set = new Set<string>();
  for (const e of resume.experience || [])
    for (const b of e.bullets || []) set.add(b.trim());
  for (const p of resume.projects || [])
    for (const b of p.bullets || []) set.add(b.trim());
  return set;
}

function skillSet(resume: TailoredFullResume): Set<string> {
  const set = new Set<string>();
  for (const v of Object.values(resume.skills || {}))
    if (Array.isArray(v)) v.forEach((s) => set.add(s.toLowerCase()));
  return set;
}

export function WhatChangedCard({
  previous,
  current,
}: {
  previous: TailoredFullResume;
  current: TailoredFullResume;
}) {
  const stats = useMemo(() => {
    const prevBullets = bulletSet(previous);
    const currBullets = bulletSet(current);
    const added = [...currBullets].filter((b) => !prevBullets.has(b)).length;
    const removed = [...prevBullets].filter((b) => !currBullets.has(b)).length;
    const edited = Math.min(added, removed); // best-effort heuristic
    const prevSkills = skillSet(previous);
    const currSkills = skillSet(current);
    const keywordsAdded = [...currSkills].filter((s) => !prevSkills.has(s)).length;
    return [
      { n: added, label: 'bullets added', cls: 'text-success', sign: '+' },
      { n: removed, label: 'bullets removed', cls: 'text-destructive', sign: '−' },
      { n: edited, label: 'bullets edited', cls: 'text-warning', sign: '~' },
      { n: keywordsAdded, label: 'keywords added', cls: 'text-primary', sign: '+' },
    ];
  }, [previous, current]);

  return (
    <div className="rounded-container border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-control bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          What Changed
        </p>
        <span className="text-[10px] text-muted-foreground">· vs previous version</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-control surface p-2.5"
          >
            <p
              className={cn(
                'text-lg font-bold tabular-nums leading-none',
                stat.cls,
              )}
            >
              {stat.sign}
              {stat.n}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
