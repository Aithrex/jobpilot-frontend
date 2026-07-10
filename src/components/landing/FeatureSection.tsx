import { type ReactNode, Suspense } from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, DemoCaption, DemoSkeleton, Eyebrow, LazyMount, Reveal } from './_shared';

/**
 * The shared frame for a feature section. Copy on one side, the animated demo
 * on the other (alternating), or a centered "prominent" layout for the
 * showpiece. The demo is code-split AND in-view-gated (LazyMount → Suspense) so
 * heavy animation never downloads or runs off-screen, and `reserve` pins the
 * media height so mounting never shifts layout (CLS ≈ 0).
 */

export interface FeatureSectionProps {
  id: string;
  index: string;
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
  eyebrow,
  eyebrowIcon,
  title,
  subtitle,
  center,
}: Pick<FeatureSectionProps, 'index' | 'eyebrow' | 'eyebrowIcon' | 'title' | 'subtitle'> & { center?: boolean }) {
  return (
    <div className={cn(center ? 'mx-auto max-w-2xl text-center' : 'max-w-md')}>
      <div className={cn('flex items-center gap-3', center && 'justify-center')}>
        <span className="font-display text-sm font-bold tabular-nums text-primary/70">{index}</span>
        <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
      </div>
      <h2 className="mt-4 font-display text-3xl font-bold leading-[1.14] tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">{subtitle}</p>
    </div>
  );
}

function Media({ reserve, caption, demo }: Pick<FeatureSectionProps, 'reserve' | 'caption' | 'demo'>) {
  return (
    <div>
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
  if (prominent) {
    return (
      <section id={id} className={cn('scroll-mt-16 py-20 sm:py-28', className)}>
        <Container>
          <Reveal>
            <Copy index={index} eyebrow={eyebrow} eyebrowIcon={eyebrowIcon} title={title} subtitle={subtitle} center />
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
    <section id={id} className={cn('scroll-mt-16 py-16 sm:py-24', className)}>
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className={cn('order-1', flip && 'lg:order-2')}>
          <Copy index={index} eyebrow={eyebrow} eyebrowIcon={eyebrowIcon} title={title} subtitle={subtitle} />
        </Reveal>
        <Reveal delay={0.06} className={cn('order-2', flip && 'lg:order-1')}>
          <Media reserve={reserve} caption={caption} demo={demo} />
        </Reveal>
      </Container>
    </section>
  );
}
