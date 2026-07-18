import { type ReactNode } from 'react';
import { ArrowDown, ArrowRight, ShieldAlert, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, MonoChip, Reveal } from './_shared';

/**
 * Vision & Mission as a compact visual statement on the light surface: a
 * pain card resolving into an answer card, joined by an arrow, so the whole
 * thesis is scannable in one glance. One short line per pillar, no paragraph.
 * Static and calm; the only motion is the shared Reveal entrance (which is
 * already reduced-motion gated).
 */

function Pillar({
  chip,
  icon: Icon,
  tone,
  children,
}: {
  chip: string;
  icon: LucideIcon;
  tone: 'pain' | 'answer';
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-container border border-border bg-card p-6 shadow-soft sm:p-7">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
            tone === 'pain' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <MonoChip>{chip}</MonoChip>
      </div>
      <p className="mt-4 text-balance font-display text-xl font-bold leading-[1.3] tracking-tight text-foreground sm:text-2xl">
        {children}
      </p>
    </div>
  );
}

export function VisionMission() {
  return (
    <section aria-label="Vision and mission" className="border-y border-border bg-muted/50 py-16 sm:py-20">
      <Container>
        <Reveal>
          <div className="mx-auto grid max-w-5xl items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            <Pillar chip="The problem" icon={ShieldAlert} tone="pain">
              The search is drowning in fabricated resumes, ghost jobs, and scams.
            </Pillar>

            {/* The resolution arrow — down on mobile, across on desktop */}
            <div aria-hidden className="flex items-center justify-center text-muted-foreground">
              <ArrowDown className="h-5 w-5 lg:hidden" />
              <ArrowRight className="hidden h-5 w-5 lg:block" />
            </div>

            <Pillar chip="Our answer" icon={ShieldCheck} tone="answer">
              Five vetted matches each morning, every apply approved by you, and{' '}
              <span className="text-primary">proof employers can verify</span>.
            </Pillar>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
