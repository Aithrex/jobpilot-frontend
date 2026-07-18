import { BadgeCheck, FileCheck2, ShieldCheck } from 'lucide-react';
import { Container, MonoChip, Reveal } from './_shared';

/**
 * The brand's thesis as a clean, centered light band: the INTEGRITY-FIRST
 * chip, one headline, and the two commitments as compact icon chips between
 * hairline rules. Professional and quiet — no watermark, no theatre; the
 * copy is the same throughline the product carries everywhere.
 */
export function IntegrityBand() {
  return (
    <section aria-label="Our integrity commitment" className="border-y border-border bg-muted/50 py-16 sm:py-24">
      <Container>
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <MonoChip>
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            Integrity-first
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" aria-hidden />
          </MonoChip>

          <h2 className="mt-6 text-balance font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Authored, never fabricated.
          </h2>

          {/* The two commitments, compact chips between hairline rules */}
          <div className="mt-10 flex w-full flex-col items-center gap-3 border-y border-border py-6 sm:flex-row sm:justify-center sm:gap-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground shadow-soft">
              <FileCheck2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              Sponsorship you can trust
            </p>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-foreground shadow-soft">
              <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              Every number labelled honestly
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export default IntegrityBand;
