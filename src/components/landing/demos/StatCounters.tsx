import { StatValue } from './_demoKit';

const STATS = [
  { to: 90, suffix: 's', label: 'to a tailored application', foot: 'vs ~25 min by hand' },
  { to: 340, label: 'applications, all tracked', foot: 'one calm pipeline' },
  { to: 63, label: 'H-1B sponsors surfaced', foot: 'from public filings' },
  { to: 150, label: 'days on your OPT clock', foot: 'with STEM extension' },
];

/** Animated count-ups for the core promises — an infographic, not decoration. */
export default function StatCounters() {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
      {STATS.map((s) => (
        <div key={s.label} className="bg-card p-5 text-center sm:p-6">
          <dt className="font-display text-4xl font-extrabold tracking-tight text-foreground">
            <StatValue to={s.to} suffix={s.suffix ?? ''} />
          </dt>
          <dd className="mt-1.5 text-sm font-medium text-foreground/90">{s.label}</dd>
          <p className="mt-0.5 text-xs text-muted-foreground">{s.foot}</p>
        </div>
      ))}
    </dl>
  );
}
