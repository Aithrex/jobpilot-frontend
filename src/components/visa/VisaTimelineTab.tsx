/**
 * VisaTimelineTab - F-1 / OPT / STEM / H-1B clock dashboard.
 *
 * Two halves:
 *   1. Profile form (small - visa status, key dates, STEM flag, H-1B year)
 *   2. Computed milestone cards ordered by upcoming cliff date, color-coded
 *      by severity. Auto-refreshes when the profile changes.
 *
 * The profile lives in MongoDB (visa_profiles collection). Empty state shows
 * a CTA explaining what the dashboard will give them.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertCircle, CalendarClock, ShieldCheck, Save, Info } from 'lucide-react';
import { WorkAuthorizationCard } from '@/components/visa/WorkAuthorizationCard';
import { ImmigrationNotice } from '@/components/privacy/ImmigrationNotice';
import type { VisaProfile, VisaMilestone, VisaStatusCode } from '@/types/visa';

const STATUS_LABELS: Record<VisaStatusCode, string> = {
  F1: 'F-1 student (pre-OPT)',
  'F1-CPT': 'F-1 on CPT',
  'F1-OPT': 'F-1 on post-completion OPT',
  'F1-STEM-OPT': 'F-1 on STEM 24-month extension',
  H1B: 'H-1B holder',
  Other: 'Other / not applicable',
};

const EMPTY_PROFILE: VisaProfile = {
  visa_status: 'F1',
  stem_degree: false,
  stem_extension_filed: false,
  h1b_lottery_filed: false,
  current_employer_e_verified: false,
  country_of_birth: '',
  opt_ead_arrival_date: '',
  opt_start_date: '',
  opt_end_date: '',
  stem_extension_end_date: '',
  cpt_end_date: '',
  h1b_lottery_year: null,
  notes: '',
};

function severityClasses(sev: VisaMilestone['severity']) {
  switch (sev) {
    case 'critical':
      return {
        ring: 'border-destructive/40 bg-destructive/5',
        text: 'text-destructive',
        badge: 'bg-destructive/15 text-destructive border-destructive/30',
      };
    case 'warning':
      return {
        ring: 'border-warning/40 bg-warning/5',
        text: 'text-warning',
        badge: 'bg-warning/15 text-warning border-warning/30',
      };
    default:
      return {
        ring: 'border-border bg-card',
        text: 'text-foreground',
        badge: 'bg-muted text-muted-foreground border-border',
      };
  }
}

function relativeLabel(days: number | null): string {
  if (days === null || days === undefined) return 'date not set';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
}

export default function VisaTimelineTab() {
  const [profile, setProfile] = useState<VisaProfile>(EMPTY_PROFILE);
  const [milestones, setMilestones] = useState<VisaMilestone[]>([]);
  const [recommendation, setRecommendation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    const resp = await apiService.getVisaTimeline();
    setLoadError(resp.error && !resp.data ? resp.error : null);
    if (resp.data) {
      setProfile({ ...EMPTY_PROFILE, ...resp.data.profile });
      setMilestones(resp.data.milestones || []);
      setRecommendation(resp.data.recommendation || '');
      setDirty(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const resp = await apiService.saveVisaProfile({
      ...profile,
      country_of_birth: (profile.country_of_birth || '').trim(),
    });
    setSaving(false);
    if (resp.error) {
      toast.error('Could not save profile', { description: resp.error });
      return;
    }
    toast.success('Visa profile saved. Timeline refreshing.');
    // Re-fetch so the milestones reflect the new profile
    await loadTimeline();
  }, [profile, loadTimeline]);

  const update = useCallback(<K extends keyof VisaProfile>(key: K, val: VisaProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: val }));
    setDirty(true);
  }, []);

  const upcoming = useMemo(() => milestones.filter((m) => (m.days_remaining ?? 0) >= 0), [milestones]);
  const past = useMemo(() => milestones.filter((m) => (m.days_remaining ?? 0) < 0), [milestones]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <p className="sr-only" role="status">Loading your visa timeline...</p>
        <div className="space-y-2" aria-hidden>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-full max-w-prose" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" aria-hidden />
        <Skeleton className="h-80 w-full rounded-xl" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="overline">F-1 / OPT / H-1B</p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-title-lg text-foreground">Visa Timeline Copilot</h2>
          <Badge variant="outline" className="border-border text-caption-sm uppercase tracking-wide text-muted-foreground">
            Beta
          </Badge>
        </div>
        <p className="max-w-prose text-sm text-muted-foreground">
          Single source of truth for visa cliffs: OPT 90-day unemployment, STEM
          extension filing window, H-1B lottery deadlines. Your profile stays in
          your account. Nothing is shared.
        </p>
      </div>

      {/* The one work-authorization question. It sits ABOVE the visa profile
          because it is the answer the job feed reads, it is optional, and it
          is useful to somebody who will never fill in an OPT date. */}
      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <p className="flex-1 text-sm text-foreground">
            We could not load your saved timeline. You can still edit your profile below.
          </p>
          <Button size="sm" variant="outline" onClick={() => void loadTimeline()}>
            Try again
          </Button>
        </div>
      )}

      <WorkAuthorizationCard />
      {/* Notice at collection for both fields on this page (sensitive data). */}
      <ImmigrationNotice purpose="timeline" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-title-sm">
            <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            Your visa profile
          </CardTitle>
          <CardDescription className="text-xs">
            Update these whenever your status changes. We never share this data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (dirty && !saving) void handleSave();
            }}
          >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="visa-current-visa-status" className="text-caption">Current visa status</Label>
              <Select
                value={profile.visa_status}
                onValueChange={(v) => update('visa_status', v as VisaStatusCode)}
              >
                <SelectTrigger id="visa-current-visa-status" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as VisaStatusCode[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visa-country-of-birth" className="text-caption">Country of birth</Label>
              <Input
                id="visa-country-of-birth"
                value={profile.country_of_birth || ''}
                onChange={(e) => update('country_of_birth', e.target.value)}
                placeholder="e.g. India, China, Nigeria"
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="visa-opt-ead-arrival-date" className="text-caption">OPT EAD arrival date</Label>
              <Input
                id="visa-opt-ead-arrival-date"
                type="date"
                value={profile.opt_ead_arrival_date || ''}
                onChange={(e) => update('opt_ead_arrival_date', e.target.value || null)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visa-opt-start-date" className="text-caption">OPT start date</Label>
              <Input
                id="visa-opt-start-date"
                type="date"
                value={profile.opt_start_date || ''}
                onChange={(e) => update('opt_start_date', e.target.value || null)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visa-opt-end-date" className="text-caption">OPT end date</Label>
              <Input
                id="visa-opt-end-date"
                type="date"
                value={profile.opt_end_date || ''}
                onChange={(e) => update('opt_end_date', e.target.value || null)}
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="visa-cpt-end-date-if-on-cpt" className="text-caption">CPT end date (if on CPT)</Label>
              <Input
                id="visa-cpt-end-date-if-on-cpt"
                type="date"
                value={profile.cpt_end_date || ''}
                onChange={(e) => update('cpt_end_date', e.target.value || null)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visa-stem-extension-end" className="text-caption">STEM extension end</Label>
              <Input
                id="visa-stem-extension-end"
                type="date"
                value={profile.stem_extension_end_date || ''}
                onChange={(e) => update('stem_extension_end_date', e.target.value || null)}
                className="h-10"
                disabled={!profile.stem_extension_filed}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visa-h-1b-lottery-fy" className="text-caption">H-1B lottery FY</Label>
              <Input
                id="visa-h-1b-lottery-fy"
                type="number"
                min={2024}
                max={2035}
                value={profile.h1b_lottery_year || ''}
                onChange={(e) =>
                  update('h1b_lottery_year', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="2026"
                className="h-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-foreground">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={profile.stem_degree}
                onChange={(e) => update('stem_degree', e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              STEM degree
            </label>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={profile.stem_extension_filed}
                onChange={(e) => update('stem_extension_filed', e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              STEM extension filed
            </label>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={profile.h1b_lottery_filed}
                onChange={(e) => update('h1b_lottery_filed', e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              H-1B registered this FY
            </label>
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={profile.current_employer_e_verified}
                onChange={(e) => update('current_employer_e_verified', e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Current employer is E-Verified
            </label>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              disabled={saving || !dirty}
              aria-busy={saving}
              className="gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving...
                </>
              ) : dirty ? (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save & refresh
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Saved
                </>
              )}
            </Button>
          </div>
          </form>
        </CardContent>
      </Card>

      {recommendation && (
        <Card className="bg-muted">
          <CardContent className="space-y-1.5 p-4">
            <p className="overline inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              AI recommendation
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-foreground">{recommendation}</p>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="overline mb-2 inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          Upcoming cliffs ({upcoming.length})
        </h3>
        {upcoming.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="inline-flex w-full items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              No active cliffs in your timeline yet. Fill out your profile above
              to populate.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {upcoming.map((m) => {
              const c = severityClasses(m.severity);
              return (
                <Card key={m.id} className={`border ${c.ring}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className={`text-sm font-semibold leading-tight ${c.text}`}>
                        {m.label}
                      </h4>
                      <Badge variant="outline" className={`shrink-0 text-caption-sm ${c.badge}`}>
                        {relativeLabel(m.days_remaining)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {m.description}
                    </p>
                    {m.date && (
                      <p className="inline-flex items-center gap-1 text-caption-sm tabular-nums text-muted-foreground">
                        <CalendarClock className="h-3 w-3" />
                        {m.date}
                      </p>
                    )}
                    {m.severity === 'critical' && (
                      <p className="text-caption-sm text-destructive inline-flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Critical. Act soon.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {past.length > 0 && (
        <details className="rounded-lg border border-border px-3 py-2 text-sm">
          <summary className="flex min-h-10 cursor-pointer items-center text-muted-foreground transition-colors hover:text-foreground">
            Past milestones ({past.length})
          </summary>
          <div className="mt-3 space-y-2">
            {past.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{m.label}</p>
                  <p className="text-caption-sm text-muted-foreground">{m.date}</p>
                </div>
                <span className="shrink-0 text-caption-sm text-muted-foreground">
                  {relativeLabel(m.days_remaining)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
