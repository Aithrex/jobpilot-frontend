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

export function LandingNav() {
  // Scroll elevation: transparent-ish at the top of the page, gains a hairline
  // border + shadow once content scrolls beneath. Border colour swaps (never
  // appears/disappears) so the header height is stable — zero layout shift.
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
        'sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-200',
        scrolled ? 'border-border/70 bg-background/80 shadow-soft' : 'border-transparent bg-background/60',
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Aspirely home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Compass className="h-[1.15rem] w-[1.15rem]" />
          </span>
          <span className="font-display text-lg tracking-tight">Aspirely</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <a href="#how-it-works">How it works</a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <a href="#pricing">Pricing</a>
          </Button>
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/register">Get started free</Link>
          </Button>
        </div>
      </Container>
    </header>
  );
}
