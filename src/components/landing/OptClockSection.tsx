import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, DemoCaption, DemoSkeleton, Eyebrow, LazyMount, Parallax, Reveal } from './_shared';

const OptClockTicking = lazy(() => import('./demos/OptClockTicking'));

/** The OPT-clock beat: name the fear, then hand over a plan. Warm, never alarming
 *  — the animated clock carries the amber accent (deliberately not destructive red). */
export function OptClockSection() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Eyebrow icon={Heart}>For F-1 students</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-bold leading-[1.12] tracking-tight text-foreground sm:text-4xl">
            The clock is real. The panic doesn&apos;t have to be.
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Ninety days of unemployment on OPT is a lot to carry alone. Aspirely turns that countdown into a daily plan
            you can actually follow — the right roles, the honest résumé, the gaps to close first — so every day moves
            you closer instead of deeper into worry.
          </p>
          <ul className="mt-6 space-y-2.5">
            {['Key visa dates, tracked for you', 'A prioritized plan for each day', 'STEM extension math, handled'].map(
              (line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Heart className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                  {line}
                </li>
              ),
            )}
          </ul>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/register">
                Build my plan <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="mx-auto w-full max-w-sm lg:max-w-none">
          <Parallax from={20} to={-20}>
            <LazyMount minHeight={440}>
              <Suspense fallback={<DemoSkeleton style={{ minHeight: 440 }} />}>
                <OptClockTicking />
              </Suspense>
            </LazyMount>
            <DemoCaption feature="OPT Clock">your 90 unemployment days and the STEM path, tracked daily.</DemoCaption>
          </Parallax>
        </Reveal>
      </Container>
    </section>
  );
}
