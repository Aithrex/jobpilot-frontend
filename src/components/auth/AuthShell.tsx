import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Shared two-pane auth layout for the standalone /login, /register and
 * /reset-password routes. Left: a calm branded panel with the value props and
 * our integrity promise. Right: the form. Fully token-driven so it stays
 * coherent in both themes; entrance motion respects reduced-motion.
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const POINTS = [
  'Tailor your resume accurately to any job description',
  'Track every application in one focused pipeline',
  'Daily market trends and an agentic career copilot',
  'Interview prep and a learning playground built in',
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  banner,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  /** Optional notice rendered above the form (e.g. session-expired). */
  banner?: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="brand-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(42% 42% at 82% 8%, hsl(0 0% 100% / 0.9), transparent 70%), radial-gradient(38% 44% at 8% 92%, hsl(0 0% 100% / 0.35), transparent 70%)',
          }}
        />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Sparkles className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">JobPilot</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-display text-3xl font-extrabold leading-tight text-balance">
            The job hunt, turned into a productive workspace.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white/90" aria-hidden />
                <span className="text-white/90">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-start gap-2.5 text-sm text-white/80">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Your data stays yours. We never sell it or fabricate your experience.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:min-h-0">
        <div className="flex items-center justify-between lg:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.2} aria-hidden />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">JobPilot</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="absolute right-6 top-6 hidden lg:block">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="w-full max-w-sm py-10"
          >
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-balance">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            {banner && <div className="mt-6">{banner}</div>}
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
            <p className="mt-6 text-center text-xs text-muted-foreground/80">
              No spam. Delete your account anytime.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
