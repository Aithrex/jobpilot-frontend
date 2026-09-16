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
 *        "Sponsored N people in similar roles in the last 5 years"
 *
 *    always beside its source and its data vintage, with the backend's own
 *    `disclaimer` rendered verbatim, and rendering NOTHING when there is no
 *    data. Not a zero, not "unknown odds", not a grey placeholder: an absence
 *    of filings in a public dataset is not evidence about an employer.
 *
 * Accessibility: every badge carries an icon and a text label, so none of the
 * three encodes its meaning in colour alone. Tints are semantic tokens
 * (`warning`, `success`, `muted`) which carry AA foregrounds in both themes.
 */
import { BadgeCheck, ShieldAlert, ShieldOff } from 'lucide-react';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import {
  hasSponsorshipEvidence,
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
 * `hasSponsorshipEvidence` is the gate: no positive similar-role count means
 * this component returns null and the card shows nothing in its place.
 */
export function EmployerSponsorshipBadge({
  signal,
  className,
}: {
  signal: EmployerSponsorshipSignal | null | undefined;
  className?: string;
}) {
  if (!hasSponsorshipEvidence(signal)) return null;

  const count = signal.similar_role_approvals as number;
  const years = signal.period_years && signal.period_years > 0 ? signal.period_years : 5;
  const people = `${formatCount(count)} ${count === 1 ? 'person' : 'people'}`;
  // The mandated sentence. The employer-wide variant exists only so the
  // legacy, non-role-scoped payload cannot borrow the words "similar roles".
  const sentence =
    signal.scope === 'employer_wide'
      ? `Sponsored ${people} across all roles in the last ${years} years`
      : `Sponsored ${people} in similar roles in the last ${years} years`;

  const provenance = [signal.source, signal.data_vintage].filter(Boolean).join(' - ');

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
