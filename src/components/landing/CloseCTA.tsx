import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, EASE, startHref } from './_shared';

/**
 * Close — a single, calm call to action. The CTA wording is IDENTICAL to the
 * hero primary ("Find my matches" → /register) so the whole page resolves to
 * one decision.
 */
export function CloseCTA() {
  const reduce = useReducedMotion();
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <motion.div
          className="mx-auto max-w-2xl rounded-container border border-border bg-card px-6 py-14 text-center shadow-soft sm:px-10 sm:py-16"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: reduce ? 0.15 : 0.24, ease: EASE }}
        >
          <h2 className="mx-auto max-w-md font-display text-title font-bold leading-tight tracking-tight text-foreground">
            Make your last months count.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-body text-muted-foreground">
            Free to start, no card. Begin with the roles that actually sponsor.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="w-full rounded-control sm:w-auto">
              <Link to={startHref()}>
                Find my matches <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
