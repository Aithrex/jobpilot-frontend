import { StatValue } from './_demoKit';

interface Stat {
  /** Numeric targets count up on entry; strings (e.g. a range) render as-is. */
  value: number | string;
  suffix?: string;
  label: string;
  foot: string;
}

const STATS: Stat[] = [
  { value: 90, suffix: 's', label: 'to a tailored application', foot: 'vs ~25 min by hand' },
  { value: 6, suffix: 's', label: 'of recruiter attention', foot: 'we design your top third for it' },
  { value: '2–4', label: 'gaps between you and callbacks', foot: 'we name yours, then close them' },
  { value: 150, label: 'days on the OPT clock, tracked', foot: '90 unemployment days + STEM path' },
];

/** Animated count-ups for the core promises — an infographic, not decoration.
 *  Numbers stay text-foreground: the brand gradient's sky end falls below the
 *  3:1 large-text contrast floor on the light card, so no gradient-text here. */
export default function StatCounters() {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className="bg-card p-5 text-center transition-colors duration-200 hover:bg-muted/50 sm:p-6">
          <dt className="font-display text-4xl font-extrabold tracking-tight text-foreground">
            {typeof s.value === 'number' ? (
              <StatValue to={s.value} suffix={s.suffix ?? ''} />
            ) : (
              <span className="tabular-nums">{s.value}</span>
            )}
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-foreground/90">{s.label}</dd>
          <p className="mt-0.5 text-xs text-muted-foreground">{s.foot}</p>
        </div>
      ))}
    </dl>
  );
}
