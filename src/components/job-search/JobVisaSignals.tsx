import { ShieldCheck, ShieldAlert, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import type { SponsorshipSignal, VisaFlags } from '@/types/jobs';

const BAND_STYLES: Record<SponsorshipSignal['band'], string> = {
  none: 'border-border bg-muted/50 text-muted-foreground',
  low: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  moderate: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  strong: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

function fmtMoney(n?: number): string | null {
  if (!n || n <= 0) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n).toLocaleString()}`;
  }
}

function fmtCount(n?: number): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

export function SponsorshipBadge({ sponsorship }: { sponsorship: SponsorshipSignal }) {
  const money = fmtMoney(sponsorship.median_wage);
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`Visa sponsorship: ${sponsorship.headline}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0 text-[10.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            BAND_STYLES[sponsorship.band] ?? BAND_STYLES.none,
          )}
        >
          <ShieldCheck className="h-2.5 w-2.5" />
          {sponsorship.headline}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-72">
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-semibold">{sponsorship.headline}</p>
          </div>
          {sponsorship.summary && (
            <p className="text-xs leading-snug text-muted-foreground">{sponsorship.summary}</p>
          )}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            <div>
              <dt className="text-muted-foreground">Approvals (5y)</dt>
              <dd className="font-semibold tabular-nums">{fmtCount(sponsorship.approvals_5y)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">LCA filings (5y)</dt>
              <dd className="font-semibold tabular-nums">{fmtCount(sponsorship.lca_filings_5y)}</dd>
            </div>
            {money && (
              <div>
                <dt className="text-muted-foreground">Median wage</dt>
                <dd className="font-semibold tabular-nums">{money}</dd>
              </div>
            )}
            {sponsorship.data_vintage && (
              <div>
                <dt className="text-muted-foreground">Data vintage</dt>
                <dd className="font-semibold">{sponsorship.data_vintage}</dd>
              </div>
            )}
          </dl>
          {sponsorship.source && (
            <p className="text-[10px] text-muted-foreground">Source: {sponsorship.source}</p>
          )}
          {sponsorship.disclaimer && (
            <p className="border-t border-border/70 pt-2 text-[10px] leading-snug text-muted-foreground">
              {sponsorship.disclaimer}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

type FlagKey = keyof VisaFlags;

const FLAG_LABELS: Record<FlagKey, string> = {
  sponsors_h1b: 'Sponsors H-1B',
  cap_exempt: 'Cap-exempt',
  accepts_cpt: 'Accepts CPT',
  no_citizenship_requirement: 'No citizenship req',
  clearance_required: 'Clearance required',
  e_verify: 'E-Verify',
};

// Order the positive signals first; clearance is a warning shown when true.
const POSITIVE_KEYS: FlagKey[] = [
  'sponsors_h1b',
  'cap_exempt',
  'accepts_cpt',
  'no_citizenship_requirement',
  'e_verify',
];

export function VisaFlagChips({ flags }: { flags: VisaFlags }) {
  const positives = POSITIVE_KEYS.filter((k) => flags[k]?.value === true);
  const clearance = flags.clearance_required?.value === true;

  if (positives.length === 0 && !clearance) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {positives.map((k) => (
        <span
          key={k}
          title={flags[k]?.evidence || undefined}
          className="inline-flex items-center gap-0.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300"
        >
          <BadgeCheck className="h-2.5 w-2.5" />
          {FLAG_LABELS[k]}
        </span>
      ))}
      {clearance && (
        <span
          title={flags.clearance_required?.evidence || 'This role requires a security clearance.'}
          className="inline-flex items-center gap-0.5 rounded-md border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
        >
          <ShieldAlert className="h-2.5 w-2.5" />
          {FLAG_LABELS.clearance_required}
        </span>
      )}
    </div>
  );
}
