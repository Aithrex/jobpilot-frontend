import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Container, Reveal } from './_shared';
import { ProductShot } from './ProductShot';

/**
 * Authenticated-workspace preview: ONE dominant real screenshot (fictional
 * data) with restrained hotspots naming what unlocks after signup, plus a
 * plain-text list so the information never depends on hover or the image.
 * A preview, not a feature catalog.
 */

const HOTSPOTS = [
  { label: 'Application tracking', detail: 'Every application, stage, and follow-up in one pipeline.', x: 22, y: 30 },
  { label: 'Interview preparation', detail: 'Role-specific questions and practice built from the job description.', x: 62, y: 22 },
  { label: 'Learning and skill gaps', detail: 'See the skills that block matches and close them with a plan.', x: 84, y: 46 },
  { label: 'Career planning', detail: 'Plan next roles and the skills that get you there.', x: 40, y: 72 },
] as const;

const SECONDARY = ['Networking', 'Visa timeline tools where relevant'] as const;

export function WorkspacePreview() {
  return (
    <section
      id="workspace"
      aria-label="The full workspace after signup"
      className="scroll-mt-24 border-t border-border bg-card py-16 sm:py-20"
    >
      <Container>
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            From first match to offer, one workspace.
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
            Your free account keeps the guest work you started and adds application tracking,
            interview preparation, learning plans, and more, connected to the same resume.
          </p>
        </Reveal>

        <Reveal className="relative mx-auto mt-12 max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-pop">
            <ProductShot
              name="workspace-pipeline"
              alt="Aspirely's authenticated workspace showing a fictional application pipeline with applications in Applied, Interviewing, and Offer stages"
              width={1600}
              height={1139}
            />
            {/* Hotspots: desktop-only enhancement — all content is repeated in
                the visible list below, so nothing depends on hover. */}
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
            The real workspace, shown with fictional data.
          </p>
        </Reveal>

        <Reveal>
          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {[...HOTSPOTS.map((h) => h.label), ...SECONDARY].map((label) => (
              <li
                key={label}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {label}
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
