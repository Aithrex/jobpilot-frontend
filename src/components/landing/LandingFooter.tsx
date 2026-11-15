import { Link } from 'react-router-dom';
import { BrandMark } from '@/components/BrandMark';
import { useAuth } from '@/contexts/AuthContext';
import { LEGAL_LINKS } from '@/lib/legal';
import { Container, PUBLIC_NAV } from './_shared';

const LINK_CLASS =
  'focus-ring-visible rounded-control text-[0.9375rem] text-ink-muted transition-colors hover:text-foreground';

/**
 * The footer: the mark, the public pages, the legal set, the line.
 *
 * NOTHING HERE RESTATES THE PITCH. A footer is the one place a reader has
 * stopped being sold to. It lists where things are, in the same order and
 * with the same labels as the header, so the two never disagree.
 */
export function LandingFooter() {
  const { isAuthenticated } = useAuth();
  return (
    <footer className="border-t border-border">
      <Container className="py-12 lg:py-14">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <Link
            to="/"
            aria-label="Aspirely home"
            className="focus-ring-visible inline-flex items-center gap-2.5 self-start rounded-control"
          >
            <BrandMark />
            <span className="font-display text-[1.125rem] font-semibold tracking-[-0.03em] text-foreground">
              Aspirely <span className="font-normal text-muted-foreground">by Aithrex</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-x-8 gap-y-3" aria-label="Footer">
            {PUBLIC_NAV.map((link) => (
              <Link key={link.route} to={link.route} className={LINK_CLASS}>
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <Link to="/app/home" className={LINK_CLASS}>
                Workspace
              </Link>
            ) : (
              <Link to="/login" className={LINK_CLASS}>
                Sign in
              </Link>
            )}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-5 border-t border-border pt-7 lg:flex-row lg:items-center lg:justify-between">
          {/* The legal and trust set comes from lib/legal, so every footer and
              the Trust Center list the same pages in the same order. */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Legal">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="focus-ring-visible rounded-control text-[0.875rem] text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-[0.875rem] tabular-nums text-muted-foreground">
            &copy; {new Date().getFullYear()} Aithrex. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
