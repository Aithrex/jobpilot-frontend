/**
 * RequirementsChips - color-coded matched/missing skill chips extracted from
 * the JD analysis. Matched (found in the tailored resume) → success tint;
 * missing → warning tint. Preferred skills stay neutral unless matched.
 *
 * Presentational: computes the match set internally from the tailored resume
 * haystack (skills + summary + experience + project bullets).
 */
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JDAnalysis, TailoredFullResume } from './types';

export function RequirementsChips({
  jdAnalysis,
  tailoredResume,
}: {
  jdAnalysis: JDAnalysis;
  tailoredResume: TailoredFullResume;
}) {
  // Normalized haystack of everything the candidate actually has, so JD skills
  // can be matched against real resume content.
  const resumeHaystack = (() => {
    const parts: string[] = [];
    const sk = tailoredResume.skills || {};
    for (const v of Object.values(sk)) {
      if (Array.isArray(v)) parts.push(...v);
    }
    parts.push(tailoredResume.summary || '');
    for (const exp of tailoredResume.experience || []) {
      parts.push(exp.title || '', ...(exp.bullets || []));
    }
    for (const p of tailoredResume.projects || []) {
      parts.push(p.name || '', ...(p.bullets || []));
    }
    return parts.join(' ').toLowerCase();
  })();

  const isMatched = (skill: string) => {
    const s = skill.toLowerCase().trim();
    if (!s) return false;
    return resumeHaystack.includes(s);
  };

  const required = jdAnalysis.required_skills || [];
  const preferred = jdAnalysis.preferred_skills || [];
  const requiredShown = required.slice(0, 14);
  const matchedCount = requiredShown.filter(isMatched).length;

  return (
    <div className="relative pt-3 mt-1">
      {/* Connector line from the input above */}
      <div className="absolute -top-0 left-8 w-px h-3 bg-primary/30" />
      <div className="surface-muted rounded-container p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Extracted Requirements
          </span>
          <span className="text-[10px] text-muted-foreground">
            · auto-detected from job posting
          </span>
        </div>

        <div>
          <p className="text-[11px] font-medium text-muted-foreground mb-1">Role</p>
          <p className="text-sm font-medium text-foreground">
            {jdAnalysis.job_title}
            {jdAnalysis.company && jdAnalysis.company !== 'Not specified' && (
              <>
                {' '}
                at{' '}
                <span className="text-muted-foreground">{jdAnalysis.company}</span>
              </>
            )}
          </p>
        </div>

        {requiredShown.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Required skills
              </p>
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                {matchedCount}/{requiredShown.length} matched
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {requiredShown.map((s) => {
                const matched = isMatched(s);
                return (
                  <span
                    key={s}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                      matched
                        ? 'bg-success/10 text-success border-success/25'
                        : 'bg-warning/10 text-warning border-warning/25',
                    )}
                  >
                    {matched ? (
                      <Check className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <span className="text-[11px] leading-none">+</span>
                    )}
                    {s}
                  </span>
                );
              })}
              {required.length > 14 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{required.length - 14} more
                </span>
              )}
            </div>
          </div>
        )}

        {(() => {
          const ctx = jdAnalysis.jd_context;
          const bits = [
            ...(ctx?.domain || []),
            ...(ctx?.logistics || []),
            ...(ctx?.seniority || []),
          ];
          if (!bits.length) return null;
          return (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-2">
                Role context — not skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {bits.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-border bg-muted text-muted-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {preferred.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-2">
              Preferred skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {preferred.slice(0, 10).map((s) => {
                const matched = isMatched(s);
                return (
                  <span
                    key={s}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
                      matched
                        ? 'bg-success/10 text-success border-success/25'
                        : 'bg-muted text-muted-foreground border-border',
                    )}
                  >
                    {matched && <Check className="w-2.5 h-2.5" aria-hidden="true" />}
                    {s}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success" />
            Found in your resume
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning" />
            Not shown in bullets
          </span>
        </div>
      </div>
    </div>
  );
}
