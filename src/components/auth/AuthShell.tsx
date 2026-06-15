import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Shared two-pane auth layout for the standalone /login and /register routes.
 * Left: JobPilot brand panel with value props. Right: the form.
 * Professional, calm, token-driven — matches the workspace and landing.
 */

const POINTS = [
  'Tailor your resume accurately to any job description',
  'Track every application in one focused pipeline',
  'Daily market trends + an agentic career copilot',
  'Interview prep and a learning playground built in',
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="brand-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(40% 40% at 80% 10%, white, transparent 70%)' }}
        />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Sparkles className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">JobPilot</span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            The job hunt, turned into a productive workspace.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-white/90" />
                <span className="text-white/90">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/70">
          Built for job seekers, not for ad clicks.
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex min-h-screen flex-col px-5 py-8 sm:px-8 lg:min-h-0">
        <div className="flex items-center justify-between lg:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.2} />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">JobPilot</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="absolute right-6 top-6 hidden lg:block">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm py-10">
            <h1 className="font-display text-2xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
