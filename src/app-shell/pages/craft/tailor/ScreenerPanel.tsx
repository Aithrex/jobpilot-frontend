/**
 * Screener view: the tailored PDF read the way an employer's screener reads it.
 *
 * Renders the backend's `screener` sidecar (services/screener_sim.py): for each
 * job requirement, whether a job or project line shows it, only the Skills list
 * does, or nothing on the page does - with the quote that proves it. Real gaps
 * are questions for the user, never filler. The grade follows Workday
 * HiredScore's rule: must-haves decide A/B versus C/D.
 */
import { AlertTriangle, CheckCircle2, CircleDashed, FileSearch, HelpCircle, MinusCircle, Undo2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ScreenerCriterion, ScreenerReport } from '@/types/resume';

interface ScreenerPanelProps {
  report: ScreenerReport | null | undefined;
}

const GRADE_TONE: Record<string, string> = {
  A: 'bg-success/15 text-success ring-success/30',
  B: 'bg-success/10 text-success ring-success/25',
  C: 'bg-warning/15 text-warning ring-warning/30',
  D: 'bg-destructive/10 text-destructive ring-destructive/25',
};

function stateOf(c: ScreenerCriterion) {
  if (c.visibility === 'in_context') {
    return { Icon: CheckCircle2, tone: 'text-success', text: c.where ? `Shown in ${c.where}` : 'Shown in a job or project line' };
  }
  if (c.visibility === 'listed_only') {
    return { Icon: MinusCircle, tone: 'text-warning', text: 'Only in your skills list' };
  }
  if (c.evidence === 'gap' || c.evidence === 'implied') {
    return { Icon: CircleDashed, tone: 'text-muted-foreground', text: 'Not in your resume' };
  }
  return {
    Icon: MinusCircle,
    tone: 'text-destructive',
    text: c.lost_in_render ? 'In your resume, but lost when the PDF is read' : 'Not on the page',
  };
}

function CriterionRow({ c, gapQuestion }: { c: ScreenerCriterion; gapQuestion?: string }) {
  const { Icon, tone, text } = stateOf(c);
  const quote = c.screener?.quote || (c.visibility === 'in_context' ? c.span : '');
  const fixable = c.visibility !== 'in_context' && c.evidence === 'proven' && c.source_line;
  return (
    <li className="flex gap-3 py-3">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm">
          <span className="font-semibold text-foreground">{c.term}</span>
          <span className="text-muted-foreground"> - {text}</span>
        </p>
        {quote && (
          <blockquote className="line-clamp-2 border-l-2 border-border pl-2 text-xs leading-relaxed text-muted-foreground">
            {quote}
          </blockquote>
        )}
        {fixable && (
          <p className="text-xs leading-relaxed text-foreground">
            Your original resume proves it:{' '}
            <span className="text-muted-foreground">{c.source_line}</span>
          </p>
        )}
        {gapQuestion && (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-foreground">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            {gapQuestion}
          </p>
        )}
        {c.screener?.quote_rejected && (
          <p className="text-[11px] text-muted-foreground">
            The AI reader quoted text that is not on the page, so its answer was ignored.
          </p>
        )}
      </div>
    </li>
  );
}

