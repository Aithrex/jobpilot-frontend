/**
 * The three work-authorization signals a posting can carry.
 *
 * All three are FACTS ABOUT THE POSTING OR THE EMPLOYER. None of them is a
 * judgement about the person reading them, none of them is a prediction of
 * that person's outcome, and none of them is immigration or legal advice.
 *
 *  - `ClearanceRequiredBadge` - this role states it needs an active US
 *    security clearance. Rendered with the posting's own wording when we have
 *    it, because "requires an active TS/SCI with polygraph" and "clearance
 *    preferred" are wildly different facts.
 *  - `NoSponsorshipBadge` - this posting states the employer does not sponsor.
 *    Only ever rendered off an explicit statement; a silent posting gets
 *    nothing at all.
 *  - `EmployerSponsorshipBadge` - the MANDATED framing, and the only sentence
 *    this product is allowed to say about H-1B history:
 *
 *        "Sponsored N people in similar roles in <the window the data covers>"
 *
 *    always beside its source and its data vintage, with the backend's own
 *    `disclaimer` rendered verbatim, and rendering NOTHING when there is no
 *    data. Not a zero, not "unknown odds", not a grey placeholder: an absence
 *    of filings in a public dataset is not evidence about an employer.
 *
 *    The PERIOD comes from `data_window` / `data_vintage`, never from the name
 *    of the field holding the count. The store's field is called
 *    `approvals_5y` and holds a single fiscal year; writing "the last 5 years"
 *    from the field name would overstate the evidence fivefold in the one
 *    sentence that has to be exactly right. A count we cannot date is not
 *    rendered at all. `data_vintage` is a PERIOD STRING ("FY2026") and is
 *    printed as-is - it is never parsed as a date.
 *
 * THREE OUTCOMES, THREE RENDERINGS. A lookup returns a signal, a proven
 * census absence, or nothing, and the last two must never look alike:
 *
 *  - `signal`        -> the sentence, in the positive-evidence tint;
 *  - `census_absent` -> "Filed no H-1B petitions in FY2026", in a neutral
 *    tint, because it is a dated fact about the record and NOT a claim that
 *    the employer would refuse to sponsor;
 *  - `no_data`       -> nothing at all. An unmatched employer name is our
 *    failure, and dressing it up as "filed nothing" would put a damaging
 *    claim about a company in our mouth on the strength of a string match.
 *
 * Accessibility: every badge carries an icon and a text label, so none of the
 * three encodes its meaning in colour alone. Tints are semantic tokens
 * (`warning`, `success`, `muted`) which carry AA foregrounds in both themes.
 */
import { BadgeCheck, FileX2, ShieldAlert, ShieldOff } from 'lucide-react';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import {
  hasCensusAbsentEvidence,
  hasSponsorshipEvidence,
  sponsorshipPeriodLabel,
  type EmployerSponsorshipSignal,
} from '@/types/workAuthorization';

const CHIP =
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium';

export function ClearanceRequiredBadge({
  detail,
  className,
}: {
  /** The posting's own wording, when the index captured it. */
  detail?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(CHIP, 'border-warning/40 bg-warning/10 text-warning', className)}
      title={detail || 'This posting states that an active US security clearance is required.'}
      data-testid="signal-clearance-required"
    >
      <ShieldAlert className="h-3 w-3" aria-hidden />
      Security clearance required
      {detail ? <span className="sr-only">. {detail}</span> : null}
    </span>
  );
}

export function NoSponsorshipBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(CHIP, 'border-warning/40 bg-warning/10 text-warning', className)}
      title={
        'This posting states the employer does not sponsor work visas. It is ' +
        'the employer speaking, not an assessment of you.'
      }
      data-testid="signal-no-sponsorship"
    >
      <ShieldOff className="h-3 w-3" aria-hidden />
      Employer states no sponsorship
    </span>
  );
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * The sentence, and only the sentence.
 *
 * `hasSponsorshipEvidence` is the gate: no positive count, or a count the
 * payload cannot date, and this component returns null with nothing in its
 * place.
 */
