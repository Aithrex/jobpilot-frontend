import { BadgeCheck, ShieldCheck, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Container, Reveal, RevealGroup, RevealItem } from './_shared';
import { ProductShot } from './ProductShot';

/**
 * "Why Aspirely" — the ONE editorial proof section below the interactive
 * hero, and the page's single product screenshot (the authenticated
 * workspace, fictional data). The hero already demonstrates matching and
 * tailoring live, so this section covers what the demo can't: the proof
 * points in prose and what a free account unlocks afterward. Deliberately
 * NOT a feature-card grid; no invented numbers, testimonials, or logos.
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

/** Hotspot content is repeated in the visible chip list below the image, so
 * nothing depends on hover. */
const HOTSPOTS = [
  { label: 'Application tracking', detail: 'Every application, stage, and follow-up in one pipeline.', x: 22, y: 30 },
  { label: 'Interview preparation', detail: 'Role-specific questions and practice built from the job description.', x: 62, y: 22 },
  { label: 'Learning and skill gaps', detail: 'See the skills that block matches and close them with a plan.', x: 84, y: 46 },
  { label: 'Career planning', detail: 'Plan next roles and the skills that get you there.', x: 40, y: 72 },
] as const;

const SECONDARY = ['Networking', 'Visa timeline tools where relevant'] as const;

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
            that stays true to your experience. A free account keeps that work and grows into a
            full career workspace.
          </p>
        </Reveal>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <Reveal className="order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-pop">
              <ProductShot
                name="workspace-pipeline"
                alt="Aspirely's authenticated workspace showing a fictional application pipeline with applications in Applied, Interviewing, and Offer stages"
                width={1600}
                height={1139}
              />
              {/* Hotspots: desktop-only enhancement — all content is repeated
                  in the visible chip list, so nothing depends on hover. */}
              <div className="absolute inset-0 hidden lg:block" aria-hidden="false">
                {HOTSPOTS.map(({ label, detail, x, y }) => (
                  <Tooltip key={label} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`${label}: ${detail}`}
                        className="absolute grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{ left: `${x}%`, top: `${y}%` }}
                      >
                        <span className="grid h-6 w-6 place-items-center rounded-full border border-primary/40 bg-card/95 shadow-panel transition-transform hover:scale-110">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-56">
                      <p className="font-semibold">{label}</p>
                      <p className="mt-0.5 text-xs opacity-80">{detail}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              The real workspace after signup, shown with fictional data.
            </p>
          </Reveal>

          <div className="order-1 lg:order-2">
            <RevealGroup as="ul" className="space-y-7">
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

            <Reveal>
              <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                A free account adds
              </p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {[...HOTSPOTS.map((h) => h.label), ...SECONDARY].map((label) => (
                  <li
                    key={label}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