export function ScreenerPanel({ report }: ScreenerPanelProps) {
  if (!report || report.status === 'skipped' || !report.criteria) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <FileSearch className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">No screener view yet</p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Tailor a resume and this tab shows how an employer's screener reads the PDF: which
          requirements it can find, and where.
        </p>
      </div>
    );
  }

  const s = report.summary;
  const musts = report.criteria.filter((c) => c.kind === 'must');
  const nices = report.criteria.filter((c) => c.kind === 'nice');
  const gapQuestions = new Map((report.gaps || []).map((g) => [g.criterion, g.question]));
  const parse = report.parse;
  const lens = report.lens?.signals;
  const read = report.screener;

  return (
    <div className="space-y-6 p-5 sm:p-6">
      {report.stale && (
        <p className="rounded-control border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
          Edited since this was read. Tailor again or change the format to refresh it.
        </p>
      )}

      {/* The verdict: one strong element. */}
      <header className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-container font-display text-4xl font-bold ring-1',
            (s?.grade && GRADE_TONE[s.grade]) || 'bg-muted text-muted-foreground ring-border',
          )}
          aria-label={s?.grade ? `Grade ${s.grade}` : 'Not graded'}
        >
          {s?.grade ?? '-'}
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="font-display text-lg font-semibold leading-snug text-foreground">
            {s && s.must_total > 0
              ? `${s.must_visible} of ${s.must_total} must-haves on the page`
              : 'No required skills to check'}
          </h3>
          {s?.grade && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {s.grade === 'A' || s.grade === 'B'
                ? s.grade_basis
                : 'Screeners sort by must-haves first. Show the ones you have in a job or project line to move up.'}
            </p>
          )}
          {parse && (
            <p className="text-xs text-muted-foreground">
              {parse.status === 'ok'
                ? `Read cleanly from the PDF (${parse.pages} ${parse.pages === 1 ? 'page' : 'pages'}).`
                : parse.status === 'issues'
                  ? `Read from the PDF with problems: ${parse.checks.filter((c) => !c.ok).map((c) => c.label.toLowerCase()).join(', ')}.`
                  : 'The PDF could not be read for this check.'}
            </p>
          )}
        </div>
      </header>

      {(report.warnings || []).length > 0 && (
        <div role="alert" className="space-y-1 rounded-control border border-destructive/30 bg-destructive/10 px-4 py-3">
          {(report.warnings || []).map((w) => (
            <p key={w} className="flex items-start gap-2 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
              {w}
            </p>
          ))}
        </div>
      )}

      {musts.length > 0 && (
        <section aria-labelledby="screener-musts">
          <h4 id="screener-musts" className="text-sm font-semibold text-foreground">Required by the job</h4>
          <ul className="divide-y divide-border">
            {musts.map((c) => <CriterionRow key={c.id} c={c} gapQuestion={gapQuestions.get(c.id)} />)}
          </ul>
        </section>
      )}

      {nices.length > 0 && (
        <section aria-labelledby="screener-nices">
          <h4 id="screener-nices" className="text-sm font-semibold text-foreground">Nice to have</h4>
          <ul className="divide-y divide-border">
            {nices.map((c) => <CriterionRow key={c.id} c={c} gapQuestion={gapQuestions.get(c.id)} />)}
          </ul>
        </section>
      )}

      {(report.patched || []).length > 0 && (
        <section aria-labelledby="screener-restored" className="rounded-control bg-muted/50 px-4 py-3">
          <h4 id="screener-restored" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Undo2 className="h-4 w-4 text-primary" aria-hidden="true" />
            Brought back from your original resume
          </h4>
          <ul className="mt-2 space-y-1.5">
            {(report.patched || []).map((p) => (
              <li key={`${p.criterion}-${p.text}`} className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{p.term}</span> in {p.entry}: {p.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {read && (read.six_second_read || read.reason_to_interview || read.top_concern) && (
        <section aria-labelledby="screener-read" className="space-y-2">
          <h4 id="screener-read" className="text-sm font-semibold text-foreground">How a reader sums it up</h4>
          {read.six_second_read && <p className="text-xs leading-relaxed text-muted-foreground">{read.six_second_read}</p>}
          {read.reason_to_interview && (
            <p className="text-xs leading-relaxed text-foreground"><span className="font-semibold">Reason to interview:</span> {read.reason_to_interview}</p>
          )}
          {read.top_concern && (
            <p className="text-xs leading-relaxed text-foreground"><span className="font-semibold">Main concern:</span> {read.top_concern}</p>
          )}
        </section>
      )}

      {lens && lens.notes.length > 0 && (
        <section aria-labelledby="screener-lens">
          <h4 id="screener-lens" className="text-sm font-semibold text-foreground">What else screeners score</h4>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-muted-foreground">
            {lens.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Based on the intern rubric HackerRank published as open source.
          </p>
        </section>
      )}

      <p className="border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
        A simulation of how screening software reads your PDF. Each employer sets its own
        requirements and weights, so treat this as a checklist, not a prediction.
      </p>
    </div>
  );
}
