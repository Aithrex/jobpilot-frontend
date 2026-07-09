import { Quote } from 'lucide-react';
import { Container, Reveal, SectionHeading } from './_shared';

/** Illustrative social proof — placeholder copy until real testimonials land. */
const QUOTES = [
  {
    initials: 'PM',
    name: 'Priya M.',
    detail: 'MS CS · F-1 OPT',
    quote: 'I stopped applying into the void. The sponsorship filter alone saved me a month, and the tailored résumés finally got replies.',
  },
  {
    initials: 'DK',
    name: 'David K.',
    detail: 'Data Analyst · STEM OPT',
    quote: 'It told me the exact two gaps between me and callbacks. I closed them in a week and had three interviews the next.',
  },
  {
    initials: 'AR',
    name: 'Ana R.',
    detail: 'New grad · F-1',
    quote: 'What sold me was the honesty — nothing on my résumé is made up, so I could actually defend every line in interviews.',
  },
];

const STATS = [
  { value: '~90s', label: 'to a tailored application' },
  { value: '2–4', label: 'gaps between you and callbacks' },
  { value: '100%', label: 'of claims traceable to your work' },
  { value: '$0', label: 'to start — no card required' },
];

export function SocialProof() {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Social proof"
          title="Built for the students the system overlooks"
          subtitle="Early stories from the visa-clock job search — illustrative while we gather the real ones."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={i * 0.06}>
              <figure className="group card-hover flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
                <Quote className="h-5 w-5 text-primary/60 transition-colors group-hover:text-primary" aria-hidden />
                <blockquote className="mt-4 flex-1 text-pretty leading-relaxed text-foreground">{q.quote}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary"
                  >
                    {q.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{q.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{q.detail}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-card p-6 text-center transition-colors hover:bg-muted/40">
                <dt className="font-display text-3xl font-extrabold tracking-tight text-foreground">{s.value}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}
