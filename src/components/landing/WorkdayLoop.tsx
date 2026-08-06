import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, GraduationCap, Pause, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AUTO_APPLY, STATUS_LABEL } from '@/lib/capabilities';
import { BLOCK_GAP, Container, HEAD_GAP, Reveal, Section, SectionHead } from './_shared';
import { useIsWide } from './useIsWide';

/**
 * THE WORKDAY LOOP - one system, one working day.
 *
 * WHAT THIS MERGED. The landing used to explain itself twice. "How it works"
 * gave three numbered steps (set direction / Aspirely finds and prepares / you
 * review and move forward) and "A day with Aspirely" gave three chapters of a
 * day (I found / I prepared / I need from you). They were the same story told
 * at two levels of abstraction, in two visual languages, three sections apart -
 * so a reader met the product's core loop, scrolled past a capability section,
 * and then met it again. Neither was wrong; together they were repetition, and
 * repetition on a landing page reads as padding.
 *
 * One section now answers both questions at once: HOW it works is the left
 * column, WHAT IT FEELS LIKE is the frame on the right, and they advance
 * together.
 *
 * WHY THE LEFT COLUMN SHOWS ALL THREE CHAPTERS AT ONCE. The previous version
 * of this idea crossfaded a single copy block, which meant that at any moment
 * the reader could see one third of the argument and had to trust that the
 * rest existed. Listing all three - active one at full strength, the others
 * dimmed but still legible - means the whole story is always on screen, and
 * the emphasis is what moves. It also doubles as the progress affordance a
 * pinned section needs: you can see which chapter you are in and how many are
 * left, without a separate stepper.
 *
 * WHAT IS IN THE FRAME. Abstract product surfaces - our own UI labels
 * ("Target roles", "Ready for your approval") over bar-and-pill placeholders.
 * The labels are chrome we would really ship; the VALUES are never faked.
 * There are no company names, no job titles, no match percentages, no counts
 * and no success claims anywhere in here, which is also what the landing
 * suite sweeps the whole document for.
 *
 * NO SCROLL IS CONSUMED. An earlier version of this ran on a 250vh spacer
 * track with a pinned viewport, which is the pattern that makes a page feel
 * like it has stopped: of 2250px of track, only ~840px was ever on screen, so
 * roughly 1400px of scrolling advanced nothing but an animation. The section
 * alone was 35% of the page's scroll height.
 *
 * It is a STICKY SIDEBAR now, which is the ordinary way this is done: the
 * story column scrolls at its natural height, and the preview frame sticks
 * beside it while you read. The section is exactly as tall as its content, so
 * every pixel of scroll moves the page forward. Which preview is showing comes
 * from an IntersectionObserver on the chapters (`useInView`) rather than from
 * scroll offsets - cheaper, and it cannot desynchronise from what is on screen.
 *
 * MODES. Cinematic (>=1024px, motion allowed) uses the sticky sidebar.
 * Narrative (below that, or reduced motion) renders each chapter followed by
 * its own preview in normal reading order. Same DOM either way - three
 * headings, three bodies, three previews - so nothing is hidden behind
 * animation and nothing is announced twice.
 */

interface Chapter {
  id: string;
  time: string;
  heading: string;
  body: string;
}

const CHAPTERS: Chapter[] = [
  {
    id: 'direction',
    time: 'Set direction',
    heading: 'Start with the work only you can do.',
    body: 'Tell Aspirely what roles, locations, and work preferences matter. Your resume gives it a grounded view of your experience.',
  },
  {
    id: 'works',
    time: 'While you are away / Aspirely works',
    heading: 'It finds the signal and prepares the work.',
    body: 'Aspirely brings forward relevant opportunities, prepares tailored materials, and keeps your search organized without turning it into another feed to manage.',
  },
  {
    id: 'judgment',
    time: 'When you return / Your judgment',
    heading: 'You stay in control of every important move.',
    body: 'Review what is ready, approve what should move forward, and tell Aspirely what needs to change. Nothing is submitted without your permission.',
  },
];

/* ── Abstract preview primitives ──────────────────────────────────────── */