export function EmployerSponsorshipBadge({
  signal,
  className,
}: {
  signal: EmployerSponsorshipSignal | null | undefined;
  className?: string;
}) {
  // A proven absence is its own answer, and its own component.
  if (hasCensusAbsentEvidence(signal)) {
    return <CensusAbsentBadge signal={signal} className={className} />;
  }
  if (!hasSponsorshipEvidence(signal)) return null;

  const count = signal.similar_role_approvals as number;
  const people = `${formatCount(count)} ${count === 1 ? 'person' : 'people'}`;
  // Never the field name. `hasSponsorshipEvidence` has already refused to
  // render anything this returns null for.
  const period = sponsorshipPeriodLabel(signal) as string;
  // The mandated sentence. The employer-wide variant exists only so the
  // legacy, non-role-scoped payload cannot borrow the words "similar roles".
  const sentence =
    signal.scope === 'employer_wide'
      ? `Sponsored ${people} across all roles in ${period}`
      : `Sponsored ${people} in similar roles in ${period}`;

  const provenance = [signal.source, signal.data_vintage ?? period].filter(Boolean).join(' - ');
  const windowMismatch = signal.data_window?.service_claim_mismatch === true;

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            CHIP,
            'border-success/30 bg-success/10 text-success',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
          data-testid="signal-employer-sponsorship"
        >
          <BadgeCheck className="h-3 w-3" aria-hidden />
          {sentence}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 space-y-2">
        <p className="text-xs font-semibold text-foreground">{sentence}</p>
        {signal.similar_role_label && (
          <p className="text-[11px] text-muted-foreground">
            &quot;Similar roles&quot; here means {signal.similar_role_label}.
          </p>
        )}
        {typeof signal.total_approvals === 'number' && signal.total_approvals > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {formatCount(signal.total_approvals)} across all roles over the same period.
          </p>
        )}
        {/* A known inconsistency, disclosed rather than smoothed over: the
            service still advertises a five-year window while the stored data
            covers the period above. The reader is told which one the number
            on screen came from. */}
        {windowMismatch && (
          <p
            className="text-[11px] leading-snug text-warning"
            data-testid="signal-sponsorship-window-mismatch"
          >
            This count covers {period}. Our sponsorship service still describes
            its data as a five-year window; the figure above is the period the
            data actually covers.
          </p>
        )}
        {provenance && (
          <p className="text-[10px] text-muted-foreground" data-testid="signal-sponsorship-source">
            Source: {provenance}
          </p>
        )}
        {signal.source_url && (
          <a
            href={signal.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="interactive inline-block text-[10px] font-medium text-primary underline"
          >
            Check the filing data yourself
          </a>
        )}
        {/* The backend's sentence, verbatim. It is what makes the number safe
            to publish, so it is never paraphrased and never dropped. */}
        {signal.disclaimer && (
          <p
            className="border-t border-border/70 pt-2 text-[10px] leading-snug text-muted-foreground"
            data-testid="signal-sponsorship-disclaimer"
          >
            {signal.disclaimer}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * "This employer filed no H-1B petitions in <period>."
 *
 * A dated fact about the public record, and a genuinely useful one to someone
 * who needs sponsorship - it is why this is shown rather than swallowed. Three
 * things it is careful not to be:
 *
 *  - not a prediction. It says what the record shows for a period, in the past
 *    tense, and never that the employer "does not sponsor";
 *  - not an error state. Neutral tint, not destructive: the employer has done
 *    nothing wrong and the user has hit no problem;
 *  - not the same as no data. This badge only ever renders off the server's
 *    explicit `census_absent`, never off a missing row.
 */
function CensusAbsentBadge({
  signal,
  className,
}: {
  signal: EmployerSponsorshipSignal;
  className?: string;
}) {
  const period = sponsorshipPeriodLabel(signal) as string;
  const sentence = `Filed no H-1B petitions in ${period}`;
  const provenance = [signal.source, signal.data_vintage ?? period].filter(Boolean).join(' - ');

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            CHIP,
            'border-border bg-muted text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className,
          )}
          data-testid="signal-sponsorship-census-absent"
        >
          <FileX2 className="h-3 w-3" aria-hidden />
          {sentence}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 space-y-2">
        <p className="text-xs font-semibold text-foreground">{sentence}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">
          This employer appears in the filing data for {period} with no H-1B
          petitions recorded. That is what the public record shows for that
          period. It is not a statement about whether they would sponsor
          anyone, and it does not mean you cannot apply.
        </p>
        {provenance && (
          <p className="text-[10px] text-muted-foreground" data-testid="signal-sponsorship-source">
            Source: {provenance}
          </p>
        )}
        {signal.source_url && (
          <a
            href={signal.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="interactive inline-block text-[10px] font-medium text-primary underline"
          >
            Check the filing data yourself
          </a>
        )}
        {signal.disclaimer && (
          <p
            className="border-t border-border/70 pt-2 text-[10px] leading-snug text-muted-foreground"
            data-testid="signal-sponsorship-disclaimer"
          >
            {signal.disclaimer}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
