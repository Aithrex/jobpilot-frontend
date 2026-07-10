import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, EASE } from './_shared';
import { SignalResolve } from './SignalResolve';

/**
 * Hero — above the fold. One headline (≤6 words), one subline (≤12), one
 * primary CTA and one secondary text link, beside the interactive Signal
 * Resolve signature. No third element. Reserves the signature's aspect ratio so
 * the page never shifts as it mounts (CLS≈0).
 */
export function Hero() {
  const reduce = useReducedMotion();
  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.24, ease: EASE, delay },
        };

  return (
    <section className="relative">
      <Container className="grid items-center gap-10 pb-16 pt-14 sm:pt-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:pb-24">
        {/* copy */}
        <div className="max-w-xl text-center lg:text-left">
          <motion.h1
            {...enter(0.04)}
            className="font-display text-4xl font-extrabold leading-[1.06] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]"
          >
            Cut the noise. <span className="text-primary">Find the fit.</span>
          </motion.h1>

          <motion.p
            {...enter(0.12)}
            className="mx-auto mt-5 max-w-md text-body text-lg leading-relaxed text-muted-foreground lg:mx-0"
          >
            Sponsorship-verified matches and tailored applications, before your visa clock runs out.
          </motion.p>

          <motion.div
            {...enter(0.2)}
            className="mt-8 flex flex-col items-center gap-x-6 gap-y-3 sm:flex-row lg:justify-start"
          >
            <Button asChild size="lg" className="w-full rounded-control sm:w-auto">
              <Link to="/register">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Link
              to="/login"
              className="rounded-control px-1 py-1 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Sign in
            </Link>
          </motion.div>
        </div>

        {/* signature */}
        <motion.div {...enter(0.16)} className="mx-auto w-full max-w-xl">
          <SignalResolve />
        </motion.div>
      </Container>
    </section>
  );
}
