import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GuestGateProps {
  /** Total number of items behind the gate (for the CTA copy). */
  totalCount: number;
  /** Blurred decoy content shown beneath the overlay. */
  children: React.ReactNode;
  /** Optional override copy. */
  title?: string;
  subtitle?: string;
}

/**
 * Frosted "sign in to unlock" gate. Renders its children blurred and
 * non-interactive with a centered call-to-action floating over them — the
 * guest-preview pattern: a few real results are visible above, the rest sit
 * behind this. Logged-in users should never see this (render the real content
 * instead).
 */
export function GuestGate({ totalCount, children, title, subtitle }: GuestGateProps) {
  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl">
      {/* Blurred, inert preview */}
      <div className="pointer-events-none select-none blur-[6px] saturate-[0.85] [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden>
        {children}
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-primary/25 bg-card/90 p-6 text-center shadow-pop backdrop-blur-xl">
          <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30">
            <Lock className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {title ?? `Sign in to unlock all ${totalCount} matches`}
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {subtitle ?? 'Free account. Your resume and matches come with you, and every job posting is unlocked.'}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild size="sm" className="gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500">
              <Link to="/register">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Create free account
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
