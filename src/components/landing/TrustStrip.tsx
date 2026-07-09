import { ShieldCheck, FileCheck2, Gauge, HeartHandshake } from 'lucide-react';
import { Container, Reveal } from './_shared';

/** Honest assurances instead of borrowed logos — trust without fake endorsements. */
const ASSURANCES = [
  { icon: ShieldCheck, label: 'Sponsorship-honest matching' },
  { icon: FileCheck2, label: 'Every claim traces to your work' },
  { icon: Gauge, label: 'From role to applied in ~90s' },
  { icon: HeartHandshake, label: 'A genuinely useful free tier' },
];

export function TrustStrip() {
  return (
    <section className="border-y border-border bg-muted/30">
      <Container className="py-6">
        <Reveal>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
            {ASSURANCES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="font-medium text-foreground/90">{label}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
