import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Container } from './_shared';

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-3.5 w-3.5" />
          </span>
          JobPilot <span className="font-normal text-muted-foreground">by Aithrex</span>
        </div>
        <nav className="flex items-center gap-5" aria-label="Footer">
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </a>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link to="/applypilot/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </nav>
        <p>© {new Date().getFullYear()} Aithrex</p>
      </Container>
    </footer>
  );
}
