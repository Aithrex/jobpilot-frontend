import { type ReactNode, Suspense } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, DemoCaption, DemoSkeleton, Eyebrow, LazyMount, Reveal } from './_shared';

/**
 * The shared frame for a feature section, tuned for the light professional
 * surface: the animated demo is the dominant element (the wider column), the
 * copy column stays tight, and each section can open with a one-line PAIN
 * statement (warm mono caps) that the title then resolves. Sections alternate
 * white / near-white bands (derived from the numeric `index`) for rhythm.
 *
 * The demo is code-split AND in-view-gated (LazyMount → Suspense) so heavy
 * animation never downloads or runs off-screen, and `reserve` pins the media
 * height so mounting never shifts layout (CLS ≈ 0).
 */

export interface FeatureSectionProps {
  id: string;
  index: string;
  /** One-line pain statement, set above the eyebrow in warm mono caps. */
  pain?: string;
  eyebrow: string;
  eyebrowIcon?: LucideIcon;
  title: ReactNode;
  subtitle: ReactNode;
  /** the animated demo element */
  demo: ReactNode;
  /** reserved media height (px) — must be ≥ the demo's intrinsic height */
  reserve: number;
  /** caption under the demo */
  caption: { feature: string; promise: ReactNode };
  /** media on the left on desktop */
  flip?: boolean;
  /** centered, full-width layout for the signature section */
  prominent?: boolean;
  /** optional extra content below the demo (e.g. the Track strip) */
  children?: ReactNode;
  className?: string;
}

function Copy({
  index,
  pain,
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  center,
}: Pick<FeatureSectionProps, 'index' | 'pain' | 'eyebrow' | 'eyebrowIcon' | 'title' | 'subtitle'> & {
  center?: boolean;
}) {
  return (
    <div className={cn(center ? 'mx-auto max-w-2xl text-center' : 'max-w-md lg:max-w-sm')}>
      {pain && (
        <p
          className={cn(
            'mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-warning',
            center && 'text-center',
          )}
        >
          {pain}
        </p>
      )}
      <div className={cn('flex items-center gap-3', center && 'justify-center')}>
        <span className="font-mono text-sm font-bold tabular-nums text-primary/80">{index}</span>
        <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
      </div>
      <h2 className="mt-4 font-display text-3xl font-bold leading-[1.14] tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function Media({ reserve, caption, demo }: Pick<FeatureSectionProps, 'reserve' | 'caption' | 'demo'>) {
  return (
    <div className="relative isolate">
      {/* Faint indigo wash lifting the demo panel off the white surface */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10"
        style={{ background: 'radial-gradient(ellipse 68% 62% at 50% 45%, hsl(var(--primary) / 0.06), transparent 70%)' }}
      />
      <LazyMount minHeight={reserve}>
        <Suspense fallback={<DemoSkeleton style={{ minHeight: reserve }} />}>{demo}</Suspense>
      </LazyMount>
      <DemoCaption feature={caption.feature}>{caption.promise}</DemoCaption>
    </div>
  );
}

export function FeatureSection({
  id,
  index,
  pain,
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  demo,
  reserve,
  caption,
  flip,
  prominent,
  children,
  className,
}: FeatureSectionProps) {
  // Alternating white / near-white bands, derived from the numeric index so
  // the rhythm holds without touching the call sites.
  const n = Number.parseInt(index, 10);
  const banded = Number.isFinite(n) && n % 2 === 0;
  const band = banded && 'border-y border-border bg-muted/50';

  if (prominent) {
    return (
      <section id={id} className={cn('scroll-mt-16 py-20 sm:py-28', band, className)}>
        <Container>
          <Reveal>
            <Copy index={index} pain={pain} eyebrow={eyebrow} eyebrowIcon={eyebrowIcon} title={title} subtitle={subtitle} center />
          </Reveal>
          <Reveal delay={0.06} className="mx-auto mt-12 max-w-3xl">
            <Media reserve={reserve} caption={caption} demo={demo} />
          </Reveal>
          {children && (
            <Reveal delay={0.1} className="mx-auto mt-6 max-w-3xl">
              <Suspense fallback={<DemoSkeleton style={{ minHeight: 160 }} />}>{children}</Suspense>
            </Reveal>
          )}
        </Container>
      </section>
    );
  }

  return (
    <section id={id} className={cn('scroll-mt-16 py-16 sm:py-24', band, className)}>
      {/* The demo carries the story: it takes the wider column (3/5) on desktop,
          on whichever side `flip` puts it. */}
      <Container
        className={cn(
          'grid items-center gap-10 lg:gap-14',
          flip ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
        )}
      >
        <Reveal className={cn('order-1', flip && 'lg:order-2')}>
          <Copy index={index} pain={pain} eyebrow={eyebrow} eyebrowIcon={eyebrowIcon} title={title} subtitle={subtitle} />
        </Reveal>
        <Reveal delay={0.06} className={cn('order-2', flip && 'lg:order-1')}>
          <Media reserve={reserve} caption={caption} demo={demo} />
        </Reveal>
      </Container>
    </section>
  );
}
