/**
 * Everything the row deliberately does not carry.
 *
 * Rendered in the sticky right-hand pane on wide screens and inside a sheet
 * below `xl`. The parent remounts this on selection change (via `key`), so the
 * form fields seed from the record without a sync effect.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Wand2 } from 'lucide-react';

import type { ApplicationStatus, TailoringRecord } from '@/types/resume';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { appPath } from '@/app-shell/nav.config';
import { stagePendingTailorJob } from '@/lib/craftHandoff';
import { appliedDayOf, formatCivilDay } from '@/lib/applicationDates';

import { STATUSES, statusKeyOf } from './trackerConfig';
import type { ApplicationPatch } from './useTrackerData';
import {
  atsTone,
  companyOf,
  initials,
  isUntailoredStub,
  relDate,
  titleOf,
} from './trackerUtils';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="overline">{label}</span>
      {children}
    </label>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="overline">{label}</p>
      <p className="text-body text-foreground">{children}</p>
    </div>
  );
}

interface ApplicationDetailProps {
  record: TailoringRecord;
  saving: boolean;
  onStatusChange: (status: ApplicationStatus) => void;
  onPatch: (patch: ApplicationPatch) => void;
}

export default function ApplicationDetail({
  record,
  saving,
  onStatusChange,
  onPatch,
}: ApplicationDetailProps) {
  const app = record.application || {};
  const title = titleOf(record);
  const company = companyOf(record);
  const ats = record.ats_scores?.overall;
  const appliedDay = appliedDayOf(app);

  const [recruiterName, setRecruiterName] = useState(app.recruiter_name || '');
  const [recruiterEmail, setRecruiterEmail] = useState(app.recruiter_email || '');
  const [jobUrl, setJobUrl] = useState(app.job_url || '');
  const [nextDate, setNextDate] = useState(app.next_action_date?.slice(0, 10) || '');
  const [nextNote, setNextNote] = useState(app.next_action_note || '');
  const [notes, setNotes] = useState(app.notes || '');

  const save = () =>
    onPatch({
      recruiter_name: recruiterName,
      recruiter_email: recruiterEmail,
      job_url: jobUrl,
      next_action_date: nextDate ? new Date(nextDate).toISOString() : null,
      next_action_note: nextNote,
      notes,
    });

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-body font-semibold text-primary"
          >
            {initials(company || title)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-subtitle leading-tight text-foreground">{title}</h2>
            <p className="text-label text-muted-foreground">
              {company || 'Company not specified'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={statusKeyOf(app.status)}
            onValueChange={(v) => onStatusChange(v as ApplicationStatus)}
            disabled={saving}
          >
            <SelectTrigger className="h-9 flex-1" aria-label="Application stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {app.job_url && (
            <Button asChild variant="outline" size="sm" className="h-9 shrink-0 gap-1.5">
              <a href={app.job_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Posting
              </a>
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 border-y border-border py-4">
        <Fact label="Applied">
          {appliedDay ? (
            <span className="tabular-nums">
              {formatCivilDay(appliedDay, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ) : (
            <span className="text-muted-foreground">Not yet</span>
          )}
        </Fact>
        <Fact label="ATS score">
          {typeof ats === 'number' ? (
            <span className={`tabular-nums font-semibold ${atsTone(ats)}`}>{ats}</span>
          ) : app.resume_used === 'base' ? (
            <span className="text-label text-muted-foreground">Base resume</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Fact>
        {app.next_action_date && (
          <Fact label="Next action">
            <span className="text-label">
              {relDate(app.next_action_date)}
              {app.next_action_note ? ` · ${app.next_action_note}` : ''}
            </span>
          </Fact>
        )}
        {app.interview_dates && app.interview_dates.length > 0 && (
          <Fact label="Interviews">
            <span className="text-label tabular-nums">
              {app.interview_dates
                .map((d) => formatCivilDay(d.slice(0, 10), { month: 'short', day: 'numeric' }))
                .join(' · ')}
            </span>
          </Fact>
        )}
      </div>

      {isUntailoredStub(record) && (
        <Button asChild variant="outline" className="w-full gap-1.5">
          <Link
            to={appPath('resume', 'tailor')}
            onClick={() =>
              stagePendingTailorJob({
                job_id: record.source_job_id || record.record_id,
                jd_text: record.jd_text || '',
                title,
                company: company || undefined,
                url: app.job_url || '',
              })
            }
          >
            <Wand2 className="h-4 w-4" aria-hidden />
            Tailor a resume for this role
          </Link>
        </Button>
      )}

      <div className="space-y-3">
        <Field label="Recruiter">
          <Input
            value={recruiterName}
            onChange={(e) => setRecruiterName(e.target.value)}
            placeholder="Name"
            className="h-9"
          />
        </Field>
        <Field label="Recruiter email">
          <Input
            type="email"
            value={recruiterEmail}
            onChange={(e) => setRecruiterEmail(e.target.value)}
            placeholder="name@company.com"
            className="h-9"
          />
        </Field>
        <Field label="Job URL">
          <Input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://"
            className="h-9"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Next action">
            <Input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="h-9"
            />
          </Field>
          <Field label="What happens">
            <Input
              value={nextNote}
              onChange={(e) => setNextNote(e.target.value)}
              placeholder="Follow up"
              className="h-9"
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Anything worth remembering about this one."
            className="resize-none"
          />
        </Field>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
    </div>
  );
}
