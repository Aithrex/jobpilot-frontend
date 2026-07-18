import { Link } from 'react-router-dom';
import { CalendarClock, Compass, ListChecks, ShieldCheck, Target, type LucideIcon } from 'lucide-react';
import { Container } from './_shared';

const LINK_CLASS =
  'rounded-control px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Real product capabilities only - icon + short label, no invented claims. */
const BENEFITS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: ShieldCheck, label: 'Checked against public filings' },
  { icon: CalendarClock, label: 'Daily job updates' },
  { icon: Target, label: 'Personalized matches' },
  { icon: ListChecks, label: 'Application tracking' },
];

/**
 * Landing footer: a light benefits band (one line + four icon benefits, all
 * real features) above the slim legal row - brand, essential links, year.
 */
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      {/* Benefits band */}
      <Container className="py-12 sm:py-14">
        <h2 className="mx-auto max-w-2xl text-balance text-center font-display text-xl font-bold text-foreground sm:text-2xl">
          Join students and professionals finding sponsored roles abroad
        </h2>
        <ul className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-2.5 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </li>
          ))}
        </ul>
      </Container>

      {/* Legal row */}
      <div className="border-t border-border">
        <Container className="flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <span className="grid h-6 w-6 place-items-center rounded-control bg-primary text-primary-foreground">
              <Compass className="h-3.5 w-3.5" />
            </span>
            Aspirely <span className="font-normal text-muted-foreground">by Aithrex</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Footer">
            <a href="#pitch" className={LINK_CLASS}>
              How it works
            </a>
            <a href="#pricing" className={LINK_CLASS}>
              Pricing
            </a>
            <Link to="/login" className={LINK_CLASS}>
              Sign in
            </Link>
            <Link to="/privacy" className={LINK_CLASS}>
              Privacy
            </Link>
            <Link to="/terms" className={LINK_CLASS}>
              Terms
            </Link>
          </nav>
          <p className="tabular-nums">© {new Date().getFullYear()} Aithrex</p>
        </Container>
      </div>
    </footer>
  );
}
