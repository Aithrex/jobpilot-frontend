import { type ReactNode, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Send, MessageSquare, Waypoints, Eye, GraduationCap, Users, LayoutList,
  Check, ArrowRight, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container, DemoCaption, DemoSkeleton, Eyebrow, LazyMount, Parallax, Reveal, SectionHeading } from './_shared';

// Demos are code-split and mounted only near the viewport (see LazyMount).
const SponsorFlip = lazy(() => import('./demos/SponsorFlip'));
const ApplySpeed = lazy(() => import('./demos/ApplySpeed'));
const PhoneDigest = lazy(() => import('./demos/PhoneDigest'));
const GraphAssemble = lazy(() => import('./demos/GraphAssemble'));
const GazeHeatmap = lazy(() => import('./demos/GazeHeatmap'));
const LearnToPost = lazy(() => import('./demos/LearnToPost'));
const ReferralFinder = lazy(() => import('./demos/ReferralFinder'));
const PipelineFunnel = lazy(() => import('./demos/PipelineFunnel'));

interface RowDef {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  minHeight: number;
  demo: ReactNode;
  /** One-line caption under the demo: feature name · promise. */
  caption: { feature: string; promise: string };
}

const ROWS: RowDef[] = [
  {
    icon: Search,
    eyebrow: 'Discover',
    title: 'Find roles that actually sponsor',
    body: 'Every match carries a sponsorship signal pulled from public filings — so you spend energy on jobs that can say yes, not the ones that never will.',
    points: ['Verified H-1B history per employer', 'Visa filters: cap-exempt, OPT/CPT, STEM', 'Ranked by real fit, not keywords'],
    minHeight: 300,
    demo: <SponsorFlip />,
    caption: { feature: 'Sponsorship intel', promise: 'every badge is backed by public H-1B filings, not guesses.' },
  },
  {
    icon: Send,
    eyebrow: 'Apply',
    title: 'A tailored application in 90 seconds',
    body: 'The browser extension rewrites your résumé for the role in front of you — ATS-scored, honestly diffed, and yours to approve before it ever sends.',
    points: ['Per-job tailoring: 25 min → 90 sec', 'Every edit traces back to your work', 'Auto-tracked the moment you apply'],
    minHeight: 330,
    demo: <ApplySpeed />,
    caption: { feature: '90-second apply', promise: 'tailored, ATS-scored, and reviewed by you before anything sends.' },
  },
  {
    icon: MessageSquare,
    eyebrow: 'Daily digest',
    title: 'Your morning roles, one tap to apply',
    body: 'Wake up to a short digest of roles that sponsor and fit. Approve the ones you like and they slide into a ready-to-submit tray — no dashboard required.',
    points: ['A calm daily shortlist, not a firehose', 'One-tap approve from your phone', 'Nothing sends without your yes'],
    minHeight: 470,
    demo: <PhoneDigest />,
    caption: { feature: 'WhatsApp digest', promise: 'your morning shortlist, approved with one reply.' },
  },
  {
    icon: Waypoints,
    eyebrow: 'Voice Graph',
    title: 'A résumé authored from your real work',
    body: 'Aspirely maps your projects, internships, and wins into a living graph, then writes from it. Every bullet is wired to real evidence — nothing is fabricated.',
    points: ['Your career as a connected structure', 'Claims linked to sources you can defend', 'Never invents titles, metrics, or employers'],
    minHeight: 300,
    demo: <GraphAssemble />,
    caption: { feature: 'Voice Graph', promise: 'a résumé authored from your real evidence — never invented.' },
  },
  {
    icon: Eye,
    eyebrow: "Recruiter's six seconds",
    title: 'Win the six-second scan',
    body: 'Recruiters skim in an F-pattern for about six seconds. We show you their gaze heatmap and rebuild your top third so the right things land first.',
    points: ['See what actually gets read', 'Front-load your strongest proof', 'Fixes the top third, keeps the facts'],
    minHeight: 360,
    demo: <GazeHeatmap />,
    caption: { feature: "Recruiter's six seconds", promise: 'your top third, rebuilt for the first scan.' },
  },
  {
    icon: GraduationCap,
    eyebrow: 'Learn & signal',
    title: 'Turn 2–4 gaps into public proof',
    body: 'We name the handful of gaps between you and callbacks, hand you a short plan, and turn what you ship into verified proof and a ready-to-post story.',
    points: ['Focused 7-day plans, not 40-hour courses', 'Verified GitHub proof, not claims', 'Auto-drafted posts that pull recruiters in'],
    minHeight: 220,
    demo: <LearnToPost />,
    caption: { feature: 'Your edge', promise: 'gap → 7-day plan → verified proof → a post recruiters see.' },
  },
];

