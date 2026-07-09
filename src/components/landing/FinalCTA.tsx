import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Aurora, Container, Reveal } from './_shared';

export function FinalCTA() {
  return (
    <section className="pb-24 pt-4">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 px-6 py-14 text-center sm:px-10 sm:py-20">
            {/* brand gradient wash — used sparingly, as the closing note */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 brand-gradient opacity-[0.09]" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -z-10 h-56 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
            {/* living light for the close — self-gating (paused off-screen / reduced-motion) */}
            <Aurora />

            <Reveal y={26} delay={0.08}>
              <h2 className="mx-auto max-w-2xl text-balance font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
                Turn the countdown into a plan today.
              </h2>
            </Reveal>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Find the roles that sponsor, send a tailored application in 90 seconds, and close the gaps between you and
              your next callback — all grounded in your real work.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full transition-[background-color,box-shadow] hover:shadow-xl hover:shadow-primary/25 sm:w-auto"
              >
                <Link to="/register">
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Free to start · no credit card · your data stays yours</p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
