/**
 * assessment-v2 review panel — counts, file status, top actions, expandable evidence.
 * No overall percentage / vendor rings.
 */
import { useState } from 'react';
import type { AssessmentV2Result, ATSScores } from '@/types/resume';
import { isAssessmentV2 } from '@/lib/atsScores';

const BUCKET_LABEL: Record<string, string> = {
  supported_and_satisfied: 'Supported and satisfied',
  partial_or_related: 'Partial or related',
  not_demonstrated: 'Not demonstrated',
  conflict: 'Conflict',
  unknown: 'Unknown',
};

function asV2(scores: ATSScores): AssessmentV2Result | null {
  if (!isAssessmentV2(scores)) return null;
  return {
    assessment_id: scores.assessment_id || '',
    schema_version: 4,
    assessment_version: 'assessment-v2',
    stages: scores.stages || {
      processing: 'partial',
      artifact: 'unchecked',
      source_check: 'unresolved',
      reader: 'unavailable',
      comparison: 'unavailable',
    },
    evaluations: scores.evaluations,
    counts: scores.counts,
    findings: scores.findings,
    top_actions: scores.top_actions,
    overall: null,
  };
}

function statusLabel(stages: AssessmentV2Result['stages']): string {
  if (stages.artifact === 'failed' || stages.processing === 'failed') {
    return 'File needs attention';
  }
  if (stages.processing === 'complete') return 'Review complete';
  return 'Review incomplete';
}

export function AssessmentV2Panel({
  scores,
  stale = false,
  onRecheck,
  checking = false,
  checkedAt,
}: {
  scores: ATSScores;
  stale?: boolean;
  onRecheck?: () => void;
  checking?: boolean;
  /** ISO timestamp of the file/assessment check when known. */
  checkedAt?: string;
}) {
  const v2 = asV2(scores);
  const [openId, setOpenId] = useState<string | null>(null);
  if (!v2) return null;
  const required = v2.counts?.required || {};
  const preferred = v2.counts?.preferred || {};
  const evaluations = v2.evaluations || [];
  const reqMeta = (scores as ATSScores & { canonical_requirements?: { id: string; display_text?: string; text?: string }[] })
    .canonical_requirements || [];
  const labelFor = (id: string) => {
    const hit = reqMeta.find((r) => r.id === id);
    return hit?.display_text || hit?.text || id;
  };

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <section className="rounded-container border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Resume review</h2>
        <p className="text-sm text-muted-foreground">
          File checks, requirement coverage, and reader findings — not an employer decision score.
        </p>
        <p className="text-sm font-medium">{statusLabel(v2.stages)}</p>
        {checkedAt && (
          <p className="text-xs text-muted-foreground">Checked {checkedAt}</p>
        )}
        {stale && (
          <p role="status" className="text-sm">
            The resume changed. Previous findings need to be checked again.
          </p>
        )}
        {onRecheck && (
          <button
            type="button"
            disabled={checking}
            onClick={onRecheck}
            className="text-sm underline"
          >
            {checking ? 'Checking…' : 'Review current resume'}
          </button>
        )}
      </section>

      <section className="rounded-container border border-border bg-card p-5 space-y-3">
        <h3 className="font-semibold">Required requirements</h3>
        <ul className="space-y-1 text-sm">
          {Object.entries(BUCKET_LABEL).map(([key, label]) => {
            const n = required[key as keyof typeof required] ?? 0;
            if (!n) return null;
            return (
              <li key={key}>
                {n} {label.toLowerCase()}
              </li>
            );
          })}
          {Object.values(required).every((n) => !n) && (
            <li className="text-muted-foreground">No required counts yet.</li>
          )}
        </ul>
        {Object.values(preferred).some((n) => !!n) && (
          <>
            <h3 className="font-semibold pt-2">Preferred</h3>
            <ul className="space-y-1 text-sm">
              {Object.entries(BUCKET_LABEL).map(([key, label]) => {
                const n = preferred[key as keyof typeof preferred] ?? 0;
                if (!n) return null;
                return (
                  <li key={key}>
                    {n} {label.toLowerCase()}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {evaluations.length > 0 && (
        <section className="rounded-container border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Requirement details</h3>
          <ul className="space-y-2">
            {evaluations.map((ev) => {
              const open = openId === ev.requirement_id;
              return (
                <li key={ev.requirement_id} className="text-sm border-b border-border/60 pb-2">
                  <button
                    type="button"
                    className="w-full text-left font-medium"
                    onClick={() => setOpenId(open ? null : ev.requirement_id)}
                    aria-expanded={open}
                  >
                    {labelFor(ev.requirement_id)}
                    <span className="text-muted-foreground font-normal">
                      {' '}· {ev.document_state} / {ev.source_state}
                    </span>
                  </button>
                  {open && (
                    <div className="mt-2 space-y-1 text-muted-foreground pl-1">
                      <p>Document: {ev.document_state}</p>
                      <p>Source: {ev.source_state} · claim: {ev.claim_state}</p>
                      {(ev.unmet_qualifiers?.length ?? 0) > 0 && (
                        <p>Unmet: {ev.unmet_qualifiers!.join(', ')}</p>
                      )}
                      {(ev.document_refs?.length ?? 0) > 0 && (
                        <p>Document evidence: {ev.document_refs!.map((r) => r.span).join(' · ')}</p>
                      )}
                      {(ev.source_refs?.length ?? 0) > 0 && (
                        <p>Source: {ev.source_refs!.map((r) => `${r.entity}: ${r.text}`).join(' · ')}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(v2.top_actions?.length ?? 0) > 0 && (
        <section className="rounded-container border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Next actions</h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            {v2.top_actions!.slice(0, 3).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="rounded-container border border-border bg-card p-5 space-y-2">
        <h3 className="font-semibold">Document checks</h3>
        <p className="text-sm">Artifact: {v2.stages.artifact}</p>
        <p className="text-xs text-muted-foreground">
          PDF and Word each carry their own file status. These checks do not simulate a vendor ATS.
        </p>
      </section>
    </div>
  );
}
