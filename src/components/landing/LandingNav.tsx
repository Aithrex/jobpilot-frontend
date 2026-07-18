import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { Container } from './_shared';

function ThemeToggle() {
  const { setTheme } = useTheme();
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    setIsDark(!isDark);
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="text-muted-foreground"
    >
      {isDark ? <Sun className="h-[1.15rem] w-[1.15rem]" /> : <Moon className="h-[1.15rem] w-[1.15rem]" />}
    </Button>
  );
}

/** In-page anchors to real sections only — no invented pages. */
const NAV_LINKS = [
  { label: 'How it works', href: '#sponsorship' },
  { label: 'Growth loop', href: '#growth-loop' },
  { label: 'Pricing', href: '#pricing' },
];

/**
 * Slim landing header — logo, real section anchors (desktop), theme toggle,
 * sign-in, and the single primary action (same outcome verb as the hero:
 * "Find my matches"). Border colour swaps on scroll (never appears/disappears)
 * so the header height is stable — zero layout shift.
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
        'sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,border-color] duration-200',
        scrolled ? 'border-border bg-background/85' : 'border-transparent bg-background/60',
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-control font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Aspirely home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-control bg-primary text-primary-foreground">
            <Compass className="h-[1.15rem] w-[1.15rem]" />
          </span>
          <span className="font-display text-lg tracking-tight">Aspirely</span>
        </Link>

        <nav aria-label="Landing sections" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="rounded-control px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild className="h-11 rounded-full px-5">
            <Link to="/register">Find my matches</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
