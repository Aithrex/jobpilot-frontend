import { ShieldCheck } from 'lucide-react';
import { Container, Reveal } from './_shared';

/**
 * One honest line — the throughline of the whole product. Not a badge wall:
 * a single, quiet statement that everything above was authored (never
 * fabricated) and every sponsorship signal is one you can trust.
 */
export function IntegrityBand() {
  return (
    <section aria-label="Our integrity commitment" className="py-6">
      <Container>
        <Reveal>
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-3 rounded-container border border-border bg-card px-5 py-4 text-center shadow-soft">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="text-pretty text-caption text-foreground sm:text-body">
              <span className="font-semibold">Authored, never fabricated.</span>{' '}
              <span className="text-muted-foreground">Sponsorship you can trust. Every number labelled honestly.</span>
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export default IntegrityBand;