function DemoMount({ minHeight, children }: { minHeight: number; children: ReactNode }) {
  return (
    <LazyMount minHeight={minHeight}>
      <Suspense fallback={<DemoSkeleton style={{ minHeight }} />}>{children}</Suspense>
    </LazyMount>
  );
}

function FeatureRow({ row, reverse }: { row: RowDef; reverse: boolean }) {
  const Icon = row.icon;
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <Reveal className={reverse ? 'lg:order-2' : ''}>
        <Eyebrow icon={Icon}>{row.eyebrow}</Eyebrow>
        <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{row.title}</h3>
        <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">{row.body}</p>
        <ul className="mt-6 space-y-2.5">
          {row.points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={0.08} className={reverse ? 'lg:order-1' : ''}>
        {/* Alternating drift depth (18px vs 26px) gives adjacent rows layered parallax. */}
        <Parallax from={reverse ? 26 : 18} to={reverse ? -26 : -18}>
          <DemoMount minHeight={row.minHeight}>{row.demo}</DemoMount>
          <DemoCaption feature={row.caption.feature}>{row.caption.promise}</DemoCaption>
        </Parallax>
      </Reveal>
    </div>
  );
}

const LOOP = [
  {
    icon: Users,
    title: 'Warm intros, found for you',
    body: 'We surface the alumni and 2nd-degree connections most likely to refer you — and draft the ask.',
    minHeight: 300,
    demo: <ReferralFinder />,
    caption: { feature: 'Referral Finder', promise: 'the warm path into each company, with the ask drafted.' },
  },
  {
    icon: LayoutList,
    title: 'Every stage, one board',
    body: 'From matched to offer, your whole search is tracked automatically — so you always know the next move.',
    minHeight: 300,
    demo: <PipelineFunnel />,
    caption: { feature: 'Pipeline', promise: 'every application tracked from matched to offer.' },
  },
];

export function FeatureJourney() {
  return (
    <section id="how-it-works" className="scroll-mt-16 py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="One calm workflow, from lost to hired"
          subtitle="Every part of the search, connected — each useful on its own, and far stronger together because it already knows you."
        />

        <div className="mt-16 space-y-20 sm:mt-20 sm:space-y-28">
          {ROWS.map((row, i) => (
            <FeatureRow key={row.title} row={row} reverse={i % 2 === 1} />
          ))}
        </div>

        {/* close the loop */}
        <Reveal className="mt-24 text-center sm:mt-28">
          <Eyebrow>And it closes the loop</Eyebrow>
        </Reveal>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {LOOP.map((item) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={0.06}>
                <div className="group card-hover flex h-full flex-col rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
                  <div className="mb-4 flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors duration-200 group-hover:bg-primary/15">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold tracking-tight text-foreground sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <DemoMount minHeight={item.minHeight}>{item.demo}</DemoMount>
                    <DemoCaption feature={item.caption.feature}>{item.caption.promise}</DemoCaption>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-16 flex justify-center">
          <Button asChild size="lg">
            <Link to="/register">
              Start your first tailored apply <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
