import { BadgeCheck, Building2, Fingerprint, ShieldCheck, Timer, type LucideIcon } from 'lucide-react';
import { Container, Reveal } from './_shared';

/**
 * Trust and privacy: the five concrete facts a careful visitor asks about,
 * stated plainly. Deliberately NO testimonials, user counts, ratings,
 * employer logos, awards, success rates, or press claims.
 */

const FACTS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Building2,
    title: 'Where jobs come from',
    body: 'Openings are read from direct employer career sites, including Workday, Greenhouse, Lever, and Ashby pages. No scraped aggregator listings.',
  },
  {
    icon: ShieldCheck,
    title: 'How sponsorship signals are sourced',
    body: 'From public filings. We surface signals so you can judge likelihood yourself. We never claim a company is a verified sponsor.',
  },
  {
    icon: BadgeCheck,
    title: 'What the AI may and may not change',
    body: 'It can reword and reorder your real experience. IntegrityGuard never invents employers, titles, dates, or skills.',
  },
  {
    icon: Timer,
    title: 'Guest data retention',
    body: 'If you do not create an account, your uploaded resume and results are deleted after 30 days.',
  },
  {
    icon: Fingerprint,
    title: 'Abuse prevention',
    body: 'We store a small first-party device token in your browser to keep the free trial fair. It never identifies you and is not shared with anyone.',
  },
];

export function TrustSection() {
  return (
    <section id="trust" aria-label="Trust and privacy" className="scroll-mt-24 border-t border-border py-16 sm:py-20">
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            Straight answers on trust and privacy
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            Where the data comes from, what the AI is allowed to do, and what happens to your resume.
          </p>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {FACTS.map(({ icon: Icon, title, body }, i) => (
            <Reveal
              key={title}
              delay={i * 0.04}
              className="rounded-2xl border border-border bg-card p-5 last:sm:col-span-2"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-control bg-primary/10 text-primary">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