/** A value placeholder. Never text, so it can never read as real user data. */
function Bar({ w, className }: { w: string; className?: string }) {
  return (
    <span
      className={cn('block h-2 rounded-full bg-foreground/[0.16]', className)}
      style={{ width: w }}
    />
  );
}

function Pill({ w, tone }: { w: string; tone?: 'primary' | 'success' }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full border px-2',
        tone === 'primary' && 'border-primary/30 bg-nav-active',
        tone === 'success' && 'border-success/30 bg-success/10',
        !tone && 'border-border bg-muted',
      )}
    >
      <span
        className={cn(
          'block h-1.5 rounded-full',
          tone === 'primary'
            ? 'bg-primary/60'
            : tone === 'success'
              ? 'bg-success/60'
              : 'bg-foreground/15',
        )}
        style={{ width: w }}
      />
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 py-3 last:border-0">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">{children}</span>
    </div>
  );
}

/** The frame every preview sits in. One product surface, not a card grid. */
function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-container border border-border bg-card shadow-float">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="h-2 w-2 rounded-full bg-primary/60" aria-hidden />
        <span className="text-[12px] font-semibold tracking-tight text-foreground">{title}</span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/* ── The three states ─────────────────────────────────────────────────── */

function PreviewDirection() {
  return (
    <Frame title="Your search profile">
      <div className="space-y-1">
        <Row label="Target roles">
          <Pill w="34px" tone="primary" />
          <Pill w="26px" tone="primary" />
          <Pill w="30px" />
        </Row>
        <Row label="Locations">
          <Pill w="28px" />
          <Pill w="38px" />
        </Row>
        <Row label="Work preference">
          <Pill w="30px" tone="primary" />
        </Row>
        <Row label="Work authorization">
          <Pill w="42px" />
        </Row>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-container border border-border bg-muted/60 p-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card">
          <Check className="h-4 w-4 text-success" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[12px] font-semibold text-foreground">Resume read</p>
          <Bar w="62%" />
        </div>
      </div>
    </Frame>
  );
}

function PreviewPrepare() {
  return (
    <Frame title="Prepared while you were away">
      <div className="space-y-2.5">
        <div className="rounded-container border border-primary/30 bg-nav-active/60 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <Bar w="46%" className="bg-primary/40" />
            <Pill w="24px" tone="primary" />
          </div>
          <div className="mt-2.5 space-y-1.5">
            <Bar w="72%" />
            <Bar w="54%" />
          </div>
        </div>
        <div className="rounded-container border border-border p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Why it fits
          </p>
          <div className="mt-2.5 space-y-1.5">
            <Bar w="84%" />
            <Bar w="66%" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-container border border-success/30 bg-success/8 p-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-card">
          <Check className="h-4 w-4 text-success" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-foreground">Tailored resume prepared</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Yours to review and change.</p>
        </div>
      </div>
    </Frame>
  );
}

