import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Container } from './_shared';

const LINK_CLASS =
  'rounded-control px-1 py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Slim landing footer — quiet on the night surface: brand, one honest line,
 *  essential links, a hairline top border. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col items-center justify-between gap-4 py-10 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-control bg-primary text-primary-foreground">
            <Compass className="h-3.5 w-3.5" />
          </span>
          Aspirely <span className="font-normal text-muted-foreground">by Aithrex</span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Footer">
          <a href="#sponsorship" className={LINK_CLASS}>
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
    </footer>
  );
}
