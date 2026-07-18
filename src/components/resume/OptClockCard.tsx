/**
 * OptClockCard — the calm, precise OPT unemployment-days counter.
 *
 * For an F-1/OPT international student this is the single most anxiety-defining
 * fact in their life, so this surface is deliberately quiet: a large but calm
 * number, the 90/150-day limit, the 2-3 dates that matter, and a standing
 * reminder to confirm everything with their DSO. Never gamified, never a red
 * screaming countdown — 'watch' is muted amber, 'urgent' is a restrained amber
 * (never alarm-red).
 *
 * Presentational: the parent (DashboardTab) owns the {@link OptClock} fetch so
 * it can promote this card to the top when the runway is urgent. This component
 * only renders and — when the student hasn't told us their days-used yet — lets
 * them set it (merging into the saved visa profile so nothing else is lost).
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { apiService } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { OptClock } from '@/types/visa';
import { CalendarClock, ShieldCheck, ArrowRight, Loader2, Info } from 'lucide-react';

interface OptClockCardProps {
  clock: OptClock | null;
  loading: boolean;
  error?: boolean;
  /** Open the visa profile editor (the 'visa' workspace tab). */
  onOpenVisa: () => void;
  /** Re-fetch the OPT clock after the student updates their days-used. */
  onRefresh: () => void;
  className?: string;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Restrained frame per band — amber, never red. */
function bandFrame(band: OptClock['status_band']): string {
  switch (band) {
    case 'urgent':
      return 'border-warning/50 border-l-2 border-l-warning bg-warning/[0.07]';
    case 'watch':
      return 'border-warning/30 bg-warning/[0.04]';
    default:
      return 'border-border bg-card';
  }
}

function Shell({ children, className, band }: {
  children: React.ReactNode; className?: string; band?: OptClock['status_band'];
}) {
  return (
    <section
      aria-label="OPT unemployment clock"
      className={cn(
        'rounded-xl border p-5 shadow-soft',
        band ? bandFrame(band) : 'border-border bg-card',
        className,
      )}
    >
      {children}
    </section>
  );
}

function Header({ band }: { band?: OptClock['status_band'] }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground/70">
          <CalendarClock className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold leading-tight text-foreground">OPT clock</h3>
          <p className="text-[11px] text-muted-foreground">Unemployment runway</p>
        </div>
      </div>
      {band === 'urgent' && (
        <span className="shrink-0 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
          Act soon
        </span>
      )}
      {band === 'watch' && (
        <span className="shrink-0 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
          Watch
        </span>
      )}
    </div>
  );
}

function Footer({ disclaimer }: { disclaimer: string }) {
  return (
    <div className="mt-4 space-y-1.5 border-t border-border/70 pt-3">
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        Talk to your DSO. They are your official source of truth for every date.
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground/70">{disclaimer}</p>
    </div>
  );
}

const DEFAULT_DISCLAIMER = 'This is not legal advice. Confirm every date with your DSO.';

