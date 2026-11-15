import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  animate,
  motion,
  useDragControls,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import { ArrowLeft, ArrowRight, ArrowUpRight, GripHorizontal, Layers, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Container, Mark, SampleTag, Section } from './_shared';
import { RESUME_HEADER, RESUME_LINES, SAMPLE_ROLES } from './sample';
import { Monogram } from './scenes/parts';

/**
 * "Features": the parts of the product the tour does not reach, as a deck of
 * five cards a visitor handles.
 *
 * The section was a grid of five tiles with a paragraph under each, and it
 * read as clutter: five small pictures competing, five captions to get
 * through. It is ONE card at a time now, large, with the others stacked
 * behind it in depth. The front card leans toward the pointer, can be thrown
 * aside by its top edge to bring the next one forward, and each card holds
 * one thing to do with your hands:
 *
 *   - drag a number up and feel it snap back to what the resume says;
 *   - fold a role's reposts into the employer's original;
 *   - flip an interview card to see what it was built from;
 *   - press a skill to see which roles keep asking for it;
 *   - turn the resume over to see what the AI model is actually sent.
 *
 * The list beside the deck is a real tablist, so everything the pointer can
 * do the keyboard can do, and only the front card is exposed to assistive
 * tech. With reduced motion nothing leans, springs or throws: the cards
 * simply swap.
 *
 * Each claim is something the product does today:
 *  - generated resumes are checked against the original (IntegrityGuard);
 *  - reposts fold into the employer's own listing, aggregator reposts are
 *    excluded;
 *  - interview preparation and skill gaps are live under Grow;
 *  - contact details are masked before text is sent to the model.
 */

const SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

