/**
 * Everything that used to stack above the board: headline metrics, the funnel
 * breakdown, Gmail sync, stale-application nudges and the rejection reframe.
 *
 * None of it is deleted, but none of it is the first thing you see either. It
 * is a glance you ask for, which is why it is a sheet and not a fifth tab.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { apiService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import GmailIntegration from '@/components/resume/GmailIntegration';

import { STATUSES } from './trackerConfig';
import type { FunnelData, Reframe, StaleApp } from './useTrackerData';

export interface TrackerMetrics {
  total: number;
  active: number;
  interviewing: number;
  offers: number;
  respRate: number | null;
}

interface InsightsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metrics: TrackerMetrics;
  funnel: FunnelData | null;
  funnelLoading: boolean;
  staleApps: StaleApp[];
  reframe: Reframe | null;
  onSyncComplete: () => void;
  onDismissStale: (recordId: string) => void;
}

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-2 last:border-b-0">
      <span className="text-body text-muted-foreground">{label}</span>
      <span className="font-display text-body font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="overline">{title}</h3>
      {children}
    </section>
  );
}

export default function InsightsSheet({
  open,
  onOpenChange,
  metrics,
  funnel,
  funnelLoading,
  staleApps,
  reframe,
  onSyncComplete,
  onDismissStale,
}: InsightsSheetProps) {
  const [followups, setFollowups] = useState<Record<string, { subject: string; message: string }>>(
    {},
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const draftFollowup = async (recordId: string) => {
    setBusyId(recordId);
    const r = await apiService.generateIntelligenceFollowup({
      record_id: recordId,
      channel: 'email',
    });
    setBusyId(null);
    if (r.data?.followup) {
      setFollowups((prev) => ({
        ...prev,
        [recordId]: { subject: r.data!.followup.subject, message: r.data!.followup.message },
      }));
    } else {
      toast.error("Couldn't draft a follow-up");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
        aria-label="Pipeline insights"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display">Insights</SheetTitle>
          <SheetDescription>How the pipeline is actually performing.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-7">
          <Section title="At a glance">
            <div>
              <MetricRow label="Total applications" value={metrics.total} />
              <MetricRow label="Active" value={metrics.active} />
              <MetricRow label="Interviewing" value={metrics.interviewing} />
              <MetricRow label="Offers" value={metrics.offers} />
              <MetricRow
                label="Response rate"
                value={metrics.respRate !== null ? `${metrics.respRate}%` : '—'}
              />
            </div>
          </Section>

          <Section title="Funnel">
            {funnelLoading && !funnel ? (
              <p className="text-label text-muted-foreground">Crunching funnel intelligence...</p>
            ) : funnel ? (
              <div className="space-y-1">
                {STATUSES.map((s) => (
                  <div key={s.key} className="flex items-center justify-between py-1">
                    <span className="text-body text-muted-foreground">{s.label}</span>
                    <span className="text-body tabular-nums text-foreground">
                      {funnel.counts[s.key] ?? 0}
                    </span>
                  </div>
                ))}
                {funnel.insight && (
                  <p className="border-t border-border pt-3 text-label text-muted-foreground">
                    {funnel.insight.insight}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-label text-muted-foreground">No funnel data yet.</p>
            )}
          </Section>

          {staleApps.length > 0 && (
            <Section title={`Needs follow-up · ${staleApps.length}`}>
              <div className="space-y-2">
                {staleApps.map((s) => (
                  <div key={s.record_id} className="rounded-lg border border-border p-2.5">
                    <p className="text-body font-medium text-foreground">
                      {s.job_title}
                      {s.company ? ` · ${s.company}` : ''}
                    </p>
                    <p className="text-label text-muted-foreground">
                      {s.days_stale} days without a reply
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        disabled={busyId === s.record_id}
                        onClick={() => draftFollowup(s.record_id)}
                      >
                        {busyId === s.record_id ? 'Drafting...' : 'Draft follow-up'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => onDismissStale(s.record_id)}
                        title="Hide this nudge until the status changes again"
                      >
                        Dismiss
                      </Button>
                    </div>

                    {followups[s.record_id] && (
                      <div className="mt-2 space-y-2 border-t border-border pt-2">
                        <p className="text-label font-semibold text-foreground">
                          {followups[s.record_id].subject}
                        </p>
                        <p className="whitespace-pre-wrap text-label text-muted-foreground">
                          {followups[s.record_id].message}
                        </p>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7"
                            onClick={() => {
                              const f = followups[s.record_id];
                              navigator.clipboard
                                .writeText(`Subject: ${f.subject}\n\n${f.message}`)
                                .then(() => toast.success('Copied. Paste into your email'))
                                .catch(() => toast.error('Clipboard blocked'));
                            }}
                          >
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            className="h-7"
                            onClick={() => {
                              const f = followups[s.record_id];
                              const params = new URLSearchParams({
                                view: 'cm',
                                fs: '1',
                                su: f.subject,
                                body: f.message,
                              });
                              window.open(
                                `https://mail.google.com/mail/?${params.toString()}`,
                                '_blank',
                                'noopener,noreferrer',
                              );
                            }}
                          >
                            Open in Gmail
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {reframe && (
            <Section title="After a rejection">
              <div className="space-y-1.5">
                <p className="text-body font-medium text-foreground">{reframe.acknowledgement}</p>
                <p className="text-label text-muted-foreground">{reframe.what_went_right}</p>
                {reframe.next_actions?.length > 0 && (
                  <ul className="ml-4 list-disc text-label text-muted-foreground">
                    {reframe.next_actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
                <p className="text-label font-medium text-success">{reframe.silver_lining}</p>
              </div>
            </Section>
          )}

          <Section title="Email sync">
            <GmailIntegration onSyncComplete={onSyncComplete} />
            <p className="text-label text-muted-foreground">
              <Link
                to="/app/settings/integrations"
                className="rounded underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Manage Gmail in Settings
              </Link>
            </p>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
