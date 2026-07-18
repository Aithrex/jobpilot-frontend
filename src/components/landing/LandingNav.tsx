import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sparkles, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { Container, startHref } from './_shared';

function ThemeToggle({ onDark }: { onDark: boolean }) {
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
      className={onDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-muted-foreground'}
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
 * Landing header. The hero beneath it is an always-dark full-bleed band, so
 * the header starts transparent with light-on-dark text (both themes) and
 * only becomes a solid token-driven bar once the visitor scrolls past most
 * of the band. Fixed (overlays the hero) with a stable height, so the swap
 * never shifts layout.
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
  const onDark = !scrolled;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color] duration-200',
        onDark ? 'border-transparent bg-transparent' : 'border-border bg-background/85 backdrop-blur-md',
      )}
    >
      <Container className="flex h-16 items-center justify-between">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2.5 rounded-control font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            onDark ? 'text-white focus-visible:ring-offset-[#0A0D1E]' : 'focus-visible:ring-offset-background',
          )}
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
              className={cn(
                'rounded-control px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                onDark
                  ? 'text-slate-300 hover:text-white focus-visible:ring-offset-[#0A0D1E]'
                  : 'text-muted-foreground hover:text-foreground focus-visible:ring-offset-background',
              )}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle onDark={onDark} />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              onDark
                ? 'text-slate-300 hover:bg-white/10 hover:text-white'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
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
