import { useState } from 'react';
import type { DocumentAssessment, TailoredFullResume } from '@/types/resume';
import { Loader2 } from 'lucide-react';
import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';

const labels: Record<string, string> = {
  demonstrated: 'Supported by experience', listed: 'Listed skill; work context missing',
  related: 'Related experience', not_evidenced: 'Not found in source',
  needs_clarification: 'Recheck after edits',
};

export function DocumentAssessmentPanel({ assessment, resume, recordId, stale = false, onRecheck, checking = false }: {
  resume?: TailoredFullResume | null; recordId?: string;
  assessment: DocumentAssessment; stale?: boolean; onRecheck?: () => void; checking?: boolean;
}) {
  const outdated = stale;
  return <div className="space-y-5 p-5 sm:p-6">
    <section className="rounded-container border border-border bg-card p-5 space-y-3">
      <h2 className="text-title-sm text-foreground">Resume review</h2>
      <p className="max-w-prose text-sm text-muted-foreground">Job requirements, reader feedback, and document checks are reviewed separately. These checks do not predict an employer's decision.</p>
      {outdated && <p role="status" className="text-sm">The resume changed. Previous findings need to be checked again.</p>}
      {!outdated && assessment.source_status === 'stale' && <p className="text-sm">Source evidence links need rechecking after your edits. Reader feedback and file checks below describe the current draft.</p>}
      {assessment.source_status === 'user_edits_unverified' && <p className="text-sm">Your edits are preserved. Their factual support has not been verified.</p>}
      {onRecheck && (
        <Button type="button" variant="outline" size="sm" disabled={checking} aria-busy={checking} onClick={onRecheck} className="min-h-11 gap-1.5">
          {checking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {checking ? 'Checking...' : 'Review current resume'}
        </Button>
      )}
    </section>
    <section className="rounded-container border border-border bg-card p-5 space-y-3">
      <h3 className="text-label-lg text-foreground">Job requirement coverage</h3>
      {!['complete', 'structured_only'].includes(assessment.analysis_completeness) && <p className="text-sm">Job analysis is incomplete; some requirements may be missing.</p>}
      <ul className="space-y-3">{assessment.requirements.map(r => <li key={r.id} className="text-sm">
        <p className="font-medium">{r.text}</p>
        <p className="text-muted-foreground">{r.priority} · {outdated ? 'Needs recheck' : labels[r.state] || r.state}</p>
        {!outdated && r.state === 'demonstrated' && !r.visible && <p>This evidence is not visible in the current draft.</p>}
      </li>)}</ul>
    </section>
    <section className="rounded-container border border-border bg-card p-5 space-y-3">
      <h3 className="text-label-lg text-foreground">Reader feedback</h3>
      {outdated ? <p className="text-sm">Previous feedback is out of date.</p> : assessment.reader_review.status !== 'passed'
        ? <p className="text-sm">{assessment.reader_review.reason || 'Reader review is unavailable.'}</p>
        : <><p className="text-sm">{assessment.reader_review.apparent_role} {assessment.reader_review.apparent_level}</p>
          {assessment.reader_review.findings.map((f, i) => <div key={i} className="text-sm space-y-1"><blockquote className="border-l-2 border-border pl-3 text-muted-foreground">{f.quote}</blockquote><p>{f.explanation}</p></div>)}</>}
    </section>
    <section className="rounded-container border border-border bg-card p-5 space-y-2">
      <h3 className="text-label-lg text-foreground">Document checks</h3>
      <p className="text-sm">{outdated ? 'Export needs rechecking.' : `${assessment.artifact.format.toUpperCase()} text extraction: ${assessment.artifact.status}`}</p>
      {!outdated && assessment.artifact.issues.map((issue, i) => <p key={i} className="text-sm">{issue}</p>)}
      <p className="text-xs text-muted-foreground">These checks cover the generated file's extracted text. Visual layout and employer-specific parsing still need review.</p>
    </section>
    {assessment.questions.length > 0 && <section className="rounded-container border border-border bg-card p-5 space-y-3">
      <h3 className="text-label-lg text-foreground">Optional experience to add</h3>
      <p className="text-sm">Tailoring does not wait for these answers. Add actual work you left out when it helps explain your fit.</p>
      {assessment.questions.map(q => <p key={q.id} className="text-sm">{q.question}</p>)}
      {recordId && resume ? <ExperienceForm recordId={recordId} resume={resume} /> : <p className="text-sm">Add this work to your base resume before tailoring again.</p>}
    </section>}
  </div>;
}

function ExperienceForm({ recordId, resume }: { recordId: string; resume: TailoredFullResume }) {
  const [entity, setEntity] = useState('');
  const [text, setText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const save = async () => {
    setSaving(true);
    try {
      const response = await apiService.confirmTailoringExperience(recordId, entity, text.trim());
      setMessage(response.error || 'Saved. Use Refine to include this experience in the next draft.');
      if (!response.error) { setText(''); setConfirmed(false); }
    } catch { setMessage('Could not save. Please try again.'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-3">
    <label className="block space-y-1.5 text-sm font-medium text-foreground">
      <span>Where did you do this work?</span>
      <select value={entity} onChange={e => setEntity(e.target.value)} className="block min-h-11 w-full rounded-control border border-input bg-background px-3 py-2 text-sm font-normal text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">Choose a job or project</option>
        {resume.experience.map((e, i) => <option key={`experience.${i}`} value={`experience.${i}`}>{e.title} at {e.company}</option>)}
        {resume.projects.map((p, i) => <option key={`projects.${i}`} value={`projects.${i}`}>{p.name}</option>)}
      </select>
    </label>
    <label className="block space-y-1.5 text-sm font-medium text-foreground">
      <span>What did you do, and what happened?</span>
      <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={4} className="block w-full rounded-control border border-input bg-background px-3 py-2 text-sm font-normal leading-relaxed text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </label>
    <label className="flex min-h-11 items-start gap-2 text-sm text-foreground"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />This describes work I actually did in the selected job or project.</label>
    <Button type="button" size="sm" className="min-h-11 gap-1.5" disabled={saving || !confirmed || !entity || text.trim().length < 10} aria-busy={saving} onClick={save}>
      {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {saving ? 'Saving...' : 'Save experience'}
    </Button>
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>;
}