function PreviewDecide() {
  return (
    <Frame title="Ready for your approval">
      <div className="rounded-container border border-border p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[12px] font-semibold text-foreground">Aspirely prepared</p>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {STATUS_LABEL[AUTO_APPLY.status]}
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {['62%', '48%'].map((w) => (
            <li key={w} className="flex items-center gap-2.5">
              <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              <Bar w={w} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-container border border-warning/35 bg-warning/8 p-4">
        <p className="text-[12px] font-semibold text-foreground">Needs your decision</p>
        <div className="mt-2.5">
          <Bar w="70%" />
        </div>
        {/* Inert on purpose: a picture of a control, captioned as one. */}
        <div aria-hidden className="mt-4 flex items-center gap-2">
          <span className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[12px] font-semibold text-primary-foreground opacity-70">
            Approve
          </span>
          <span className="inline-flex h-9 items-center rounded-full border border-border px-4 text-[12px] font-medium text-muted-foreground opacity-70">
            Not this one
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Pause className="h-3.5 w-3.5" aria-hidden />
        Pause anytime. Nothing is submitted without your permission.
      </div>
    </Frame>
  );
}

const PREVIEWS = [PreviewDirection, PreviewPrepare, PreviewDecide];

/* ── Cinematic ────────────────────────────────────────────────────────── */

/**
 * One chapter in the story column. Reports itself as active when it crosses
 * the middle band of the viewport, which is what drives the preview beside it.
 *
 * The band is deliberately narrow (-40% top and bottom, so the middle 20% of
 * the screen) and the chapters are spaced further apart than that, so at most
 * one is ever "the one you are reading". When none is in the band - mid-gap -
 * the last one simply stays, which is the correct behaviour: the preview
 * should not blank out between paragraphs.
 */
function ChapterRow({
  chapter,
  index,
  active,
  onEnter,
}: {
  chapter: Chapter;
  index: number;
  active: boolean;
  onEnter: (index: number) => void;
}) {
  const ref = useRef<HTMLLIElement | null>(null);
  const inView = useInView(ref, { margin: '-40% 0px -40% 0px' });

  useEffect(() => {
    if (inView) onEnter(index);
  }, [inView, index, onEnter]);

  return (
    <li ref={ref} className="relative">
      {/* Emphasis is a PANEL and a MARKER, never reduced text opacity: the
          inactive chapters are real body copy, and fading them would push them
          under AA on a bright canvas. All three stay fully readable. */}
      <motion.span
        aria-hidden
        className="absolute -inset-x-5 -inset-y-4 rounded-container bg-nav-active/55"
        initial={false}
        animate={{ opacity: active ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.span
        aria-hidden
        className="absolute left-0 top-[9px] block h-2 w-2 rounded-full bg-primary"
        initial={false}
        animate={{ scale: active ? 1.5 : 1, opacity: active ? 1 : 0.3 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      />
      <div className="relative pl-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {chapter.time}
        </p>
        <h3 className="mt-2.5 text-balance font-display text-xl font-bold leading-[1.22] tracking-[-0.018em] text-foreground sm:text-[1.4rem]">
          {chapter.heading}
        </h3>
        <p className="mt-2 max-w-md text-pretty text-[14px] leading-relaxed text-muted-foreground">
          {chapter.body}
        </p>
      </div>
    </li>
  );
}

function CinematicLoop() {
  const [active, setActive] = useState(0);
  const Preview = PREVIEWS[active];

  return (
    <Container className={HEAD_GAP}>
      {/* No `items-start` here, deliberately. A sticky element can only travel
          inside its own containing block, so if the preview column shrink-wraps
          to the frame's height it unsticks almost immediately and scrolls away
          while you are still reading chapter three. Default `stretch` makes the
          column as tall as the story beside it, which is the travel room. */}
      <div className="grid grid-cols-12 gap-12">
        {/* Spacing is what keeps one chapter in the reading band at a time.
            It is real content spacing, not padding invented to buy scroll. */}
        <ol className="col-span-5 space-y-28 py-10">
          {CHAPTERS.map((c, i) => (
            <ChapterRow
              key={c.id}
              chapter={c}
              index={i}
              active={active === i}
              onEnter={setActive}
            />
          ))}
        </ol>

        <div className="col-span-7">
          {/* Sticks beside the story for exactly as long as the story lasts,
              then releases with the section. It adds no height of its own. */}
          <div className="sticky top-24">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-container"
            >
              <Preview />
              {/* One cherry highlight passing through as the scene lands. It
                  replays on change because the element is keyed, and it never
                  loops - decoration that repeats stops being a transition. */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/3"
                initial={{ x: '-160%' }}
                animate={{ x: '340%' }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background:
                    'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.12), transparent)',
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </Container>
  );
}

/* ── Narrative ────────────────────────────────────────────────────────── */

function NarrativeLoop() {
  return (
    <Container className={HEAD_GAP}>
      <ol className="space-y-14">
        {CHAPTERS.map((c, i) => {
          const Preview = PREVIEWS[i];
          return (
            <li key={c.id}>
              <Reveal>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {c.time}
                </p>
                <h3 className="mt-2.5 text-balance font-display text-xl font-bold leading-[1.22] tracking-[-0.018em] text-foreground">
                  {c.heading}
                </h3>
                <p className="mt-2 max-w-xl text-pretty text-[14px] leading-relaxed text-muted-foreground">
                  {c.body}
                </p>
                <div className="mt-6 max-w-xl">
                  <Preview />
                </div>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </Container>
  );
}

/* ── The coda ─────────────────────────────────────────────────────────── */

/**
 * The loop closing.
 *
 * WHY THIS EXISTS. The three chapters above tell the APPLYING half of
 * Aspirely, and on their own they let a reader conclude the product is a
 * better auto-apply. It is not: the same platform carries interview
 * preparation, the skill gaps your own applications reveal, and a weekly read
 * on what to change. Without this beat the page under-sells the thing that
 * makes it a career system rather than a submission tool.
 *
 * It is deliberately STATIC and outside the pinned track. A fourth pinned
 * scene would have stretched "one working day" past what the name claims;
 * a quiet close says "and this repeats, and you get better" without
 * pretending it happens before dinner.
 *
 * EVERY LINE HERE IS BACKED. Interview prep is generated per tailoring record
 * (`/app/grow/interview`), gaps come from `DashboardOverview.skills.top_gaps`,
 * and the weekly read is `getWeeklyDigest`. No outcome claims, no numbers, and
 * nothing about getting hired - the product helps you run a better search, and
 * that is the whole of what this says.
 */
const COMPOUND = [
  {
    icon: Target,
    title: 'Interview preparation',
    body: 'Built against the roles you actually tailored for, rather than a generic question bank.',
  },
  {
    icon: GraduationCap,
    title: 'The gaps your applications reveal',
    body: 'Skills that keep appearing in roles you want become a focused place to improve.',
  },
  {
    icon: TrendingUp,
    title: 'A weekly read',
    body: 'What moved, what stalled, and one thing worth changing in the week ahead.',
  },
];

function CompoundCoda() {
  return (
    <Container className={BLOCK_GAP}>
      <Reveal>
        <div className="rounded-container border border-border bg-card p-7 shadow-panel sm:p-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Then it repeats
          </p>
          <h3 className="mt-3 max-w-2xl text-balance font-display text-2xl font-bold leading-[1.2] tracking-[-0.02em] text-foreground">
            And the next day starts stronger.
          </h3>
          <p className="mt-3 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
            Applying is half of a job search. What you apply to shows where you are strong and where
            you are thin, and Aspirely keeps the preparation in the same place as the search.
          </p>

          {/* One surface, divided - not three cards competing for weight. */}
          <ul className="mt-8 grid gap-px overflow-hidden rounded-container bg-border sm:grid-cols-3">
            {COMPOUND.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="bg-card p-5">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                  <p className="mt-3 text-[13px] font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>
    </Container>
  );
}

/* ── Section ──────────────────────────────────────────────────────────── */

export function WorkdayLoop({ className }: { className?: string }) {
  const reduced = !!useReducedMotion();
  const wide = useIsWide();
  const cinematic = wide && !reduced;

  return (
    // Keeps `how-it-works`, so the header's "How it works" link and the
    // scroll-spy both keep working with no nav change. The merged-away
    // `daily-briefing` anchor was never in the nav.
    <Section id="how-it-works" labelledBy="how-it-works-heading" className={className}>
      <Container>
        <SectionHead
          eyebrow="One system, one working day"
          titleId="how-it-works-heading"
          title={<>A job search with a system behind it.</>}
          lede="Set your direction once. Aspirely finds the signal, prepares the work, and returns only when your judgment matters."
        />
        {/* The honesty caption for the whole section, in BOTH modes. The frames
            below carry our real UI chrome over placeholder values, including a
            picture of an approval control - so the section has to say what it
            is once, up front, where it cannot be scrolled past. */}
        <p className="mt-4 text-[12px] text-muted-foreground">
          An example of the Aspirely workflow. The layouts are ours; the values shown are
          placeholders, not real results.
        </p>
      </Container>

      {cinematic ? <CinematicLoop /> : <NarrativeLoop />}

      <CompoundCoda />
    </Section>
  );
}
