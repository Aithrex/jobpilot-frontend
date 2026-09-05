/**
 * CareerOS ATS assessment (v2) — ledger coverage, file status, expandable evidence.
 * No fabricated employer/vendor overall score.
 */
import { useState } from 'react';
import type { AssessmentV2Result, ATSScores } from '@/types/resume';
import { isAssessmentV2 } from '@/lib/atsScores';

const DISCLAIMER =
  'CareerOS evaluates your resume against the job description. This is not an employer-specific score or a guarantee of passing screening.';

const BUCKET_LABEL: Record<string, string> = {
  supported_and_satisfied: 'Supported and satisfied',
  partial_or_related: 'Partial or related',
  not_demonstrated: 'Not demonstrated',
  conflict: 'Conflict',
  unknown: 'Unknown',
};

type CoverageBlock = {
  percentage?: number | null;
  satisfied?: number;
  partial?: number;
  not_demonstrated?: number;
  uncertain?: number;
  total?: number;
  numerator?: number;
  denominator?: number;
  provisional?: boolean;
  status?: string;
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
    required_coverage: scores.required_coverage,
    preferred_coverage: scores.preferred_coverage,
    ledger: scores.ledger,
  };
}

function statusLabel(stages: AssessmentV2Result['stages']): string {
  if (stages.artifact === 'failed' || stages.processing === 'failed') {
    return 'File needs attention';
  }
  if (stages.processing === 'complete') return 'Review complete';
  return 'Review incomplete';
}

function formatRequiredLine(cov: CoverageBlock | null | undefined): string {
  if (!cov) return 'Required coverage unavailable.';
  const num = cov.numerator ?? cov.satisfied;
  const den = cov.denominator ?? cov.total;
  if (cov.status === 'unavailable' || den === 0) {
    return 'Required coverage unavailable — no assessable required requirements.';
  }
  if (cov.status === 'incomplete_extraction' || cov.percentage == null) {
    return 'Required coverage withheld — requirement extraction is incomplete.';
  }
  let line = `Required coverage: ${cov.percentage}% — ${num} of ${den} requirements demonstrated.`;
  const parts: string[] = [];
  if ((cov.partial ?? 0) > 0) parts.push(`${cov.partial} partially demonstrated`);
  if ((cov.not_demonstrated ?? 0) > 0) parts.push(`${cov.not_demonstrated} not shown`);
  if ((cov.uncertain ?? 0) > 0) parts.push(`${cov.uncertain} uncertain`);
  if (parts.length) {
    line += ` ${parts.join('; ').replace(/^./, (c) => c.toUpperCase())}.`;
  }
  if (cov.provisional) {
    line += ' Percentage is provisional (confirmed coverage so far).';
  }
  return line;
}

function fileLine(stages: AssessmentV2Result['stages']): string {
  if (stages.artifact === 'passed') return 'File checks: Passed.';
  if (stages.artifact === 'issues') return 'File checks: Issues found.';
  if (stages.artifact === 'failed') return 'File checks: Failed.';
  return 'File checks: Not checked.';
}