/** Plays `fn` once, the first time the element is really on screen. */
function useOnceInView(fn: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const done = useRef(false);
  useEffect(() => {
    if (!enabled || !inView || done.current) return;
    done.current = true;
    const id = window.setTimeout(fn, 700);
    return () => window.clearTimeout(id);
    // `fn` is intentionally not a dependency: it must fire once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, enabled]);
  return ref;
}

/* ── 1. The guard ─────────────────────────────────────────────────────── */

const TEAM_MIN = 12;
const TEAM_MAX = 40;
const KNOB = 28;

const TAPS = [
  { slot: 'title', label: 'Promote the title', real: RESUME_HEADER.title, fake: 'Senior Analyst' },
  { slot: 'dates', label: 'Stretch the dates', real: 'Jun 2025', fake: 'Jan 2024' },
] as const;

function GuardScene() {
  const reduce = useReducedMotion() ?? false;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const [team, setTeam] = useState(TEAM_MIN);
  /** A title or date being pushed, by its button. */
  const [tap, setTap] = useState<(typeof TAPS)[number] | null>(null);
  const [status, setStatus] = useState<{ kind: 'idle' | 'trying' | 'held'; what: string }>({
    kind: 'idle',
    what: '',
  });
  const [held, setHeld] = useState(0);

  const span = () => Math.max(0, (trackRef.current?.offsetWidth ?? 0) - KNOB);

  // The knob's position IS the number: drag it and the resume line follows.
  useMotionValueEvent(x, 'change', (v) => {
    const w = span();
    if (w <= 0) return;
    const next = Math.round(TEAM_MIN + (Math.min(Math.max(v, 0), w) / w) * (TEAM_MAX - TEAM_MIN));
    setTeam(next);
  });

  const hold = (what: string) => {
    setStatus({ kind: 'held', what });
    setHeld((n) => n + 1);
  };

  /** Let go and it comes back, with the small overshoot of something sprung. */
  const release = () => {
    if (team === TEAM_MIN) return;
    hold(`a team of ${TEAM_MIN}`);
    if (reduce || span() <= 0) {
      x.set(0);
      setTeam(TEAM_MIN);
      return;
    }
    void animate(x, 0, { type: 'spring', stiffness: 420, damping: 17 }).then(() =>
      setTeam(TEAM_MIN),
    );
  };

  const nudge = (delta: number) => {
    const next = Math.min(TEAM_MAX, Math.max(TEAM_MIN, team + delta));
    setTeam(next);
    const w = span();
    if (w > 0) x.set(((next - TEAM_MIN) / (TEAM_MAX - TEAM_MIN)) * w);
    if (next > TEAM_MIN) setStatus({ kind: 'trying', what: `a team of ${next}` });
  };

  const onKnobKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nudge(4);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nudge(-4);
    else if (e.key === 'End') nudge(TEAM_MAX);
    else return;
    e.preventDefault();
  };

  // A tapped title or date shows the invention for a beat, then gives it back.
  useEffect(() => {
    if (!tap) return;
    setStatus({ kind: 'trying', what: tap.fake });
    const id = window.setTimeout(
      () => {
        hold(tap.real);
        setTap(null);
      },
      reduce ? 0 : 1100,
    );
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tap, reduce]);

  const stretched = team > TEAM_MIN;
  const slot = (name: 'title' | 'dates', real: string) =>
    tap?.slot === name ? (
      <motion.span
        key="fake"
        initial={reduce ? false : { rotateX: -80, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        className="inline-block rounded bg-destructive/10 px-1 font-semibold text-destructive"
      >
        {tap.fake}
      </motion.span>
    ) : status.kind === 'held' && status.what === real ? (
      <Mark>{real}</Mark>
    ) : (
      real
    );

  return (
    <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:gap-9">
      <div className="pub-sheet p-5 sm:p-6" data-guard-sheet>
        <p className="text-[1.0625rem] font-semibold text-foreground">
          {slot('title', RESUME_HEADER.title)}
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
          {RESUME_HEADER.employer} · {slot('dates', 'Jun 2025')} to Aug 2025
        </p>
        <p className="mt-4 flex gap-3 text-[1rem] leading-relaxed text-foreground">
          <span
            aria-hidden
            className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--ink-subtle))]"
          />
          <span>
            Built weekly sales reports in Tableau for a team of{' '}
            <span
              className={cn(
                'inline-block min-w-[1.6em] rounded px-1 text-center font-bold tabular-nums transition-colors duration-150',
                stretched
                  ? 'bg-destructive/10 text-destructive'
                  : status.kind === 'held' && status.what.startsWith('a team')
                    ? 'bg-[hsl(var(--mark))] text-[hsl(var(--mark-ink))]'
                    : 'text-foreground',
              )}
            >
              {team}
            </span>
            .
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <p className="flex items-baseline justify-between text-[0.8125rem] font-semibold text-foreground">
            Drag to exaggerate the team size
            <span className="font-medium tabular-nums text-muted-foreground">
              {TEAM_MIN} to {TEAM_MAX}
            </span>
          </p>
          <div
            ref={trackRef}
            className="relative mt-3 h-7 rounded-full bg-[hsl(var(--band-strong))]"
          >
            <motion.div
              role="slider"
              tabIndex={0}
              aria-label="Team size on the resume"
              aria-valuemin={TEAM_MIN}
              aria-valuemax={TEAM_MAX}
              aria-valuenow={team}
              aria-valuetext={`a team of ${team}`}
              drag={reduce ? false : 'x'}
              dragConstraints={trackRef}
              dragElastic={0.08}
              dragMomentum={false}
              style={{ x, width: KNOB, height: KNOB }}
              whileDrag={{ scale: 1.18 }}
              whileHover={{ scale: 1.08 }}
              onDragStart={() => setStatus({ kind: 'trying', what: 'a bigger team' })}
              onDragEnd={release}
              onKeyDown={onKnobKey}
              onKeyUp={release}
              onBlur={release}
              className="focus-ring-visible absolute left-0 top-0 grid cursor-grab touch-none place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_14px_-2px_hsl(var(--primary)/0.6)] active:cursor-grabbing"
            >
              <GripHorizontal aria-hidden className="h-3.5 w-3.5" />
            </motion.div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TAPS.map((t) => (
            <button
              key={t.slot}
              type="button"
              onClick={() => setTap(t)}
              className="focus-ring-visible pub-mini-btn"
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="min-h-[3rem] text-[0.875rem] leading-relaxed text-ink-muted" aria-live="polite">
          {status.kind === 'idle' && 'Go on. Try to make it lie.'}
          {status.kind === 'trying' && (
            <>
              Trying to write <span className="font-semibold text-foreground">{status.what}</span>
            </>
          )}
          {status.kind === 'held' && (
            <span className="flex gap-2">
              <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="font-semibold text-foreground">Held back.</span> Your resume says{' '}
                {status.what}. Attempts held back: {held}.
              </span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ── 2. Reposts fold ──────────────────────────────────────────────────── */

const REPOSTS = [
  { id: 'a', source: 'Job board repost', when: '9 days ago' },
  { id: 'b', source: 'Job board repost', when: '6 days ago' },
] as const;

function DedupeScene() {
  const reduce = useReducedMotion() ?? false;
  const [folded, setFolded] = useState(reduce);
  const ref = useOnceInView(() => setFolded(true), !reduce);
  const role = SAMPLE_ROLES[0];
  const step = 76;

  const card = (source: string, when: string, original: boolean) => (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-[0_8px_22px_-14px_hsl(var(--foreground)/0.5)]',
        original ? 'border-primary/50' : 'border-border',
      )}
    >
      <Monogram role={role} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold text-foreground">{role.title}</p>
        <p className="flex items-center gap-1 truncate text-[0.8125rem] text-muted-foreground">
          {original && <ArrowUpRight aria-hidden className="h-3.5 w-3.5 shrink-0" />}
          {source} · {when}
        </p>
      </div>
      {original && folded && (
        <span className="pub-tint flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[0.75rem] font-bold">
          <Layers aria-hidden className="h-3.5 w-3.5" />+{REPOSTS.length}
        </span>
      )}
    </div>
  );

  return (
    <div
      ref={ref}
      className="grid h-full gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-9"
    >
      {/* Three listings of one job. Folded, the two reposts sit behind the
          employer's original, in depth. */}
      <div
        className="relative mx-auto w-full max-w-md [perspective:900px]"
        style={{ height: step * 2 + 70 }}
      >
        {REPOSTS.map((r, i) => (
          <motion.div
            key={r.id}
            className="absolute inset-x-0 top-0"
            initial={false}
            animate={
              folded
                ? { y: step - (2 - i) * 9, scale: 0.9 + i * 0.04, opacity: 0.55, rotateX: 8 }
                : { y: i * step, scale: 1, opacity: 1, rotateX: 0 }
            }
            transition={reduce ? { duration: 0 } : { ...SPRING, delay: folded ? i * 0.05 : 0 }}
            style={{ zIndex: i }}
          >
            {card(r.source, r.when, false)}
          </motion.div>
        ))}
        <motion.div
          className="absolute inset-x-0 top-0"
          initial={false}
          animate={{ y: folded ? step : step * 2 }}
          transition={reduce ? { duration: 0 } : SPRING}
          style={{ zIndex: 3 }}
        >
          {card("Employer's careers page", role.posted, true)}
        </motion.div>
      </div>

      <div className="flex flex-col items-start gap-4">
        <button
          type="button"
          aria-pressed={folded}
          onClick={() => setFolded((f) => !f)}
          className="focus-ring-visible pub-mini-btn pub-mini-btn-solid"
        >
          {folded ? 'Show the reposts' : 'Fold the reposts'}
        </button>
        <p className="min-h-[2.75rem] text-[0.875rem] leading-relaxed text-ink-muted" aria-live="polite">
          {folded
            ? `${REPOSTS.length} reposts folded into the original. You see the role once, with its real date.`
            : 'The same job, listed three times with three different dates.'}
        </p>
      </div>
    </div>
  );
}

/* ── 3. Interview preparation ─────────────────────────────────────────── */

const QUESTIONS = [
  {
    roleId: 'harbor',
    q: 'Walk me through a SQL query you wrote to join messy data.',
    ask: 'SQL',
    lineId: 'sql',
  },
  {
    roleId: 'lumen',
    q: 'How did you decide the checkout test had actually worked?',
    ask: 'Experiment analysis',
    lineId: 'abtest',
  },
  {
    roleId: 'parallel',
    q: 'Tell me about a finding you had to explain to a non-technical manager.',
    ask: 'Reporting',
    lineId: 'present',
  },
] as const;

function lineText(id: string): string {
  const line = RESUME_LINES.find((l) => l.id === id);
  return (line?.text ?? []).map((seg) => (typeof seg === 'string' ? seg : seg.mark)).join('');
}

function InterviewScene() {
  const reduce = useReducedMotion() ?? false;
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const item = QUESTIONS[i];
  const role = SAMPLE_ROLES.find((r) => r.id === item.roleId)!;
  const face =
    'absolute inset-0 flex flex-col rounded-2xl border border-border bg-card p-6 text-left shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.55)] [backface-visibility:hidden]';

  return (
    <div className="grid h-full gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-9">
      <div className="mx-auto w-full max-w-md [perspective:1100px]">
        <motion.button
          type="button"
          aria-pressed={flipped}
          aria-label={flipped ? 'Show the question' : 'Show what this question was built from'}
          onClick={() => setFlipped((f) => !f)}
          className="focus-ring-visible relative block h-[14.5rem] w-full rounded-2xl [transform-style:preserve-3d]"
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 20 }}
        >
          <span className={face} aria-hidden={flipped}>
            <span className="flex items-center gap-2 text-[0.8125rem] font-semibold text-muted-foreground">
              <Monogram role={role} size={24} />
              {role.title}, {role.company}
            </span>
            <span className="mt-4 text-[1.1875rem] font-semibold leading-snug text-foreground">
              {item.q}
            </span>
            <span className="mt-auto text-[0.8125rem] text-muted-foreground">Tap to turn it over</span>
          </span>
          <span className={cn(face, '[transform:rotateY(180deg)]')} aria-hidden={!flipped}>
            <span className="text-[0.8125rem] font-semibold text-muted-foreground">Built from</span>
            <span className="mt-3 flex flex-wrap items-center gap-2 text-[0.875rem] text-ink-muted">
              The posting asks for <span className="pub-chip">{item.ask}</span>
            </span>
            <span className="mt-3 text-[0.9375rem] leading-relaxed text-foreground">
              Your resume says: {lineText(item.lineId)}
            </span>
          </span>
        </motion.button>
      </div>

      <div className="flex flex-col items-start gap-4">
        <button
          type="button"
          onClick={() => {
            setFlipped(false);
            setI((n) => (n + 1) % QUESTIONS.length);
          }}
          className="focus-ring-visible pub-mini-btn pub-mini-btn-solid"
        >
          Next question
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </button>
        <p className="text-[0.875rem] leading-relaxed text-ink-muted">
          Question {i + 1} of {QUESTIONS.length}. Each comes from a role you tailored for and a line
          you actually wrote.
        </p>
      </div>
    </div>
  );
}

/* ── 4. Skill gaps ────────────────────────────────────────────────────── */

function GapsScene() {
  const reduce = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  // Counted from the sample roles themselves, so the picture cannot drift
  // from the board in the tour.
  const gaps = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const role of SAMPLE_ROLES) {
      for (const ask of role.asks) {
        if (!ask.met) map.set(ask.label, [...(map.get(ask.label) ?? []), role.company]);
      }
    }
    return [...map.entries()]
      .map(([label, companies]) => ({ label, companies }))
      .sort((a, b) => b.companies.length - a.companies.length || a.label.localeCompare(b.label))
      .slice(0, 4);
  }, []);
  const max = gaps[0]?.companies.length ?? 1;
  const [open, setOpen] = useState(0);

  return (
    <div
      ref={ref}
      className="grid h-full gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-9"
    >
      <div className="flex flex-col gap-2">
        {gaps.map((gap, i) => {
          const isOpen = i === open;
          return (
            <motion.button
              key={gap.label}
              type="button"
              aria-pressed={isOpen}
              onClick={() => setOpen(i)}
              whileTap={reduce ? undefined : { scale: 0.985 }}
              className={cn(
                'focus-ring-visible rounded-xl border p-3 text-left transition-colors duration-200',
                isOpen ? 'border-primary/50 bg-card' : 'border-transparent hover:bg-card',
              )}
            >
              <span className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
                <span className={cn('font-semibold', isOpen ? 'text-foreground' : 'text-ink-muted')}>
                  {gap.label}
                </span>
                <span className="shrink-0 text-[0.8125rem] tabular-nums text-muted-foreground">
                  {gap.companies.length} of {SAMPLE_ROLES.length} roles
                </span>
              </span>
              <span className="mt-2 block h-2.5 overflow-hidden rounded-full bg-[hsl(var(--band-strong))]">
                <motion.span
                  className={cn(
                    'block h-full origin-left rounded-full transition-colors duration-200',
                    isOpen ? 'bg-primary' : 'bg-[hsl(var(--ink-subtle)/0.5)]',
                  )}
                  style={{ width: `${(gap.companies.length / max) * 100}%` }}
                  initial={false}
                  animate={{ scaleX: reduce || inView ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { ...SPRING, delay: 0.1 + i * 0.08 }}
                />
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[0.9375rem] leading-relaxed text-ink-muted" aria-live="polite">
        <span className="font-semibold text-foreground">{gaps[open]?.label}.</span> Asked for by{' '}
        {gaps[open]?.companies.join(' and ')}. Not in your resume, so it is where an evening is best
        spent.
      </p>
    </div>
  );
}

/* ── 5. Privacy mask ──────────────────────────────────────────────────── */

const CONTACT = [
  { label: 'Name', value: 'Your name' },
  { label: 'Email', value: 'you@example.com' },
  { label: 'Phone', value: '(555) 010-0199' },
] as const;

function PrivacyScene() {
  const reduce = useReducedMotion() ?? false;
  // Arrives showing the resume, then turns itself over once on screen, so the
  // reader sees the masking happen.
  const [sent, setSent] = useState(reduce);
  const ref = useOnceInView(() => setSent(true), !reduce);
  const face =
    'absolute inset-0 rounded-2xl border border-border bg-card p-6 shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.55)] [backface-visibility:hidden]';

  const rows = (masked: boolean) => (
    <dl className="flex flex-col gap-2.5">
      {CONTACT.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-[0.9375rem]">
          <dt className="w-14 shrink-0 text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 font-medium text-foreground">
            {masked ? (
              <>
                <span aria-hidden className="block h-4 w-36 rounded bg-foreground" />
                <span className="sr-only">masked</span>
              </>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <div
      ref={ref}
      className="grid h-full gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center lg:gap-9"
    >
      <div className="mx-auto w-full max-w-md [perspective:1100px]">
        <motion.div
          className="relative h-[15.5rem] [transform-style:preserve-3d]"
          initial={false}
          animate={{ rotateY: sent ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 150, damping: 20 }}
        >
          <div className={face} aria-hidden={sent} data-face="resume">
            <p className="text-[0.8125rem] font-semibold text-muted-foreground">Your resume</p>
            <div className="mt-3">{rows(false)}</div>
            <p className="mt-4 border-t border-border pt-3 text-[0.875rem] leading-relaxed text-foreground">
              {lineText('sql')}
            </p>
          </div>
          <div
            className={cn(face, '[transform:rotateY(180deg)]')}
            aria-hidden={!sent}
            data-face="sent"
          >
            <p className="text-[0.8125rem] font-semibold text-muted-foreground">
              Sent to the AI model
            </p>
            <div className="mt-3">{rows(true)}</div>
            <p className="mt-4 border-t border-border pt-3 text-[0.875rem] leading-relaxed text-foreground">
              {lineText('sql')}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col items-start gap-4">
        <label className="flex cursor-pointer items-center gap-3 text-[0.9375rem] font-semibold text-foreground">
          <button
            type="button"
            role="switch"
            aria-checked={sent}
            onClick={() => setSent((s) => !s)}
            className="focus-ring-visible pub-switch"
          />
          What the AI model is sent
        </label>
        <p className="text-[0.875rem] leading-relaxed text-ink-muted">
          Your work goes through. Your name, email and phone do not, and nothing is used for
          training.
        </p>
      </div>
    </div>
  );
}

/* ── The deck ─────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    id: 'guard',
    short: 'The guard',
    title: 'It will not stretch the truth.',
    line: 'Tailoring moves emphasis, never facts.',
    Scene: GuardScene,
  },
  {
    id: 'reposts',
    short: 'Reposts',
    title: 'One role, once.',
    line: "Reposts fold into the employer's own listing.",
    Scene: DedupeScene,
  },
  {
    id: 'interview',
    short: 'Interview',
    title: 'Practice on your own roles.',
    line: 'Questions built from what you applied to.',
    Scene: InterviewScene,
  },
  {
    id: 'gaps',
    short: 'Skill gaps',
    title: 'See what keeps coming up.',
    line: 'The skills your roles ask for and you do not show.',
    Scene: GapsScene,
  },
  {
    id: 'privacy',
    short: 'Privacy',
    title: 'Your contact details stay with you.',
    line: 'Masked before any text reaches an AI model.',
    Scene: PrivacyScene,
  },
] as const;

export function Features() {
  const reduce = useReducedMotion() ?? false;
  const uid = useId();
  const [active, setActive] = useState(0);
  const n = FEATURES.length;
  const controls = useDragControls();

  // The front card leans a few degrees toward the pointer.
  const tiltX = useSpring(0, { stiffness: 160, damping: 18 });
  const tiltY = useSpring(0, { stiffness: 160, damping: 18 });
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 7);
    tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 6);
  };
  const onLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  const go = (i: number) => setActive(((i % n) + n) % n);
  const tabId = (i: number) => `${uid}-feature-${i}`;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = i;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    go(next);
    document.getElementById(tabId(next))?.focus();
  };

  return (
    <Section id="features" labelledBy="features-heading" className="pub-band overflow-x-clip">
      <Container>
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-4">
            <h2 id="features-heading" className="pub-h2">
              Built for the parts other tools skip.
            </h2>

            <div
              role="tablist"
              aria-label="Features"
              aria-orientation="vertical"
              className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:mt-10 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0"
            >
              {FEATURES.map((f, i) => {
                const isSel = i === active;
                return (
                  <button
                    key={f.id}
                    id={tabId(i)}
                    type="button"
                    role="tab"
                    aria-selected={isSel}
                    aria-controls={`${uid}-card`}
                    tabIndex={isSel ? 0 : -1}
                    onClick={() => go(i)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={cn(
                      'focus-ring-visible relative shrink-0 rounded-xl px-4 py-2.5 text-left transition-colors duration-200 lg:py-3',
                      isSel
                        ? 'bg-card text-foreground shadow-soft'
                        : 'text-ink-muted hover:bg-card/60 hover:text-foreground',
                    )}
                  >
                    {isSel && (
                      <motion.span
                        layoutId={`${uid}-rail`}
                        aria-hidden
                        className="absolute inset-y-2.5 left-0 hidden w-[3px] rounded-full bg-primary lg:block"
                        transition={reduce ? { duration: 0 } : SPRING}
                      />
                    )}
                    <span className="block whitespace-nowrap text-[0.9375rem] font-semibold lg:hidden">
                      {f.short}
                    </span>
                    <span className="hidden text-[1.0625rem] font-semibold leading-snug lg:block">
                      {f.title}
                    </span>
                    {isSel && (
                      <span className="mt-1 hidden text-[0.875rem] leading-relaxed text-ink-muted lg:block">
                        {f.line}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8">
            {/* THE DECK. Five cards in depth; only the front one is live. */}
            <div
              className="relative h-[37rem] sm:h-[31rem] lg:h-[28.5rem] lg:pr-14 lg:pt-9 [perspective:1500px]"
              onPointerMove={onMove}
              onPointerLeave={onLeave}
            >
              <div className="relative h-full [transform-style:preserve-3d]">
                {FEATURES.map((f, i) => {
                  const depth = (i - active + n) % n;
                  const front = depth === 0;
                  const Scene = f.Scene;
                  return (
                    <motion.div
                      key={f.id}
                      id={front ? `${uid}-card` : undefined}
                      role={front ? 'tabpanel' : undefined}
                      aria-labelledby={front ? tabId(i) : undefined}
                      aria-hidden={front ? undefined : true}
                      data-feature-card={f.id}
                      className={cn(
                        'pub-stage absolute inset-0 flex flex-col overflow-hidden',
                        !front && 'pointer-events-none',
                      )}
                      style={{
                        zIndex: n - depth,
                        rotateX: front ? tiltX : 0,
                        rotateY: front ? tiltY : 0,
                      }}
                      initial={false}
                      animate={{
                        x: depth * 22,
                        y: depth * -13,
                        scale: 1 - depth * 0.045,
                        rotateZ: depth * 1.1,
                        opacity: depth > 2 ? 0 : 1 - depth * 0.22,
                      }}
                      transition={reduce ? { duration: 0 } : SPRING}
                      drag={front && !reduce ? 'x' : false}
                      dragControls={controls}
                      dragListener={false}
                      dragSnapToOrigin
                      dragElastic={0.6}
                      whileDrag={{ scale: 1.02 }}
                      onDragEnd={(_, info) => {
                        if (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 650) {
                          go(active + (info.offset.x < 0 ? 1 : -1));
                        }
                      }}
                    >
                      {/* The card's top edge is its handle: grab it to throw
                          the card aside. */}
                      <div
                        onPointerDown={(e) => front && !reduce && controls.start(e)}
                        className={cn(
                          'flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-7',
                          front && !reduce && 'cursor-grab touch-none active:cursor-grabbing',
                        )}
                      >
                        <p className="pub-h4 min-w-0 truncate">{f.title}</p>
                        <GripHorizontal
                          aria-hidden
                          className="h-4 w-4 shrink-0 text-muted-foreground"
                        />
                      </div>
                      <div className="min-h-0 flex-1 p-5 sm:p-7">{front && <Scene />}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              <SampleTag />
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[0.8125rem] tabular-nums text-muted-foreground" aria-hidden>
                  {active + 1} of {n}
                </span>
                <button
                  type="button"
                  aria-label="Previous feature"
                  onClick={() => go(active - 1)}
                  className="focus-ring-visible grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-transform active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next feature"
                  onClick={() => go(active + 1)}
                  className="focus-ring-visible grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-transform active:scale-95"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
