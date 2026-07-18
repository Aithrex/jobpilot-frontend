import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Container, startHref } from './_shared';

/** In-page anchors to real sections only - no invented pages. */
const NAV_LINKS = [
  { label: 'How it works', href: '#pitch' },
  { label: 'Features', href: '#sponsorship' },
  { label: 'Pricing', href: '#pricing' },
];

/**
 * Landing header - a slim, professional light bar: white with blur, hairline
 * border once the visitor scrolls. Logo left, section links center, Sign in +
 * the primary pill CTA right. Fixed with a stable height so the border swap
 * never shifts layout. No theme toggle: the landing is one deliberate light
 * look; the app keeps its themes.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b bg-card/95 backdrop-blur-md transition-[border-color,box-shadow] duration-200',
        scrolled ? 'border-border shadow-soft' : 'border-transparent',
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-control font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
              className="rounded-control px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="sm" className="h-11 text-muted-foreground hover:text-foreground">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild className="h-11 rounded-full px-5">
            <Link to={startHref()}>Find sponsored jobs</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
