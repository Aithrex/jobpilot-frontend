import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Aurora, Container, EASE, startHref } from './_shared';

/**
 * Close — the pain bookend, resolved: one headline, one short line, and the
 * page's two CTAs (indigo primary + quiet outline) so it ends on a single
 * decision. Light surface with a soft pastel aurora wash behind it; the
 * buttons are fully token-driven so they match the light CTA language
 * everywhere else on the page.
 */
export function CloseCTA() {
  const reduce = useReducedMotion();
  return (
    <section className="relative isolate overflow-hidden border-t border-border py-24 sm:py-32">
      <Aurora />

      <Container>
        <motion.div
          className="mx-auto flex max-w-2xl flex-col items-center text-center"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: reduce ? 0.15 : 0.24, ease: EASE }}
        >
          <h2 className="max-w-md text-balance font-display text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-5xl">
            Make your last months count.
          </h2>
          <p className="mt-4 max-w-sm text-body text-muted-foreground">
            Free to start, no card. Begin with the roles that actually sponsor.
          </p>
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-control bg-primary px-7 text-base font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.45)] hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
            >
              <Link to={startHref()}>
                Find my matches <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-control border-border bg-card px-7 text-base text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
            >
              <a href="#pitch">
                <Play className="h-4 w-4" /> Watch the 60-second pitch
              </a>
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