export default function OptClockCard({
  clock, loading, error, onOpenVisa, onRefresh, className,
}: OptClockCardProps) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading && !clock) {
    return (
      <Shell className={className}>
        <Header />
        <div className="space-y-3">
          <div className="h-12 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-52 animate-pulse rounded bg-muted" />
        </div>
      </Shell>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error || !clock) {
    return (
      <Shell className={className}>
        <Header />
        <div className="flex flex-col items-start gap-2 py-2">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            We couldn't load your OPT clock just now.
          </p>
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Try again <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <Footer disclaimer={DEFAULT_DISCLAIMER} />
      </Shell>
    );
  }

  const disclaimer = clock.disclaimer || DEFAULT_DISCLAIMER;
  const hasDates = !!(clock.opt_ead_start || clock.opt_ead_end);
  const stemLabel = clock.unemployment_days_limit >= 150 ? 'STEM OPT' : 'standard OPT';

  const saveDaysUsed = async () => {
    const n = Number(draft);
    if (!draft.trim() || Number.isNaN(n) || n < 0 || n > 400) {
      toast.error('Enter a whole number of days between 0 and 400.');
      return;
    }
    setSaving(true);
    // Load the current profile first so we merge — never clobber other fields.
    const cur = await apiService.getVisaProfile();
    if (cur.error || !cur.data) {
      setSaving(false);
      toast.error('Could not reach your visa profile. Please try again.');
      return;
    }
    const resp = await apiService.saveVisaProfile({
      ...cur.data.profile,
      unemployment_days_used: n,
    });
    setSaving(false);
    if (resp.error) {
      toast.error('Could not save', { description: resp.error });
      return;
    }
    toast.success('Saved. Your OPT clock is up to date.');
    setDraft('');
    setEditing(false);
    onRefresh();
  };

  const DaysInput = (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="opt-days-used" className="sr-only">
        Days unemployed on OPT so far
      </label>
      <input
        id="opt-days-used"
        type="number"
        inputMode="numeric"
        min={0}
        max={400}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void saveDaysUsed(); }}
        placeholder="e.g. 12"
        disabled={saving}
        className="h-9 w-24 rounded-lg border border-border bg-background px-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      />
      <button
        onClick={() => void saveDaysUsed()}
        disabled={saving}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save
      </button>
    </div>
  );

  // ── Empty: no profile / no OPT dates yet ─────────────────────────────
  if (!clock.has_profile || !hasDates) {
    return (
      <Shell className={className}>
        <Header />
        <div className="space-y-3 py-1">
          <p className="text-sm text-foreground/90">
            On F-1 OPT you get a limited number of unemployment days. Add your EAD
            dates and this clock will quietly track exactly how much runway you have.
          </p>
          <button
            onClick={onOpenVisa}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Add your OPT dates <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <Footer disclaimer={disclaimer} />
      </Shell>
    );
  }

  // ── Prompt: profile exists but days-used not reported yet ────────────
  if (clock.unemployment_days_used === null) {
    return (
      <Shell className={className}>
        <Header />
        <div className="space-y-3 py-1">
          <p className="text-sm text-foreground/90">
            You have{' '}
            <span className="font-semibold">{clock.unemployment_days_limit} unemployment days</span>{' '}
            on {stemLabel}. Tell us how many you've used so far and we'll show your
            exact remaining runway.
          </p>
          {DaysInput}
          {clock.key_dates.length > 0 && <KeyDates dates={clock.key_dates} />}
        </div>
        <Footer disclaimer={disclaimer} />
      </Shell>
    );
  }

  // ── Clock: full runway view ──────────────────────────────────────────
  const used = clock.unemployment_days_used;
  const limit = clock.unemployment_days_limit;
  const remaining = clock.days_remaining ?? limit - used;
  const shown = Math.max(remaining, 0);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const fillClass = clock.status_band === 'ok' ? 'bg-success/60' : 'bg-warning';

  return (
    <Shell className={className} band={clock.status_band}>
      <Header band={clock.status_band} />

      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <span className="font-display text-5xl font-extrabold leading-none tabular-nums tracking-tight text-foreground">
          {shown}
        </span>
        <span className="pb-1 text-sm text-muted-foreground">
          {shown === 1 ? 'day' : 'days'} of unemployment runway left
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {used} of {limit} days used on {stemLabel}
        {remaining < 0 && (
          <span className="ml-1 font-medium text-warning">
            · past the {limit}-day limit. Reach your DSO now
          </span>
        )}
      </p>

      {/* Quiet, precise progress — not a game meter. */}
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        aria-label="Unemployment days used"
      >
        <div className={cn('h-full rounded-full transition-[width]', fillClass)} style={{ width: `${pct}%` }} />
      </div>

      {clock.key_dates.length > 0 && <KeyDates dates={clock.key_dates} className="mt-4" />}

      <div className="mt-3">
        {editing ? (
          DaysInput
        ) : (
          <button
            onClick={() => { setDraft(String(used)); setEditing(true); }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Update days used
          </button>
        )}
      </div>

      <Footer disclaimer={disclaimer} />
    </Shell>
  );
}

function KeyDates({ dates, className }: { dates: OptClock['key_dates']; className?: string }) {
  return (
    <dl className={cn('space-y-1.5', className)}>
      {dates.slice(0, 3).map((d) => (
        <div key={`${d.label}-${d.date}`} className="flex items-center justify-between gap-3 text-xs">
          <dt className="text-muted-foreground">{d.label}</dt>
          <dd className="font-medium tabular-nums text-foreground/90">{formatDate(d.date)}</dd>
        </div>
      ))}
    </dl>
  );
}
