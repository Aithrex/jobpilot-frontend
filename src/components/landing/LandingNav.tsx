import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The one floating liquid-glass surface on the page: wordmark, Sign in, and
 * the primary upload action. Composes the canonical index.css recipe -
 * `.glass-nav` (token fill + blur, solid @supports fallback), `.glass-nav-strong`
 * (the 0.86 fill the bar needs because it crosses from the obsidian hero onto
 * the pearl editorial surface and must stay AA over both), and
 * `.glass-specular` (the bright top hairline / grounded bottom edge that makes
 * it read as a physical pane). No second blur recipe is hand-rolled here.
 *
 * Mobile collapse is graceful rather than clever: the wordmark drops to the
 * glyph alone below 430px, both controls keep a 44px touch target, and the
 * bar never grows a hamburger for a page that has no site map.
 *
 * The upload action is a REAL upload action. When guest onboarding is live it
 * opens the page's one file dialog on this click (`onUpload` is the shared
 * picker's `open`); it never scrolls to a second uploader. When guest
 * onboarding is off there is nothing to open, so it becomes a plain link to
 * `fallbackHref` instead of pretending.
 */
export interface LandingNavProps {
  /** Opens the shared resume picker. Absent = guest upload is unavailable. */
  onUpload?: () => void;
  /** Where the CTA goes when there is no picker to open. */
  fallbackHref?: string;
  /** CTA label used in the no-picker mode. */
  fallbackLabel?: string;
}

export function LandingNav({
  onUpload,
  fallbackHref = '/register',
  fallbackLabel = 'Create free account',
}: LandingNavProps = {}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="glass-nav glass-nav-strong glass-nav-card glass-specular mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 rounded-2xl border border-foreground/[0.12] px-2.5 sm:px-4">
        <Link
          to="/"
          aria-label="Aspirely home"
          className="focus-ring-visible flex h-11 items-center gap-2 rounded-control font-semibold text-foreground"
        >
          <span className="brand-gradient grid h-8 w-8 place-items-center rounded-control text-white">
            <Sparkles className="h-[1.15rem] w-[1.15rem]" aria-hidden />
          </span>
          <span className="hidden font-display text-lg tracking-tight min-[430px]:inline">
            Aspirely
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-11 px-3 text-muted-foreground hover:text-foreground"
          >
            <Link to="/login">Sign in</Link>
          </Button>
          {onUpload ? (
            <Button size="sm" className="h-11 rounded-full px-4 sm:px-5" onClick={onUpload}>
              Upload resume
            </Button>
          ) : (
            <Button asChild size="sm" className="h-11 rounded-full px-4 sm:px-5">
              <Link to={fallbackHref}>{fallbackLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
