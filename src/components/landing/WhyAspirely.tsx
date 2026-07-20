import { BadgeCheck, ShieldCheck, Target } from 'lucide-react';
import { Container, Reveal, RevealGroup, RevealItem } from './_shared';
import { ProductShot } from './ProductShot';

/**
 * "Why Aspirely" — ONE concise editorial section, led by real product
 * imagery (a sanitized screenshot of the actual match dashboard with
 * fictional data). Three proof points read as prose beside it; deliberately
 * NOT a three-column infographic card grid, and no invented numbers,
 * testimonials, or logos.
 */

const POINTS = [
  {
    Icon: Target,
    title: 'Real openings',
    body: 'Scanned live from Workday, Greenhouse, Lever, and Ashby career sites. No recycled feed.',
  },
  {
    Icon: BadgeCheck,
    title: 'Know why it fits',
    body: 'Matched skills, a plain reason, and sponsorship signals from public filings on every card.',
  },
  {
    Icon: ShieldCheck,
    title: 'Tailor without making things up',
    body: 'IntegrityGuard locks your employers, titles, dates, and skills. Nothing invented.',
  },
] as const;

export function WhyAspirely() {
  return (
    <section
      id="why"
      aria-label="Why Aspirely is different"
      className="scroll-mt-24 border-t border-border py-16 sm:py-20"
    >
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            Not another endless job feed.
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            A small number of jobs worth considering, each one explained, and a tailored resume
            that stays true to your experience.
          </p>
        </Reveal>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-12">
          <Reveal className="order-2 lg:order-1">
            <div className="relative pb-14 pr-4 sm:pr-10">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-pop">
                <ProductShot
                  name="match-dashboard"
                  alt="Aspirely's match dashboard showing five matched jobs for a fictional candidate, each with an estimated match score, matched skills, the reason it fits, and a sponsorship signal from public filings"
                  width={1400}
                  height={798}
                />
              </div>
              {/* Inset: the finished tailor, original beside tailored. */}
              <div className="absolute bottom-0 right-0 w-[46%] max-w-[290px] overflow-hidden rounded-xl border border-border bg-card shadow-float">
                <ProductShot
                  name="tailored-compare"
                  alt="A tailored resume preview beside the original for a fictional candidate, with an IntegrityGuard badge confirming nothing was invented and PDF and DOCX download buttons"
                  width={1000}
                  height={966}
                />
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              The real match dashboard and tailored result, shown with fictional data.
            </p>
          </Reveal>

          <RevealGroup as="ul" className="order-1 space-y-7 lg:order-2">
            {POINTS.map(({ Icon, title, body }) => (
              <RevealItem as="li" key={title} className="flex items-start gap-4">
                <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </Container>
    </section>
  );
}
