import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';

/**
 * The app's ONE theme control, used by every surface: the workspace top bar,
 * the landing nav, and the auth stage.
 *
 * There used to be two - this icon button in the top bar, and a track-and-knob
 * switch on the landing page - which meant the same setting looked like two
 * different controls depending on where you found it. One control everywhere
 * is worth more than either shape being individually optimal.
 *
 * Three-state cycle (light → dark → system → light) rather than a binary flip,
 * because "system" is a real, distinct choice and a two-position switch cannot
 * express it. The icon names the state you are IN, and the label spells out
 * both that state and the one a press moves you to, so the control never has
 * to be inferred from a single glyph.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  // Anything unexpected in storage is treated as "system" (provider default).
  const themeState: 'light' | 'dark' | 'system' =
    theme === 'light' || theme === 'dark' ? theme : 'system';
  const nextTheme =
    themeState === 'light' ? 'dark' : themeState === 'dark' ? 'system' : 'light';
  const Icon = themeState === 'light' ? Sun : themeState === 'dark' ? Moon : Monitor;
  const label = `Theme: ${themeState}. Switch to ${nextTheme} theme`;

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground interactive interactive-press hover:bg-accent hover:text-foreground active:bg-accent/80',
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
