import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, FileCheck2, Gauge, HeartHandshake } from 'lucide-react';
import { Container, EASE } from './_shared';

/** Honest assurances instead of borrowed logos — trust without fake endorsements. */
const ASSURANCES = [
  { icon: ShieldCheck, label: 'Sponsorship-honest matching' },
  { icon: FileCheck2, label: 'Every claim traces to your work' },
  { icon: Gauge, label: 'From role to applied in ~90s' },
  { icon: HeartHandshake, label: 'A genuinely useful free tier' },
];

export function TrustStrip() {
  const reduce = useReducedMotion();
  return (
    <section className="border-y border-border bg-muted/30">
      <Container className="py-6">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
          {ASSURANCES.map(({ icon: Icon, label }, i) => (
            <motion.li
              key={label}
              className="group flex items-center gap-2.5 text-sm text-muted-foreground"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, ease: EASE, delay: i * 0.05 }}
            >
              <Icon
                className="h-4 w-4 shrink-0 text-primary motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-110"
                aria-hidden
              />
              <span className="font-medium text-foreground/90 transition-colors duration-200 group-hover:text-foreground">
                {label}
              </span>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
