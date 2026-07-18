import { ShieldCheck } from 'lucide-react';
import { Container, MonoChip, Reveal } from './_shared';

/**
 * The brand's thesis, made the strongest visual moment below the pitch: the
 * hero's mono INTEGRITY-FIRST chip motif writ large on the night surface —
 * an oversized mono watermark, one big honest statement, and the two
 * supporting commitments set as mono lines between hairline rules. No new
 * claims; the copy is the same throughline the product carries everywhere.
 */
export function IntegrityBand() {
  return (
    <section
      aria-label="Our integrity commitment"
      className="relative isolate overflow-hidden border-y border-border py-20 sm:py-28"
    >
      {/* Oversized mono watermark — the house rule, faint behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <span className="select-none whitespace-nowrap font-mono text-[18vw] font-bold uppercase tracking-[0.06em] text-primary/[0.05] lg:text-[12rem]">
          Integrity
        </span>
      </div>
      {/* Soft indigo glow anchoring the statement */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%, hsl(var(--primary) / 0.10), transparent 70%)' }}
      />

      <Container>
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
          {/* The hero's chip, returning at the page's moral centre */}
          <MonoChip>
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Integrity-first
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
              aria-hidden
            />
          </MonoChip>

          <h2 className="mt-6 text-balance font-display text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            Authored, never fabricated.
          </h2>

          {/* The two commitments, between hairline rules */}
          <div className="mt-10 w-full border-y border-border">
            <div className="grid sm:grid-cols-2">
              <p className="border-b border-border px-6 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300 sm:border-b-0 sm:border-r">
                Sponsorship you can trust
              </p>
              <p className="px-6 py-4 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300">
                Every number labelled honestly
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export default IntegrityBand;
