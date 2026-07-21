import { FileSearch, ListChecks, Mail, Sparkles } from 'lucide-react';
import { EMAIL_UPDATES, MATCH, TAILOR, TRACK, type Capability } from '@/lib/capabilities';
import { StatusBadge } from './workspace/CapabilityDock';
import { Container, Reveal } from './_shared';

/**
 * "Available now" — the shipped product, stated once and briefly.
 *
 * Deliberately NOT a feature grid: four capabilities, one line each, every
 * status badge read from the capability registry rather than typed here. It
 * sits above "Coming next" and is visually separated from it so a visitor is
 * never left guessing which half of the page they can actually use today.
 */

const ICONS: Record<string, typeof FileSearch> = {
  match: FileSearch,
  tailor: Sparkles,
  track: ListChecks,
  'email-updates': Mail,
};

const ITEMS: Capability[] = [MATCH, TAILOR, TRACK, EMAIL_UPDATES];

export function AvailableNow() {
  return (
    <section
      id="how"
      aria-labelledby="available-now-heading"
      className="relative scroll-mt-24 py-16 sm:py-20"
    >
      <Container>
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/60">
            Available now
          </p>
          <h2
            id="available-now-heading"
            className="mt-2 max-w-2xl text-balance font-display text-3xl font-extrabold tracking-[-0.02em] text-foreground sm:text-4xl"
          >
            From résumé to matched and tailored.
          </h2>
        </Reveal>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {ITEMS.map((cap, i) => {
            const Icon = ICONS[cap.id] ?? Sparkles;
            return (
              <Reveal key={cap.id} delay={i * 0.05}>
                <div className="flex h-full items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--brand-to)/0.12)]">
                    <Icon className="h-4 w-4 text-[hsl(var(--brand-to))]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold text-foreground">{cap.name}</h3>
                      <StatusBadge status={cap.status} />
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                      {cap.blurb}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

export default AvailableNow;
