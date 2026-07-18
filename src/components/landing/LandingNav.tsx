import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Container, startHref } from './_shared';

/** In-page anchors to real sections only — no invented pages. */
const NAV_LINKS = [
  { label: 'How it works', href: '#sponsorship' },
  { label: 'Growth loop', href: '#growth-loop' },
  { label: 'Pricing', href: '#pricing' },
];

/**
 * Landing header. The whole landing is one forced-dark "night signal" surface
 * (see LandingExperience), so the header is always light-on-dark: transparent
 * over the hero band, then a solid night bar (token-driven, so it resolves to
 * the same night indigo) once the visitor scrolls past most of the band.
 * No theme toggle here — the marketing page has a single deliberate look; the
 * app keeps its themes. Fixed with a stable height, so the swap never shifts
 * layout.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-200',
        scrolled ? 'border-border bg-background/85 backdrop-blur-md' : 'border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-control font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Aspirely home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-control bg-primary text-primary-foreground">
            <Sparkles className="h-[1.15rem] w-[1.15rem]" />
          </span>
          <span className="hidden font-display text-lg tracking-tight min-[430px]:inline">Aspirely</span>
        </Link>

        <nav aria-label="Landing sections" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="rounded-control px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="text-slate-300 hover:bg-white/10 hover:text-white">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild className="h-11 rounded-full px-5">
            <Link to={startHref()}>Find my matches</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
