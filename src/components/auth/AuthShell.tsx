import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { ThemeToggle } from '@/components/theme-toggle';
import { usePublicSurface } from '@/components/landing/_shared';
import { LEGAL_ROUTES } from '@/lib/legal';
import { cn } from '@/lib/utils';
import './auth.css';

/**
 * The page every sign-in screen sits on: /login, /register, /reset-password
 * and the provider callback.
 *
 * It is a public page, so it uses the public system (`usePublicSurface`, the
 * `pub-*` classes): white canvas, ink headings in Mona Sans, cobalt for the
 * one action, and the navy chapter as the single saturated surface. On a wide
 * screen the form sits beside that chapter; below `lg` the chapter is not
 * shown and the form is the page.
 *
 * The form column is top-anchored on phones (nothing jumps when the keyboard
 * opens) and centred on wide screens. The page is the only scroll container.
 */

/**
 * Deep-link return path, preserved across auth. Router `state.from` covers the
 * in-app flow; sessionStorage covers the provider round-trip (the redirect
 * drops router state). Same-origin paths only: protocol-relative and absolute
 * URLs are rejected.
 */
export const AUTH_RETURN_TO_KEY = 'auth.return_to';

export function sanitizeReturnTo(path: unknown): string | null {
  if (typeof path !== 'string') return null;
  return path.startsWith('/') && !path.startsWith('//') ? path : null;
}

export function stashAuthReturnTo(path: string | null): void {
  if (typeof window === 'undefined' || !path) return;
  try {
    window.sessionStorage.setItem(AUTH_RETURN_TO_KEY, path);
  } catch {
    /* storage disabled: the deep link just won't survive the provider round-trip */
  }
}

/** Read + clear the stashed return path (sanitized). */
export function consumeAuthReturnTo(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_RETURN_TO_KEY);
    window.sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
    return sanitizeReturnTo(raw);
  } catch {
    return null;
  }
}

/** What the product does today, in the home page's own words. */
const PROOF: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "From the employer's own careers page",
    body: 'Every role links to the original posting, with the date it went up.',
  },
  {
    title: 'Visa sponsorship evidence on the card',
    body: 'Past H-1B filings sit beside the fit, before you spend an evening applying.',
  },
  {
    title: 'Tailoring that invents nothing',
    body: 'Your resume is reordered and reworded from what is already in it.',
  },
];

const FOOT_LINK =
  'pub-auth-link inline-flex min-h-11 items-center px-1 text-sm !font-medium !text-ink-subtle hover:!text-foreground';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  banner,
  step,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** The line under the form ("New here? Create your account"). */
  footer?: ReactNode;
  /** A notice above the form (session ended, provider cancelled, offline). */
  banner?: ReactNode;
  /** Names the current step, so a step change re-runs the entrance. */
  step?: string;
}) {
  const surface = usePublicSurface();

  return (
    <div
      className={cn('pub-auth min-h-screen', surface.className)}
      style={{ colorScheme: surface.colorScheme }}
      data-auth-step={step}
    >
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.04fr)]">
        <div className="flex min-h-screen flex-col px-5 sm:px-10">
          <header className="flex h-16 shrink-0 items-center justify-between">
            <Link
              to="/"
              aria-label="Aspirely home"
              className="pub-auth-link -ml-1 inline-flex min-h-11 items-center gap-2.5 px-1 !text-foreground hover:!no-underline"
            >
              <BrandMark />
              <span
                className="font-display text-[1.1875rem] font-bold tracking-[-0.03em]"
                style={{ fontStretch: '108%' }}
              >
                Aspirely
              </span>
            </Link>
            <ThemeToggle />
          </header>

          <main className="flex flex-1 justify-center pb-8 pt-6 sm:pt-10 lg:items-center lg:pt-0">
            <div key={step} className="pub-auth-step w-full max-w-[25.5rem]">
              <h1 className="pub-h3">{title}</h1>
              {subtitle && <p className="pub-body mt-2.5">{subtitle}</p>}
              {banner && <div className="mt-6">{banner}</div>}
              <div className="mt-7">{children}</div>
              {footer && (
                <div className="mt-7 text-center text-[0.9375rem] text-ink-muted">{footer}</div>
              )}
            </div>
          </main>

          <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-4 pb-4">
            <Link to={LEGAL_ROUTES.terms} className={FOOT_LINK}>
              Terms
            </Link>
            <Link to={LEGAL_ROUTES.privacy} className={FOOT_LINK}>
              Privacy
            </Link>
            <Link to={LEGAL_ROUTES.trust} className={FOOT_LINK}>
              Trust
            </Link>
          </footer>
        </div>

        <aside className="pub-brand-band pub-auth-aside" aria-label="What Aspirely does">
          <div className="max-w-[31rem]">
            <p className="pub-h2">Jobs worth applying to, matched to your resume.</p>
            <ul className="mt-12 space-y-7">
              {PROOF.map((item) => (
                <li key={item.title} className="pub-auth-proof">
                  <span className="pub-auth-proof-dot" aria-hidden>
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="pub-h4" style={{ color: 'hsl(var(--brand-band-foreground))' }}>
                      {item.title}
                    </p>
                    <p className="pub-band-muted mt-1.5 text-[1.0625rem] leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