function humanLine(scores: ATSScores, v2: AssessmentV2Result): string {
  const findings = v2.findings || scores.findings || [];
  const human = findings.filter(
    (f) =>
      f.kind === 'human_review' ||
      f.kind === 'repetition' ||
      f.kind === 'clarity' ||
      f.severity === 'info',
  );
  if (human.length > 0) {
    return `Human review: ${human.length} finding${human.length === 1 ? '' : 's'}.`;
  }
  return 'Human review: No issues flagged.';
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

  const reqCov = (v2.required_coverage || scores.required_coverage) as CoverageBlock | undefined;
  const prefCov = (v2.preferred_coverage || scores.preferred_coverage) as CoverageBlock | undefined;
  const required = v2.counts?.required || {};
  const preferred = v2.counts?.preferred || {};
  const ledgerRows = v2.ledger?.requirements || [];
  const evaluations = v2.evaluations || [];
  const reqMeta =
    (scores as ATSScores & {
      canonical_requirements?: { id: string; display_text?: string; text?: string }[];
    }).canonical_requirements || [];

  const labelFor = (id: string) => {
    const fromLedger = ledgerRows.find((r) => r.requirement_id === id);
    if (fromLedger?.display_text) return fromLedger.display_text;
    const hit = reqMeta.find((r) => r.id === id);
    return hit?.display_text || hit?.text || id;
  };

  const detailRows =
    ledgerRows.length > 0
      ? ledgerRows.map((row) => ({
          id: row.requirement_id,
          label: row.display_text || row.requirement_id,
          document_state: row.document_state,
          source_state: row.source_state,
          claim_state: row.claim_state,
          unmet_qualifiers: row.unmet_qualifiers,
          document_refs: row.document_refs,
          source_refs: row.source_refs,
          reason: row.reason,
          match_method: row.match_method,
        }))
      : evaluations.map((ev) => ({
          id: ev.requirement_id,
          label: labelFor(ev.requirement_id),
          document_state: ev.document_state,
          source_state: ev.source_state,
          claim_state: ev.claim_state,
          unmet_qualifiers: ev.unmet_qualifiers,
          document_refs: ev.document_refs,
          source_refs: ev.source_refs,
          reason: ev.reason,
          match_method: ev.match_method,
        }));

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <section className="rounded-container border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">ATS Score</h2>
        <p className="text-sm text-foreground">{formatRequiredLine(reqCov)}</p>
        {prefCov &&
          typeof prefCov.denominator === 'number' &&
          prefCov.denominator > 0 &&
          prefCov.percentage != null && (
            <p className="text-sm text-muted-foreground">
              Preferred coverage: {prefCov.percentage}% —{' '}
              {prefCov.numerator ?? prefCov.satisfied} of {prefCov.denominator}{' '}
              preferred requirements demonstrated.
            </p>
          )}
        <p className="text-sm text-muted-foreground">{fileLine(v2.stages)}</p>
        <p className="text-sm text-muted-foreground">{humanLine(scores, v2)}</p>
        <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
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
        <h3 className="font-semibold">Bucket counts (reconcile with coverage)</h3>
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

      {detailRows.length > 0 && (
        <section className="rounded-container border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Requirement evaluations</h3>
          <ul className="space-y-2">
            {detailRows.map((ev) => {
              const open = openId === ev.id;
              return (
                <li key={ev.id} className="text-sm border-b border-border/60 pb-2">
                  <button
                    type="button"
                    className="w-full text-left font-medium"
                    onClick={() => setOpenId(open ? null : ev.id)}
                    aria-expanded={open}
                  >
                    {ev.label}
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · {ev.document_state} / {ev.source_state}
                    </span>
                  </button>
                  {open && (
                    <div className="mt-2 space-y-1 text-muted-foreground pl-1">
                      <p>Document: {ev.document_state}</p>
                      <p>
                        Source: {ev.source_state} · claim: {ev.claim_state}
                        {ev.match_method ? ` · ${ev.match_method}` : ''}
                      </p>
                      {(ev.unmet_qualifiers?.length ?? 0) > 0 && (
                        <p>Unmet: {ev.unmet_qualifiers!.join(', ')}</p>
                      )}
                      {(ev.document_refs?.length ?? 0) > 0 && (
                        <p>
                          Matched:{' '}
                          {ev.document_refs!
                            .map((r) => `"${r.span}"${r.section ? ` (${r.section})` : ''}`)
                            .join(' · ')}
                        </p>
                      )}
                      {(ev.source_refs?.length ?? 0) > 0 && (
                        <p>
                          Source:{' '}
                          {ev.source_refs!
                            .map((r) => `${r.entity}: ${r.text}`)
                            .join(' · ')}
                        </p>
                      )}
                      {ev.reason && <p>{ev.reason}</p>}
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
          PDF and Word each carry their own file status. Layout issues do not
          change requirement-coverage percentage.
        </p>
      </section>
    </div>
  );
}
